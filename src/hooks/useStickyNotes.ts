import { useState, useCallback, useEffect } from 'react';
import { StickyNote, StickyColor } from '@/types/calendar';
import { supabase } from '@/integrations/supabase/client';

export function useStickyNotes(userId: string | undefined) {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch notes from Supabase
  useEffect(() => {
    if (!userId) {
      setNotes([]);
      setIsLoading(false);
      return;
    }

    const fetchNotes = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('sticky_notes')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching notes:', error);
      } else {
        // Map data to our StickyNote type
        const mappedNotes: StickyNote[] = (data || []).map((note) => ({
          id: note.id,
          user_id: note.user_id,
          date: note.date,
          text: note.text,
          color: note.color as StickyColor,
        }));
        setNotes(mappedNotes);
      }
      setIsLoading(false);
    };

    fetchNotes();
  }, [userId]);

  const addNote = useCallback(async (date: string, text: string, color: StickyColor) => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('sticky_notes')
      .insert({
        user_id: userId,
        date,
        text,
        color,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding note:', error);
      return null;
    }

    const newNote: StickyNote = {
      id: data.id,
      user_id: data.user_id,
      date: data.date,
      text: data.text,
      color: data.color as StickyColor,
    };

    setNotes((prev) => [...prev, newNote]);
    return newNote;
  }, [userId]);

  const updateNote = useCallback(async (id: string, text: string, color: StickyColor) => {
    const { error } = await supabase
      .from('sticky_notes')
      .update({ text, color })
      .eq('id', id);

    if (error) {
      console.error('Error updating note:', error);
      return;
    }

    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, text, color } : note
      )
    );
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('sticky_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting note:', error);
      return;
    }

    setNotes((prev) => prev.filter((note) => note.id !== id));
  }, []);

  const getNotesByDate = useCallback(
    (date: string) => notes.filter((note) => note.date === date),
    [notes]
  );

  return { notes, isLoading, addNote, updateNote, deleteNote, getNotesByDate };
}
