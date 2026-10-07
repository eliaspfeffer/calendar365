-- Scoped, revocable MCP API keys. Only hashes are stored; no service key is needed by Vercel.
BEGIN;
-- Membership reads must not recurse into the same RLS-protected table. Joining
-- must go through create_calendar/accept_calendar_invite, never a self INSERT.
DROP POLICY IF EXISTS "Members can view members" ON public.calendar_members;
DROP POLICY IF EXISTS "Users can view their membership" ON public.calendar_members;
CREATE POLICY "Users can view their membership" ON public.calendar_members FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can join calendar (self)" ON public.calendar_members;
CREATE SCHEMA IF NOT EXISTS calendar_mcp_private;
REVOKE ALL ON SCHEMA calendar_mcp_private FROM PUBLIC, anon, authenticated;
CREATE TABLE calendar_mcp_private.tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '90 days'
);
ALTER TABLE calendar_mcp_private.tokens ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.create_mcp_key(p_name text DEFAULT 'Agent') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t text; row calendar_mcp_private.tokens;
BEGIN
  IF auth.uid() IS NULL OR auth.role() <> 'authenticated' THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE='42501'; END IF;
  -- Serialize issuance to enforce the per-user cap under concurrent requests.
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 365));
  IF (SELECT count(*) FROM calendar_mcp_private.tokens WHERE user_id=auth.uid() AND expires_at>now()) >= 10 THEN
    RAISE EXCEPTION 'Revoke an existing key first';
  END IF;
  t := 'c365_' || encode(extensions.gen_random_bytes(32), 'hex');
  INSERT INTO calendar_mcp_private.tokens(user_id,token_hash,name)
  VALUES(auth.uid(),extensions.digest(t,'sha256'),trim(p_name)) RETURNING * INTO row;
  RETURN jsonb_build_object('id',row.id,'name',row.name,'expires_at',row.expires_at,'token',t);
END; $$;
CREATE FUNCTION public.list_mcp_keys() RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'created_at',created_at,'expires_at',expires_at) ORDER BY created_at DESC),'[]'::jsonb)
 FROM calendar_mcp_private.tokens WHERE user_id=auth.uid();
$$;
CREATE FUNCTION public.revoke_mcp_key(p_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 DELETE FROM calendar_mcp_private.tokens WHERE id=p_id AND user_id=auth.uid();
 RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.create_mcp_key(text), public.list_mcp_keys(), public.revoke_mcp_key(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_mcp_key(text), public.list_mcp_keys(), public.revoke_mcp_key(uuid) TO authenticated;

-- This role cannot log in and has no BYPASSRLS. The finite dispatcher executes with
-- authenticated privileges and the key owner's claims, reusing existing RLS and RPCs.
CREATE ROLE calendar365_mcp NOLOGIN INHERIT NOBYPASSRLS;
GRANT authenticated TO calendar365_mcp;
GRANT calendar365_mcp TO postgres;
GRANT USAGE ON SCHEMA calendar_mcp_private TO calendar365_mcp;
CREATE FUNCTION calendar_mcp_private.principal(p_token text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE u uuid;
BEGIN
 IF p_token !~ '^c365_[a-f0-9]{64}$' OR p_token IS NULL THEN RAISE EXCEPTION 'Invalid MCP key' USING ERRCODE='28000'; END IF;
 SELECT user_id INTO u FROM calendar_mcp_private.tokens
 WHERE token_hash=extensions.digest(p_token,'sha256') AND expires_at>now();
 IF u IS NULL THEN RAISE EXCEPTION 'Invalid MCP key' USING ERRCODE='28000'; END IF;
 RETURN u;
END; $$;
REVOKE ALL ON FUNCTION calendar_mcp_private.principal(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION calendar_mcp_private.principal(text) TO calendar365_mcp;

CREATE FUNCTION public.mcp_execute(p_token text, p_operation text, p_args jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 u uuid; result jsonb; changes jsonb; calendar uuid; target uuid; replacement uuid; old_note public.sticky_notes;
 old_claims text := current_setting('request.jwt.claims',true);
 old_sub text := current_setting('request.jwt.claim.sub',true);
 old_role text := current_setting('request.jwt.claim.role',true);
BEGIN
 u := calendar_mcp_private.principal(p_token);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 IF p_args IS NULL OR jsonb_typeof(p_args) <> 'object' OR length(p_args::text)>100000 THEN RAISE EXCEPTION 'Invalid arguments'; END IF;
 changes := p_args->'changes'; calendar := (p_args->>'calendar_id')::uuid;
 IF p_operation IN ('delete_calendar','leave_calendar','delete_note','delete_connection','revoke_share_link') AND p_args->'confirm' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Deletion must be confirmed'; END IF;
 CASE p_operation
 WHEN 'authenticate' THEN result := jsonb_build_object('user_id',u);
 WHEN 'list_calendars' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object('role',m.role) ORDER BY c.name),'[]'::jsonb) INTO result
  FROM public.calendars c JOIN public.calendar_members m ON m.calendar_id=c.id WHERE m.user_id=u;
 WHEN 'create_calendar' THEN
  IF length(trim(p_args->>'name')) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Invalid name'; END IF;
  result := jsonb_build_object('id',public.create_calendar(p_args->>'name',coalesce(p_args->>'default_note_color','yellow')));
 WHEN 'update_calendar' THEN
  IF changes ? 'name' AND (changes->>'name' IS NULL OR length(trim(changes->>'name')) NOT BETWEEN 1 AND 200) THEN RAISE EXCEPTION 'Invalid name'; END IF;
  UPDATE public.calendars SET name=CASE WHEN changes ? 'name' THEN trim(changes->>'name') ELSE name END,
   default_note_color=CASE WHEN changes ? 'default_note_color' THEN changes->>'default_note_color' ELSE default_note_color END
  WHERE id=calendar AND owner_id=u RETURNING to_jsonb(calendars.*) INTO result;
 WHEN 'delete_calendar' THEN
  IF NOT EXISTS(SELECT 1 FROM public.calendars WHERE id=calendar AND owner_id=u) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
  IF (SELECT count(*) FROM public.calendar_members WHERE user_id=u)=1 THEN replacement:=public.create_calendar('clear new calendar','yellow'); END IF;
  DELETE FROM public.calendars WHERE id=calendar AND owner_id=u;
  result:=jsonb_build_object('deleted',calendar,'replacement_calendar_id',replacement);
 WHEN 'leave_calendar' THEN
  DELETE FROM public.calendar_members WHERE calendar_id=calendar AND user_id=u AND role<>'owner' RETURNING jsonb_build_object('left',calendar_id) INTO result;
 WHEN 'list_notes' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(n)),'[]'::jsonb) INTO result FROM (
   SELECT * FROM public.sticky_notes WHERE calendar_id=calendar
   AND (coalesce((p_args->>'undated')::boolean,false)=false OR date IS NULL)
   AND (p_args->>'from' IS NULL OR date >= p_args->>'from') AND (p_args->>'to' IS NULL OR date <= p_args->>'to')
   AND (p_args->>'search' IS NULL OR strpos(lower(text),lower(p_args->>'search'))>0)
   ORDER BY date NULLS LAST, sort_order NULLS LAST,created_at,id LIMIT least(greatest(coalesce((p_args->>'limit')::int,100),1),200) OFFSET greatest(coalesce((p_args->>'offset')::int,0),0)
  ) n;
 WHEN 'create_note' THEN
  IF p_args->>'text' IS NULL OR length(trim(p_args->>'text')) NOT BETWEEN 1 AND 20000 THEN RAISE EXCEPTION 'Invalid note text'; END IF;
  IF p_args->>'date' IS NOT NULL AND (p_args->>'date' !~ '^\d{4}-\d{2}-\d{2}$' OR ((p_args->>'date')::date)::text <> p_args->>'date') THEN RAISE EXCEPTION 'Invalid date'; END IF;
  INSERT INTO public.sticky_notes(user_id,calendar_id,date,text,color,pos_x,pos_y,sort_order)
  VALUES(u,calendar,p_args->>'date',trim(p_args->>'text'),coalesce(p_args->>'color',(SELECT default_note_color FROM public.calendars WHERE id=calendar)),
   (p_args->>'pos_x')::double precision,(p_args->>'pos_y')::double precision,
   CASE WHEN p_args->>'date' IS NULL THEN NULL ELSE coalesce((p_args->>'sort_order')::int,(SELECT coalesce(max(sort_order),-1)+1 FROM public.sticky_notes WHERE calendar_id=calendar AND date=p_args->>'date')) END)
  RETURNING to_jsonb(sticky_notes.*) INTO result;
 WHEN 'update_note' THEN
  SELECT * INTO old_note FROM public.sticky_notes WHERE id=(p_args->>'note_id')::uuid FOR UPDATE;
  IF old_note.id IS NULL THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
  IF changes ? 'text' AND (changes->>'text' IS NULL OR length(trim(changes->>'text')) NOT BETWEEN 1 AND 20000) THEN RAISE EXCEPTION 'Invalid text'; END IF;
  IF changes->>'date' IS NOT NULL AND (changes->>'date' !~ '^\d{4}-\d{2}-\d{2}$' OR ((changes->>'date')::date)::text <> changes->>'date') THEN RAISE EXCEPTION 'Invalid date'; END IF;
  target:=coalesce((changes->>'calendar_id')::uuid,old_note.calendar_id);
  IF target<>old_note.calendar_id THEN
   IF NOT EXISTS(SELECT 1 FROM public.calendar_members WHERE calendar_id=target AND user_id=u AND role IN ('owner','editor')) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
   DELETE FROM public.note_connections WHERE source_note_id=old_note.id OR target_note_id=old_note.id;
  END IF;
  UPDATE public.sticky_notes SET
   text=CASE WHEN changes ? 'text' THEN trim(changes->>'text') ELSE text END,
   color=CASE WHEN changes ? 'color' THEN changes->>'color' ELSE color END,
   date=CASE WHEN changes ? 'date' THEN changes->>'date' ELSE date END,
   is_struck=CASE WHEN changes ? 'is_struck' THEN (changes->>'is_struck')::boolean ELSE is_struck END,
   calendar_id=target,
   pos_x=CASE WHEN changes ? 'pos_x' THEN (changes->>'pos_x')::double precision WHEN changes ? 'date' THEN NULL ELSE pos_x END,
   pos_y=CASE WHEN changes ? 'pos_y' THEN (changes->>'pos_y')::double precision WHEN changes ? 'date' THEN NULL ELSE pos_y END,
   sort_order=CASE WHEN changes ? 'sort_order' THEN (changes->>'sort_order')::int WHEN changes ? 'date' THEN NULL ELSE sort_order END
  WHERE id=old_note.id RETURNING to_jsonb(sticky_notes.*) INTO result;
 WHEN 'delete_note' THEN DELETE FROM public.sticky_notes WHERE id=(p_args->>'note_id')::uuid RETURNING jsonb_build_object('deleted',id) INTO result;
 WHEN 'list_connections' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(n)),'[]'::jsonb) INTO result FROM public.note_connections n WHERE calendar_id=calendar;
 WHEN 'create_connection' THEN
  IF p_args->>'source_note_id'=p_args->>'target_note_id' OR
   (SELECT count(*) FROM public.sticky_notes WHERE calendar_id=calendar AND id IN ((p_args->>'source_note_id')::uuid,(p_args->>'target_note_id')::uuid))<>2 THEN RAISE EXCEPTION 'Notes must be different and in the same accessible calendar'; END IF;
  SELECT to_jsonb(n) INTO result FROM public.note_connections n WHERE calendar_id=calendar AND
   ((source_note_id=(p_args->>'source_note_id')::uuid AND target_note_id=(p_args->>'target_note_id')::uuid) OR (target_note_id=(p_args->>'source_note_id')::uuid AND source_note_id=(p_args->>'target_note_id')::uuid)) LIMIT 1;
  IF result IS NULL THEN
   INSERT INTO public.note_connections(user_id,calendar_id,source_note_id,target_note_id)
   VALUES(u,calendar,(p_args->>'source_note_id')::uuid,(p_args->>'target_note_id')::uuid) RETURNING to_jsonb(note_connections.*) INTO result;
  END IF;
 WHEN 'delete_connection' THEN DELETE FROM public.note_connections WHERE id=(p_args->>'connection_id')::uuid RETURNING jsonb_build_object('deleted',id) INTO result;
 WHEN 'get_settings' THEN SELECT coalesce((SELECT settings FROM public.user_settings WHERE user_id=u),'{}'::jsonb) INTO result;
 WHEN 'update_settings' THEN
  IF jsonb_typeof(changes)<>'object' THEN RAISE EXCEPTION 'Invalid settings'; END IF;
  INSERT INTO public.user_settings(user_id,settings) VALUES(u,changes)
  ON CONFLICT(user_id) DO UPDATE SET settings=public.user_settings.settings || EXCLUDED.settings RETURNING settings INTO result;
 WHEN 'create_invite' THEN
  IF p_args->>'role' NOT IN ('viewer','editor') OR (p_args->>'expires_in_days')::int NOT BETWEEN 1 AND 90 THEN RAISE EXCEPTION 'Invalid invitation'; END IF;
  result:=jsonb_build_object('token',public.create_calendar_invite(calendar,(p_args->>'role')::public.calendar_member_role,(p_args->>'expires_in_days')::int));
 WHEN 'accept_invite' THEN result:=jsonb_build_object('calendar_id',public.accept_calendar_invite(p_args->>'token'));
 WHEN 'list_share_links' THEN SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) INTO result FROM public.list_public_share_links(coalesce((p_args->>'include_revoked')::boolean,false)) s;
 WHEN 'create_share_link' THEN
  SELECT to_jsonb(s) INTO result FROM public.create_public_share_link(p_args->>'slug',(p_args->>'permission')::public.calendar_member_role,ARRAY(SELECT jsonb_array_elements_text(p_args->'calendar_ids')::uuid),p_args->>'password') s;
 WHEN 'update_share_link' THEN
  SELECT to_jsonb(s) INTO result FROM public.update_public_share_link((p_args->>'share_link_id')::uuid,changes->>'slug',(changes->>'permission')::public.calendar_member_role,CASE WHEN changes ? 'calendar_ids' THEN ARRAY(SELECT jsonb_array_elements_text(changes->'calendar_ids')::uuid) ELSE NULL END,changes->>'password',coalesce((changes->>'remove_password')::boolean,false)) s;
 WHEN 'revoke_share_link' THEN PERFORM public.revoke_public_share_link((p_args->>'share_link_id')::uuid); result:=jsonb_build_object('revoked',p_args->>'share_link_id');
 ELSE RAISE EXCEPTION 'Unknown operation';
 END CASE;
 IF result IS NULL THEN RAISE EXCEPTION 'Not allowed or not found' USING ERRCODE='42501'; END IF;
 -- Never leave impersonated claims behind for the rest of a transaction.
 PERFORM set_config('request.jwt.claims',coalesce(old_claims,''),true);
 PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
 PERFORM set_config('request.jwt.claim.role',coalesce(old_role,''),true);
 RETURN result;
END; $$;
GRANT CREATE ON SCHEMA public TO calendar365_mcp;
ALTER FUNCTION public.mcp_execute(text,text,jsonb) OWNER TO calendar365_mcp;
REVOKE CREATE ON SCHEMA public FROM calendar365_mcp;
REVOKE ALL ON FUNCTION public.mcp_execute(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mcp_execute(text,text,jsonb) TO anon,authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
