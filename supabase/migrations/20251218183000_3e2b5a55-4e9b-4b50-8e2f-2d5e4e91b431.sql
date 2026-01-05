-- Allow sticky notes without a date (Todo List notes)
ALTER TABLE public.sticky_notes
ALTER COLUMN date DROP NOT NULL;
