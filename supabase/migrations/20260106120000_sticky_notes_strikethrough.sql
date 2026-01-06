ALTER TABLE public.sticky_notes
ADD COLUMN IF NOT EXISTS is_struck boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_public_calendar_share_snapshot(
  p_slug TEXT,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_slug TEXT;
  share_row public.calendar_public_shares%ROWTYPE;
  cal_name TEXT;
  ip TEXT;
  v_ip_hash BYTEA;
  failed_count INT;
BEGIN
  safe_slug := public._normalize_public_share_slug(p_slug);
  IF safe_slug IS NULL OR safe_slug = '' THEN
    RAISE EXCEPTION 'not found';
  END IF;

  SELECT *
  INTO share_row
  FROM public.calendar_public_shares s
  WHERE s.slug = safe_slug
    AND s.revoked_at IS NULL
  LIMIT 1;

  IF share_row.id IS NULL THEN
    RAISE EXCEPTION 'not found';
  END IF;

  IF share_row.password_hash IS NOT NULL THEN
    ip := public._public_share_request_ip();
    IF ip IS NOT NULL THEN
      v_ip_hash := extensions.digest(ip || '|' || share_row.id::TEXT, 'sha256');
    ELSE
      v_ip_hash := NULL;
    END IF;

    SELECT count(*)::INT
    INTO failed_count
    FROM public.calendar_public_share_attempts a
    WHERE a.share_id = share_row.id
      AND (v_ip_hash IS NULL OR a.ip_hash = v_ip_hash)
      AND a.success = FALSE
      AND a.attempted_at > now() - interval '15 minutes';

    IF failed_count >= 10 THEN
      RAISE EXCEPTION 'too many attempts';
    END IF;

    IF p_password IS NULL OR extensions.crypt(p_password, share_row.password_hash) <> share_row.password_hash THEN
      INSERT INTO public.calendar_public_share_attempts (share_id, ip_hash, success)
      VALUES (share_row.id, v_ip_hash, FALSE);
      RAISE EXCEPTION 'invalid password';
    END IF;

    INSERT INTO public.calendar_public_share_attempts (share_id, ip_hash, success)
    VALUES (share_row.id, v_ip_hash, TRUE);
  END IF;

  SELECT c.name INTO cal_name
  FROM public.calendars c
  WHERE c.id = share_row.calendar_id
  LIMIT 1;

  RETURN jsonb_build_object(
    'calendar', jsonb_build_object('id', share_row.calendar_id, 'name', cal_name),
    'notes', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'calendar_id', n.calendar_id,
          'user_id', n.user_id,
          'date', n.date,
          'text', n.text,
          'color', n.color,
          'is_struck', n.is_struck,
          'pos_x', n.pos_x,
          'pos_y', n.pos_y
        )
        ORDER BY n.created_at ASC
      )
      FROM public.sticky_notes n
      WHERE n.calendar_id = share_row.calendar_id
    ), '[]'::jsonb),
    'connections', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'calendar_id', c.calendar_id,
          'user_id', c.user_id,
          'source_note_id', c.source_note_id,
          'target_note_id', c.target_note_id
        )
        ORDER BY c.created_at ASC
      )
      FROM public.note_connections c
      WHERE c.calendar_id = share_row.calendar_id
    ), '[]'::jsonb)
  );
END;
$$;

