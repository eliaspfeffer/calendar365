-- Calendar sharing (links + memberships) + RLS updates for co-editing

-- 1) Sharing links (token -> join)
CREATE TABLE IF NOT EXISTS public.calendar_share_links (
  token UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view their calendar share links" ON public.calendar_share_links;
CREATE POLICY "Owners can view their calendar share links"
ON public.calendar_share_links
FOR SELECT
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can create their calendar share links" ON public.calendar_share_links;
CREATE POLICY "Owners can create their calendar share links"
ON public.calendar_share_links
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete their calendar share links" ON public.calendar_share_links;
CREATE POLICY "Owners can delete their calendar share links"
ON public.calendar_share_links
FOR DELETE
USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_calendar_share_links_owner_id ON public.calendar_share_links(owner_id);

-- 2) Memberships (who can view/edit an owner's calendar)
CREATE TABLE IF NOT EXISTS public.calendar_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
  label TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_id, member_id)
);

ALTER TABLE public.calendar_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view members of their calendar" ON public.calendar_members;
CREATE POLICY "Owners can view members of their calendar"
ON public.calendar_members
FOR SELECT
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Members can view calendars shared with them" ON public.calendar_members;
CREATE POLICY "Members can view calendars shared with them"
ON public.calendar_members
FOR SELECT
USING (auth.uid() = member_id);

DROP POLICY IF EXISTS "Owners can update member roles and labels" ON public.calendar_members;
CREATE POLICY "Owners can update member roles and labels"
ON public.calendar_members
FOR UPDATE
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can remove members" ON public.calendar_members;
CREATE POLICY "Owners can remove members"
ON public.calendar_members
FOR DELETE
USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_calendar_members_member_id ON public.calendar_members(member_id);
CREATE INDEX IF NOT EXISTS idx_calendar_members_owner_id ON public.calendar_members(owner_id);

-- Keep updated_at fresh (function already exists from sticky_notes migration)
DROP TRIGGER IF EXISTS update_calendar_members_updated_at ON public.calendar_members;
CREATE TRIGGER update_calendar_members_updated_at
BEFORE UPDATE ON public.calendar_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Accepting an invite securely (no need to expose share_links by token)
CREATE OR REPLACE FUNCTION public.accept_calendar_share(p_token UUID)
RETURNS TABLE(owner_id UUID, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT csl.owner_id, csl.role
    INTO v_owner_id, v_role
  FROM public.calendar_share_links csl
  WHERE csl.token = p_token
    AND (csl.expires_at IS NULL OR csl.expires_at > now());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid or expired token';
  END IF;

  INSERT INTO public.calendar_members(owner_id, member_id, role)
  VALUES (v_owner_id, auth.uid(), v_role)
  ON CONFLICT (owner_id, member_id)
  DO UPDATE SET role = EXCLUDED.role;

  RETURN QUERY SELECT v_owner_id, v_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_calendar_share(UUID) TO authenticated;

-- 4) Update sticky_notes RLS for shared access (viewer/editor)
DROP POLICY IF EXISTS "Users can view their own notes" ON public.sticky_notes;
DROP POLICY IF EXISTS "Users can create their own notes" ON public.sticky_notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.sticky_notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.sticky_notes;

CREATE POLICY "Users can view owned or shared notes"
ON public.sticky_notes
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.owner_id = sticky_notes.user_id
      AND m.member_id = auth.uid()
  )
);

CREATE POLICY "Users can create notes on owned or shared calendars"
ON public.sticky_notes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.owner_id = sticky_notes.user_id
      AND m.member_id = auth.uid()
      AND m.role = 'editor'
  )
);

CREATE POLICY "Users can update notes on owned or shared calendars (editors)"
ON public.sticky_notes
FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.owner_id = sticky_notes.user_id
      AND m.member_id = auth.uid()
      AND m.role = 'editor'
  )
);

CREATE POLICY "Users can delete notes on owned or shared calendars (editors)"
ON public.sticky_notes
FOR DELETE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.owner_id = sticky_notes.user_id
      AND m.member_id = auth.uid()
      AND m.role = 'editor'
  )
);

-- 5) Update note_connections RLS for shared access
DROP POLICY IF EXISTS "Users can view their own connections" ON public.note_connections;
DROP POLICY IF EXISTS "Users can create their own connections" ON public.note_connections;
DROP POLICY IF EXISTS "Users can delete their own connections" ON public.note_connections;

CREATE POLICY "Users can view owned or shared connections"
ON public.note_connections
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.owner_id = note_connections.user_id
      AND m.member_id = auth.uid()
  )
);

CREATE POLICY "Users can create connections on owned or shared calendars (editors)"
ON public.note_connections
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.owner_id = note_connections.user_id
      AND m.member_id = auth.uid()
      AND m.role = 'editor'
  )
);

CREATE POLICY "Users can delete connections on owned or shared calendars (editors)"
ON public.note_connections
FOR DELETE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.owner_id = note_connections.user_id
      AND m.member_id = auth.uid()
      AND m.role = 'editor'
  )
);
