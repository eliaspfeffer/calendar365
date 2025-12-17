-- Create table for note connections
CREATE TABLE public.note_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_note_id UUID NOT NULL REFERENCES public.sticky_notes(id) ON DELETE CASCADE,
  target_note_id UUID NOT NULL REFERENCES public.sticky_notes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_note_id, target_note_id)
);

-- Enable Row Level Security
ALTER TABLE public.note_connections ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own connections" 
ON public.note_connections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own connections" 
ON public.note_connections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connections" 
ON public.note_connections 
FOR DELETE 
USING (auth.uid() = user_id);