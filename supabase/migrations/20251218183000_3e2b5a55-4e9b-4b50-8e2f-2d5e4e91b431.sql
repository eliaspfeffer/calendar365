-- Allow sticky notes without a date (inbox notes)
ALTER TABLE public.sticky_notes
ALTER COLUMN date DROP NOT NULL;

