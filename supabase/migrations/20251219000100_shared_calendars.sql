-- Shared calendars (members + invite links)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_member_role') THEN
    CREATE TYPE public.calendar_member_role AS ENUM ('owner', 'editor', 'viewer');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My calendar',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calendar_members (
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.calendar_member_role NOT NULL DEFAULT 'editor',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (calendar_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_members_user_id ON public.calendar_members(user_id);

CREATE TABLE IF NOT EXISTS public.calendar_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  role public.calendar_member_role NOT NULL DEFAULT 'editor',
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_invites_calendar_id ON public.calendar_invites(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_invites_expires_at ON public.calendar_invites(expires_at);

-- updated_at trigger on calendars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_calendars_updated_at'
  ) THEN
    CREATE TRIGGER update_calendars_updated_at
    BEFORE UPDATE ON public.calendars
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_invites ENABLE ROW LEVEL SECURITY;

-- Calendars: visible to members; mutable by owner
DROP POLICY IF EXISTS "Members can view calendars" ON public.calendars;
CREATE POLICY "Members can view calendars"
ON public.calendars
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.calendar_id = calendars.id
      AND m.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create their own calendars" ON public.calendars;
CREATE POLICY "Users can create their own calendars"
ON public.calendars
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update calendars" ON public.calendars;
CREATE POLICY "Owners can update calendars"
ON public.calendars
FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete calendars" ON public.calendars;
CREATE POLICY "Owners can delete calendars"
ON public.calendars
FOR DELETE
USING (auth.uid() = owner_id);

-- Calendar members: members can see members; users can leave (except owner)
DROP POLICY IF EXISTS "Members can view members" ON public.calendar_members;
CREATE POLICY "Members can view members"
ON public.calendar_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.calendar_members self
    WHERE self.calendar_id = calendar_members.calendar_id
      AND self.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can leave calendar" ON public.calendar_members;
CREATE POLICY "Users can leave calendar"
ON public.calendar_members
FOR DELETE
USING (
  auth.uid() = user_id
  AND role <> 'owner'
);

-- Invites are only used via RPC (no direct access)

-- Ensure each user has at least one calendar + membership (existing users)
INSERT INTO public.calendars (owner_id, name)
SELECT u.id, 'My calendar'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.calendars c WHERE c.owner_id = u.id
);

INSERT INTO public.calendar_members (calendar_id, user_id, role)
SELECT c.id, c.owner_id, 'owner'
FROM public.calendars c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.calendar_members m
  WHERE m.calendar_id = c.id
    AND m.user_id = c.owner_id
);

-- Sticky notes + connections belong to a calendar
ALTER TABLE public.sticky_notes
ADD COLUMN IF NOT EXISTS calendar_id UUID NULL;

ALTER TABLE public.note_connections
ADD COLUMN IF NOT EXISTS calendar_id UUID NULL;

-- Backfill calendar_id based on note owner
UPDATE public.sticky_notes n
SET calendar_id = c.id
FROM public.calendars c
WHERE c.owner_id = n.user_id
  AND n.calendar_id IS NULL;

-- Backfill connections based on referenced notes (prefer source, fallback target)
UPDATE public.note_connections nc
SET calendar_id = sn.calendar_id
FROM public.sticky_notes sn
WHERE sn.id = nc.source_note_id
  AND nc.calendar_id IS NULL;

UPDATE public.note_connections nc
SET calendar_id = tn.calendar_id
FROM public.sticky_notes tn
WHERE tn.id = nc.target_note_id
  AND nc.calendar_id IS NULL;

-- Enforce FK + NOT NULL
ALTER TABLE public.sticky_notes
ALTER COLUMN calendar_id SET NOT NULL;

ALTER TABLE public.sticky_notes
DROP CONSTRAINT IF EXISTS sticky_notes_calendar_id_fkey;
ALTER TABLE public.sticky_notes
ADD CONSTRAINT sticky_notes_calendar_id_fkey
FOREIGN KEY (calendar_id) REFERENCES public.calendars(id) ON DELETE CASCADE;

ALTER TABLE public.note_connections
ALTER COLUMN calendar_id SET NOT NULL;

ALTER TABLE public.note_connections
DROP CONSTRAINT IF EXISTS note_connections_calendar_id_fkey;
ALTER TABLE public.note_connections
ADD CONSTRAINT note_connections_calendar_id_fkey
FOREIGN KEY (calendar_id) REFERENCES public.calendars(id) ON DELETE CASCADE;

-- Helpful indexes
DROP INDEX IF EXISTS idx_sticky_notes_user_date;
CREATE INDEX IF NOT EXISTS idx_sticky_notes_calendar_date ON public.sticky_notes(calendar_id, date);
CREATE INDEX IF NOT EXISTS idx_note_connections_calendar_id ON public.note_connections(calendar_id);

-- Rework RLS for shared calendars
DROP POLICY IF EXISTS "Users can view their own notes" ON public.sticky_notes;
DROP POLICY IF EXISTS "Users can create their own notes" ON public.sticky_notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.sticky_notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.sticky_notes;

CREATE POLICY "Members can view notes"
ON public.sticky_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.calendar_id = sticky_notes.calendar_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Editors can create notes"
ON public.sticky_notes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.calendar_id = sticky_notes.calendar_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'editor')
  )
);

CREATE POLICY "Editors can update notes"
ON public.sticky_notes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.calendar_id = sticky_notes.calendar_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'editor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.calendar_id = sticky_notes.calendar_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'editor')
  )
);

CREATE POLICY "Editors can delete notes"
ON public.sticky_notes
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.calendar_id = sticky_notes.calendar_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'editor')
  )
);

-- note_connections RLS (calendar-based)
DROP POLICY IF EXISTS "Users can view their own connections" ON public.note_connections;
DROP POLICY IF EXISTS "Users can create their own connections" ON public.note_connections;
DROP POLICY IF EXISTS "Users can delete their own connections" ON public.note_connections;

CREATE POLICY "Members can view connections"
ON public.note_connections
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.calendar_id = note_connections.calendar_id
      AND m.user_id = auth.uid()
  )
);

CREATE POLICY "Editors can create connections"
ON public.note_connections
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.calendar_id = note_connections.calendar_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'editor')
  )
);

CREATE POLICY "Editors can delete connections"
ON public.note_connections
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.calendar_id = note_connections.calendar_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'editor')
  )
);

-- RPC: ensure a default calendar exists for the current user
CREATE OR REPLACE FUNCTION public.ensure_default_calendar()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cal_id UUID;
BEGIN
  SELECT id INTO cal_id
  FROM public.calendars
  WHERE owner_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1;

  IF cal_id IS NULL THEN
    INSERT INTO public.calendars (owner_id, name)
    VALUES (auth.uid(), 'My calendar')
    RETURNING id INTO cal_id;
  END IF;

  INSERT INTO public.calendar_members (calendar_id, user_id, role)
  VALUES (cal_id, auth.uid(), 'owner')
  ON CONFLICT (calendar_id, user_id) DO NOTHING;

  RETURN cal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_default_calendar() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_default_calendar() TO authenticated;

-- RPC: create a new calendar owned by the current user
CREATE OR REPLACE FUNCTION public.create_calendar(p_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cal_id UUID;
  safe_name TEXT;
BEGIN
  safe_name := NULLIF(BTRIM(p_name), '');
  IF safe_name IS NULL THEN
    safe_name := 'New calendar';
  END IF;

  INSERT INTO public.calendars (owner_id, name)
  VALUES (auth.uid(), safe_name)
  RETURNING id INTO cal_id;

  INSERT INTO public.calendar_members (calendar_id, user_id, role)
  VALUES (cal_id, auth.uid(), 'owner')
  ON CONFLICT (calendar_id, user_id) DO NOTHING;

  RETURN cal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_calendar(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_calendar(TEXT) TO authenticated;

-- RPC: create an invite link token for a calendar
CREATE OR REPLACE FUNCTION public.create_calendar_invite(
  p_calendar_id UUID,
  p_role public.calendar_member_role DEFAULT 'editor',
  p_expires_in_days INT DEFAULT 14
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tok TEXT;
  expires TIMESTAMP WITH TIME ZONE;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.calendar_id = p_calendar_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'editor')
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  tok := gen_random_uuid()::TEXT;

  IF p_expires_in_days IS NULL OR p_expires_in_days <= 0 THEN
    expires := NULL;
  ELSE
    expires := now() + make_interval(days => p_expires_in_days);
  END IF;

  INSERT INTO public.calendar_invites (calendar_id, created_by, token, role, expires_at)
  VALUES (p_calendar_id, auth.uid(), tok, p_role, expires);

  RETURN tok;
END;
$$;

REVOKE ALL ON FUNCTION public.create_calendar_invite(UUID, public.calendar_member_role, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_calendar_invite(UUID, public.calendar_member_role, INT) TO authenticated;

-- RPC: accept an invite token and join the calendar
CREATE OR REPLACE FUNCTION public.accept_calendar_invite(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cal_id UUID;
  inv_role public.calendar_member_role;
BEGIN
  SELECT calendar_id, role
  INTO cal_id, inv_role
  FROM public.calendar_invites
  WHERE token = p_token
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF cal_id IS NULL THEN
    RAISE EXCEPTION 'invite not found or expired';
  END IF;

  INSERT INTO public.calendar_members (calendar_id, user_id, role)
  VALUES (cal_id, auth.uid(), inv_role)
  ON CONFLICT (calendar_id, user_id) DO NOTHING;

  RETURN cal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_calendar_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_calendar_invite(TEXT) TO authenticated;

-- Auto-create a calendar for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_calendar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cal_id UUID;
BEGIN
  INSERT INTO public.calendars (owner_id, name)
  VALUES (NEW.id, 'My calendar')
  RETURNING id INTO cal_id;

  INSERT INTO public.calendar_members (calendar_id, user_id, role)
  VALUES (cal_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_calendar ON auth.users;
CREATE TRIGGER on_auth_user_created_calendar
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_calendar();

REVOKE ALL ON FUNCTION public.handle_new_user_calendar() FROM PUBLIC;
