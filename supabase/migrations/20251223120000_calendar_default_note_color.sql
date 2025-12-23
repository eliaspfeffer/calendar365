-- Per-calendar default sticky note color (used when creating new notes)

ALTER TABLE public.calendars
ADD COLUMN IF NOT EXISTS default_note_color TEXT NOT NULL DEFAULT 'yellow';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'calendars_default_note_color_check'
  ) THEN
    ALTER TABLE public.calendars
    ADD CONSTRAINT calendars_default_note_color_check
    CHECK (default_note_color IN ('yellow', 'pink', 'green', 'blue', 'orange', 'purple'));
  END IF;
END $$;

-- Update RPC to allow setting a calendar's default note color at creation time.
CREATE OR REPLACE FUNCTION public.create_calendar(p_name TEXT, p_default_note_color TEXT DEFAULT 'yellow')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cal_id UUID;
  safe_name TEXT;
  safe_color TEXT;
BEGIN
  safe_name := NULLIF(BTRIM(p_name), '');
  IF safe_name IS NULL THEN
    safe_name := 'Neuer Kalender';
  END IF;

  safe_color := LOWER(NULLIF(BTRIM(p_default_note_color), ''));
  IF safe_color IS NULL OR safe_color NOT IN ('yellow', 'pink', 'green', 'blue', 'orange', 'purple') THEN
    safe_color := 'yellow';
  END IF;

  INSERT INTO public.calendars (owner_id, name, default_note_color)
  VALUES (auth.uid(), safe_name, safe_color)
  RETURNING id INTO cal_id;

  INSERT INTO public.calendar_members (calendar_id, user_id, role)
  VALUES (cal_id, auth.uid(), 'owner')
  ON CONFLICT (calendar_id, user_id) DO NOTHING;

  RETURN cal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_calendar(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_calendar(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_calendar(TEXT, TEXT) TO authenticated;

