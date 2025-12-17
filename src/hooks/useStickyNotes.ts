import { useState, useCallback, useEffect } from 'react';
import { StickyNote, StickyColor, NoteConnection } from '@/types/calendar';
import { supabase } from '@/integrations/supabase/client';

// Helper to calculate day difference between two dates
function getDaysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// Helper to add days to a date string
function addDaysToDate(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export function useStickyNotes(userId: string | null) {
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

  const moveNote = useCallback(async (id: string, newDate: string, connections: NoteConnection[]) => {
    const noteToMove = notes.find((n) => n.id === id);
    if (!noteToMove) return;

    const daysDiff = getDaysDifference(noteToMove.date, newDate);
    if (daysDiff === 0) return;

    // Get all connected note IDs
    const connectedNoteIds: string[] = [];
    connections.forEach((conn) => {
      if (conn.source_note_id === id) {
        connectedNoteIds.push(conn.target_note_id);
      } else if (conn.target_note_id === id) {
        connectedNoteIds.push(conn.source_note_id);
      }
    });

    // Move the main note
    const { error: mainError } = await supabase
      .from('sticky_notes')
      .update({ date: newDate })
      .eq('id', id);

    if (mainError) {
      console.error('Error moving note:', mainError);
      return;
    }

    // Move connected notes
    for (const connectedId of connectedNoteIds) {
      const connectedNote = notes.find((n) => n.id === connectedId);
      if (connectedNote) {
        const newConnectedDate = addDaysToDate(connectedNote.date, daysDiff);
        await supabase
          .from('sticky_notes')
          .update({ date: newConnectedDate })
          .eq('id', connectedId);
      }
    }

    // Update local state
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id === id) {
          return { ...note, date: newDate };
        }
        if (connectedNoteIds.includes(note.id)) {
          return { ...note, date: addDaysToDate(note.date, daysDiff) };
        }
        return note;
      })
    );
  }, [notes]);

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

  return { notes, isLoading, addNote, updateNote, moveNote, deleteNote, getNotesByDate };
}
