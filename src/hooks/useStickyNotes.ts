import { useState, useCallback, useEffect } from "react";
import { StickyNote, StickyColor, NoteConnection } from "@/types/calendar";
import { supabase } from "@/integrations/supabase/client";

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

function mapRowToStickyNote(row: {
  id: string;
  user_id: string;
  date: string | null;
  text: string;
  color: string;
}): StickyNote {
  return {
    id: row.id,
    user_id: row.user_id,
    date: row.date,
    text: row.text,
    color: row.color as StickyColor,
  };
}

export function useStickyNotes({
  authUserId,
  calendarOwnerId,
}: {
  authUserId: string | null;
  calendarOwnerId: string | null;
}) {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const insertStickyNote = useCallback(
    async (date: string | null, text: string, color: StickyColor) => {
      return supabase
        .from('sticky_notes')
        .insert({
          user_id: calendarOwnerId,
          date,
          text,
          color,
        })
        .select()
        .single();
    },
    [calendarOwnerId]
  );

  // Fetch notes from Supabase
  useEffect(() => {
    if (!authUserId || !calendarOwnerId) {
      setNotes([]);
      setIsLoading(false);
      return;
    }

    const fetchNotes = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('sticky_notes')
        .select('*')
        .eq('user_id', calendarOwnerId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching notes:', error);
      } else {
        setNotes((data || []).map(mapRowToStickyNote));
      }
      setIsLoading(false);
    };

    fetchNotes();
  }, [authUserId, calendarOwnerId]);

  // Realtime updates for co-editing
  useEffect(() => {
    if (!authUserId || !calendarOwnerId) return;

    const channel = supabase
      .channel(`sticky_notes:${calendarOwnerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sticky_notes",
          filter: `user_id=eq.${calendarOwnerId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const next = mapRowToStickyNote(payload.new as any);
            setNotes((prev) => (prev.some((n) => n.id === next.id) ? prev : [...prev, next]));
            return;
          }
          if (payload.eventType === "UPDATE") {
            const next = mapRowToStickyNote(payload.new as any);
            setNotes((prev) => prev.map((n) => (n.id === next.id ? next : n)));
            return;
          }
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as any;
            const id = oldRow?.id as string | undefined;
            if (!id) return;
            setNotes((prev) => prev.filter((n) => n.id !== id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUserId, calendarOwnerId]);

  const addNote = useCallback(async (date: string | null, text: string, color: StickyColor) => {
    if (!authUserId || !calendarOwnerId) return null;

    const { data, error } = await insertStickyNote(date, text, color);

    // Back-compat: if the DB hasn't been migrated yet and `date` is NOT NULL,
    // retry undated notes as empty string.
    if (error && date === null && error.code === '23502') {
      const retry = await insertStickyNote('', text, color);
      if (retry.error) {
        console.error('Error adding note:', retry.error);
        return null;
      }
      const newNote = mapRowToStickyNote(retry.data as any);
      setNotes((prev) => (prev.some((n) => n.id === newNote.id) ? prev : [...prev, newNote]));
      return newNote;
    }

    if (error) {
      console.error('Error adding note:', error);
      return null;
    }

    const newNote = mapRowToStickyNote(data as any);

    setNotes((prev) => (prev.some((n) => n.id === newNote.id) ? prev : [...prev, newNote]));
    return newNote;
  }, [authUserId, calendarOwnerId, insertStickyNote]);

  const updateNote = useCallback(async (id: string, text: string, color: StickyColor) => {
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
  }, []);

  const moveNote = useCallback(async (id: string, newDate: string | null, connections: NoteConnection[]) => {
    const noteToMove = notes.find((n) => n.id === id);
    if (!noteToMove) return false;

    if (noteToMove.date === newDate) return true;

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
      .update({ date: newDate })
      .eq('id', id);

    // Back-compat: if the DB hasn't been migrated yet and `date` is NOT NULL,
    // retry clearing the date as empty string.
    if (mainError && newDate === null && mainError.code === '23502') {
      const { error: retryError } = await supabase
        .from('sticky_notes')
        .update({ date: '' })
        .eq('id', id);
      if (retryError) {
        console.error('Error moving note:', retryError);
        return false;
      }
      setNotes((prev) =>
        prev.map((note) => (note.id === id ? { ...note, date: '' } : note))
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
          return { ...note, date: newDate };
        }
        if (canComputeDiff && daysDiff !== 0 && connectedNoteIds.includes(note.id) && note.date) {
          return { ...note, date: addDaysToDate(note.date, daysDiff) };
        }
        return note;
      })
    );
    return true;
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
