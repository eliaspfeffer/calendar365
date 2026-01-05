-- Make the free-note limit configurable without changing policies.
-- Default stays at 25. Update via:
--   UPDATE public.app_config SET free_notes_limit = 50 WHERE id = 1;

CREATE TABLE IF NOT EXISTS public.app_config (
  id INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
  free_notes_limit INTEGER NOT NULL DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT app_config_singleton CHECK (id = 1),
  CONSTRAINT app_config_free_notes_limit_positive CHECK (free_notes_limit >= 1)
);

INSERT INTO public.app_config (id, free_notes_limit)
VALUES (1, 25)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_app_config_updated_at'
  ) THEN
    CREATE TRIGGER update_app_config_updated_at
    BEFORE UPDATE ON public.app_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Keep it locked down: only service_role can write; no direct client access required.
DROP POLICY IF EXISTS "Service role can manage app config" ON public.app_config;
CREATE POLICY "Service role can manage app config"
ON public.app_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.free_notes_limit()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT free_notes_limit
  FROM public.app_config
  WHERE id = 1;
$$;

REVOKE ALL ON FUNCTION public.free_notes_limit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.free_notes_limit() TO authenticated;

-- Recreate the insert policy to use the configurable limit.
DROP POLICY IF EXISTS "Editors can create notes" ON public.sticky_notes;
CREATE POLICY "Editors can create notes"
ON public.sticky_notes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.current_user_has_lifetime_access()
    OR public.current_user_note_count() < public.free_notes_limit()
  )
  AND EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.calendar_id = sticky_notes.calendar_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'editor')
  )
);

