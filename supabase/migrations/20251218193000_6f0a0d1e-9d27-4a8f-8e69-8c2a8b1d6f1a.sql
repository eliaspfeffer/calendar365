-- Support "floating" undated notes positioned on the canvas.
ALTER TABLE public.sticky_notes
ADD COLUMN IF NOT EXISTS pos_x DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS pos_y DOUBLE PRECISION;

-- Keep inbox (undated, unpositioned) queries fast.
CREATE INDEX IF NOT EXISTS idx_sticky_notes_user_date_pos
ON public.sticky_notes(user_id, date, pos_x, pos_y);

