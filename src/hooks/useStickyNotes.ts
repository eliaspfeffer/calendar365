import { useState, useCallback, useEffect } from 'react';
import { StickyNote, StickyColor, NoteConnection } from '@/types/calendar';
import { supabase } from '@/integrations/supabase/client';
import { exampleNotes } from '@/data/exampleCalendar';

interface NotePosition {
  x: number;
  y: number;
}

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

  const insertStickyNote = useCallback(
    async (
      date: string | null,
      text: string,
      color: StickyColor,
      position?: NotePosition | null
    ) => {
      return supabase
        .from('sticky_notes')
        .insert({
          user_id: userId,
          date,
          text,
          color,
          ...(position ? { pos_x: position.x, pos_y: position.y } : {}),
        })
        .select()
        .single();
    },
    [userId]
  );

  // Fetch notes from Supabase
  useEffect(() => {
    if (!userId) {
      setNotes(exampleNotes);
      setIsLoading(false);
      return;
    }

    const fetchNotes = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('sticky_notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

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
          pos_x: note.pos_x ?? null,
          pos_y: note.pos_y ?? null,
        }));
        setNotes(mappedNotes);
      }
      setIsLoading(false);
    };

    fetchNotes();
  }, [userId]);

  const addNote = useCallback(async (
    date: string | null,
    text: string,
    color: StickyColor,
    position?: NotePosition | null
  ) => {
    if (!userId) return null;

    const { data, error } = await insertStickyNote(date, text, color, position);

    // Back-compat: if the DB hasn't been migrated yet (pos_x/pos_y missing),
    // retry without the position fields.
    if (error && position && error.code === '42703') {
      const retry = await insertStickyNote(date, text, color, null);
      if (retry.error) {
        console.error('Error adding note:', retry.error);
        return null;
      }
      const newNote: StickyNote = {
        id: retry.data.id,
        user_id: retry.data.user_id,
        date: retry.data.date,
        text: retry.data.text,
        color: retry.data.color as StickyColor,
        pos_x: retry.data.pos_x ?? null,
        pos_y: retry.data.pos_y ?? null,
      };
      setNotes((prev) => [...prev, newNote]);
      return newNote;
    }

    // Back-compat: if the DB hasn't been migrated yet and `date` is NOT NULL,
    // retry undated notes as empty string.
    if (error && date === null && error.code === '23502') {
      const retry = await insertStickyNote('', text, color, position);
      if (retry.error) {
        console.error('Error adding note:', retry.error);
        return null;
      }
      const newNote: StickyNote = {
        id: retry.data.id,
        user_id: retry.data.user_id,
        date: retry.data.date,
        text: retry.data.text,
        color: retry.data.color as StickyColor,
        pos_x: retry.data.pos_x ?? null,
        pos_y: retry.data.pos_y ?? null,
      };
      setNotes((prev) => [...prev, newNote]);
      return newNote;
    }

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
      pos_x: data.pos_x ?? null,
      pos_y: data.pos_y ?? null,
    };

    setNotes((prev) => [...prev, newNote]);
    return newNote;
  }, [userId, insertStickyNote]);

  const updateNote = useCallback(async (id: string, text: string, color: StickyColor) => {
    if (!userId) return false;
    const { error } = await supabase
      .from('sticky_notes')
      .update({ text, color })
      .eq('id', id);

    if (error) {
      console.error('Error updating note:', error);
      return false;
    }

    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, text, color } : note
      )
    );
    return true;
  }, [userId]);

  const moveNote = useCallback(async (id: string, newDate: string | null, connections: NoteConnection[]) => {
    if (!userId) return false;
    const noteToMove = notes.find((n) => n.id === id);
    if (!noteToMove) return false;

    if (noteToMove.date === newDate) return;

    // Get all connected note IDs
    const connectedNoteIds: string[] = [];
    connections.forEach((conn) => {
      if (conn.source_note_id === id) {
        connectedNoteIds.push(conn.target_note_id);
      } else if (conn.target_note_id === id) {
        connectedNoteIds.push(conn.source_note_id);
      }
    });

    const canComputeDiff = Boolean(noteToMove.date) && Boolean(newDate);
    const daysDiff = canComputeDiff
      ? getDaysDifference(noteToMove.date as string, newDate as string)
      : 0;

    // Move the main note
    const { error: mainError } = await supabase
      .from('sticky_notes')
      .update({ date: newDate, pos_x: null, pos_y: null })
      .eq('id', id);

    // Back-compat: if the DB hasn't been migrated yet and `date` is NOT NULL,
    // retry clearing the date as empty string.
    if (mainError && newDate === null && mainError.code === '23502') {
      const { error: retryError } = await supabase
        .from('sticky_notes')
        .update({ date: '', pos_x: null, pos_y: null })
        .eq('id', id);
      if (retryError) {
        console.error('Error moving note:', retryError);
        return false;
      }
      setNotes((prev) =>
        prev.map((note) =>
          note.id === id ? { ...note, date: '', pos_x: null, pos_y: null } : note
        )
      );
      return true;
    }

    if (mainError) {
      console.error('Error moving note:', mainError);
      return false;
    }

    // Move connected notes (only when both old & new dates are set)
    if (canComputeDiff && daysDiff !== 0) {
      for (const connectedId of connectedNoteIds) {
        const connectedNote = notes.find((n) => n.id === connectedId);
        if (connectedNote?.date) {
          const newConnectedDate = addDaysToDate(connectedNote.date, daysDiff);
          await supabase
            .from('sticky_notes')
            .update({ date: newConnectedDate })
            .eq('id', connectedId);
        }
      }
    }

    // Update local state
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id === id) {
          return { ...note, date: newDate, pos_x: null, pos_y: null };
        }
        if (canComputeDiff && daysDiff !== 0 && connectedNoteIds.includes(note.id) && note.date) {
          return { ...note, date: addDaysToDate(note.date, daysDiff) };
        }
        return note;
      })
    );
    return true;
  }, [notes, userId]);

  const moveNoteToCanvas = useCallback(async (id: string, position: NotePosition) => {
    if (!userId) return false;
    const noteToMove = notes.find((n) => n.id === id);
    if (!noteToMove) return false;

    const { error } = await supabase
      .from('sticky_notes')
      .update({ date: null, pos_x: position.x, pos_y: position.y })
      .eq('id', id);

    // Back-compat: if the DB hasn't been migrated yet (pos_x/pos_y missing),
    // degrade to an inbox note without positioning.
    if (error && error.code === '42703') {
      const { error: retryError } = await supabase
        .from('sticky_notes')
        .update({ date: null })
        .eq('id', id);
      if (retryError) {
        console.error('Error moving note:', retryError);
        return false;
      }
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, date: null, pos_x: null, pos_y: null } : n))
      );
      return true;
    }

    // Back-compat: if the DB hasn't been migrated yet and `date` is NOT NULL,
    // retry clearing the date as empty string.
    if (error && error.code === '23502') {
      const { error: retryError } = await supabase
        .from('sticky_notes')
        .update({ date: '', pos_x: position.x, pos_y: position.y })
        .eq('id', id);
      if (retryError) {
        console.error('Error moving note:', retryError);
        return false;
      }
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, date: '', pos_x: position.x, pos_y: position.y }
            : n
        )
      );
      return true;
    }

    if (error) {
      console.error('Error moving note:', error);
      return false;
    }

    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, date: null, pos_x: position.x, pos_y: position.y } : n
      )
    );
    return true;
  }, [notes, userId]);

  const setNoteCanvasPosition = useCallback(async (id: string, position: NotePosition) => {
    if (!userId) return false;
    const noteToMove = notes.find((n) => n.id === id);
    if (!noteToMove) return false;

    const { error } = await supabase
      .from('sticky_notes')
      .update({ pos_x: position.x, pos_y: position.y })
      .eq('id', id);

    if (error) {
      console.error('Error updating note position:', error);
      return false;
    }

    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, pos_x: position.x, pos_y: position.y } : n
      )
    );
    return true;
  }, [notes, userId]);

  const deleteNote = useCallback(async (id: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from('sticky_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting note:', error);
      return;
    }

    setNotes((prev) => prev.filter((note) => note.id !== id));
  }, [userId]);

  const getNotesByDate = useCallback(
    (date: string) => notes.filter((note) => note.date === date),
    [notes]
  );

  return {
    notes,
    isLoading,
    addNote,
    updateNote,
    moveNote,
    moveNoteToCanvas,
    setNoteCanvasPosition,
    deleteNote,
    getNotesByDate,
  };
}
