import { useState, useCallback, useEffect } from 'react';
import { StickyNote, StickyColor, NoteConnection } from '@/types/calendar';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { exampleNotes } from '@/data/exampleCalendar';

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

export function useStickyNotes(userId: string | null, calendarId: string | null) {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  type StickyNotesInsert = Database["public"]["Tables"]["sticky_notes"]["Insert"];
  type StickyNotesRow = Database["public"]["Tables"]["sticky_notes"]["Row"];
  type StickyNotesRowLike = Omit<StickyNotesRow, "calendar_id"> & { calendar_id?: string };

  const isMissingCalendarIdColumn = useCallback((error: unknown) => {
    const err = error as { code?: string; message?: string; details?: string };
    if (!err) return false;
    if (err.code === "42703") return true; // undefined_column
    const msg = `${err.message ?? ""} ${err.details ?? ""}`.toLowerCase();
    return msg.includes("calendar_id") && msg.includes("does not exist");
  }, []);

  const insertStickyNote = useCallback(
    async (date: string | null, text: string, color: StickyColor) => {
      const base = {
        user_id: userId,
        date,
        text,
        color,
      };

      // Prefer inserting with `calendar_id` when available (new schema).
      if (calendarId) {
        const withCalendar = await supabase
          .from("sticky_notes")
          .insert({ ...(base as unknown as StickyNotesInsert), calendar_id: calendarId } as StickyNotesInsert)
          .select()
          .single();

        if (!withCalendar.error) return withCalendar;

        // Back-compat: older schemas don't have `calendar_id`.
        if (isMissingCalendarIdColumn(withCalendar.error)) {
          return supabase
            .from("sticky_notes")
            .insert(base as unknown as StickyNotesInsert)
            .select()
            .single();
        }

        return withCalendar;
      }

      // Legacy schema (no calendars): insert without `calendar_id`.
      return supabase
        .from("sticky_notes")
        .insert(base as unknown as StickyNotesInsert)
        .select()
        .single();
    },
    [calendarId, userId, isMissingCalendarIdColumn]
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
      const primary = calendarId
        ? await supabase.from("sticky_notes").select("*").eq("calendar_id", calendarId).order("created_at", { ascending: true })
        : await supabase.from("sticky_notes").select("*").eq("user_id", userId).order("created_at", { ascending: true });

      if (primary.error && calendarId && isMissingCalendarIdColumn(primary.error)) {
        // Back-compat: older schemas don't have calendars; fall back to user-owned notes.
        const legacy = await supabase.from("sticky_notes").select("*").eq("user_id", userId).order("created_at", { ascending: true });
        if (legacy.error) {
          console.error("Error fetching notes (legacy):", legacy.error);
          setNotes([]);
        } else {
          const rows = (legacy.data ?? []) as unknown as StickyNotesRowLike[];
          const mapped: StickyNote[] = rows.map((note) => ({
            id: note.id,
            calendar_id: note.calendar_id ?? calendarId ?? "",
            user_id: note.user_id,
            date: note.date,
            text: note.text,
            color: note.color as StickyColor,
          }));
          setNotes(mapped);
        }
        setIsLoading(false);
        return;
      }

      if (primary.error) {
        console.error("Error fetching notes:", primary.error);
        setNotes([]);
      } else {
        const rows = (primary.data ?? []) as unknown as StickyNotesRowLike[];
        const mapped: StickyNote[] = rows.map((note) => ({
          id: note.id,
          calendar_id: note.calendar_id ?? calendarId ?? "",
          user_id: note.user_id,
          date: note.date,
          text: note.text,
          color: note.color as StickyColor,
        }));
        setNotes(mapped);
      }
      setIsLoading(false);
    };

    fetchNotes();
  }, [userId, calendarId, isMissingCalendarIdColumn]);

  const addNote = useCallback(async (date: string | null, text: string, color: StickyColor) => {
    if (!userId) return null;

    const { data, error } = await insertStickyNote(date, text, color);

    // Back-compat: if the DB hasn't been migrated yet and `date` is still NOT NULL,
    // retry undated notes as empty string.
    if (error && date === null && error.code === "23502") {
      const retry = await insertStickyNote("", text, color);
      if (retry.error) {
        console.error('Error adding note:', retry.error);
        return null;
      }
      const newNote: StickyNote = {
        id: retry.data.id,
        calendar_id: ((retry.data as unknown as StickyNotesRowLike).calendar_id ?? calendarId ?? ""),
        user_id: retry.data.user_id,
        date: retry.data.date,
        text: retry.data.text,
        color: retry.data.color as StickyColor,
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
      calendar_id: ((data as unknown as StickyNotesRowLike).calendar_id ?? calendarId ?? ""),
      user_id: data.user_id,
      date: data.date,
      text: data.text,
      color: data.color as StickyColor,
    };

    setNotes((prev) => [...prev, newNote]);
    return newNote;
  }, [userId, calendarId, insertStickyNote]);

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

  return { notes, isLoading, addNote, updateNote, moveNote, deleteNote, getNotesByDate };
}
