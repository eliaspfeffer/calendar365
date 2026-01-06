-- Add explicit per-day ordering for notes
ALTER TABLE public.sticky_notes
ADD COLUMN IF NOT EXISTS sort_order DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_sticky_notes_user_date_sort
ON public.sticky_notes(user_id, date, sort_order);

