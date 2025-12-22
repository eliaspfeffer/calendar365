import { useState, useCallback, useEffect } from 'react';
import { StickyNote, StickyColor, NoteConnection } from '@/types/calendar';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
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

export function useStickyNotes(userId: string | null, calendarId: string | null) {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  type StickyNotesInsert = Database["public"]["Tables"]["sticky_notes"]["Insert"];
  type StickyNotesRow = Database["public"]["Tables"]["sticky_notes"]["Row"];
  type StickyNotesRowLike = Omit<StickyNotesRow, "calendar_id"> & { calendar_id?: string };
  type SupabaseErrorLike = { code?: string; message?: string; details?: string; hint?: string };

  const isMissingColumn = useCallback((error: unknown, column: string) => {
    const err = error as SupabaseErrorLike | null | undefined;
    if (!err) return false;
    const msg = `${err.message ?? ""} ${err.details ?? ""} ${err.hint ?? ""}`.toLowerCase();
    const col = column.toLowerCase();
    if (err.code === "42703") {
      return msg.includes(col) && msg.includes("does not exist");
    }
    if (err.code === "PGRST204") {
      return msg.includes(col) && msg.includes("schema cache");
    }
    return (
      (msg.includes(col) && msg.includes("does not exist")) ||
      (msg.includes("could not find") && msg.includes(col) && msg.includes("schema cache"))
    );
  }, []);

  const isMissingCalendarIdColumn = useCallback((error: unknown) => {
    return isMissingColumn(error, "calendar_id");
  }, [isMissingColumn]);

  const insertStickyNote = useCallback(
    async (date: string | null, text: string, color: StickyColor, position?: NotePosition | null) => {
      const base = {
        user_id: userId,
        date,
        text,
        color,
        ...(position ? { pos_x: position.x, pos_y: position.y } : {}),
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
          pos_x: note.pos_x ?? null,
          pos_y: note.pos_y ?? null,
        }));
        setNotes(mapped);
      }
      setIsLoading(false);
    };

    fetchNotes();
  }, [userId, calendarId, isMissingCalendarIdColumn]);

  const addNote = useCallback(
    async (
      date: string | null,
      text: string,
      color: StickyColor,
      position?: NotePosition | null
    ) => {
      if (!userId) return null;

      // Legacy mode (older schema) works without calendars.
      // Newer schemas enforce calendar_id, in which case Supabase will error and we show a migration hint upstream.

      // Try to insert with the best available shape, then progressively degrade for older schemas:
      // - drop position if pos_x/pos_y missing
      // - coerce undated notes to empty string if `date` is still NOT NULL
      let currentDate: string | null = date;
      let currentPosition: NotePosition | null | undefined = position;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const result = await insertStickyNote(currentDate, text, color, currentPosition);
        const { data, error } = result as typeof result & { error?: { code?: string } | null };

        if (!error && data) {
          const row = data as unknown as StickyNotesRowLike & { pos_x?: number | null; pos_y?: number | null };
          const newNote: StickyNote = {
            id: row.id,
            calendar_id: row.calendar_id ?? calendarId ?? "",
            user_id: row.user_id,
            date: row.date,
            text: row.text,
            color: row.color as StickyColor,
            pos_x: row.pos_x ?? null,
            pos_y: row.pos_y ?? null,
          };
          setNotes((prev) => [...prev, newNote]);
          return newNote;
        }

        // Undefined column (older schema): drop position fields and retry once.
        if (currentPosition && (isMissingColumn(error, "pos_x") || isMissingColumn(error, "pos_y"))) {
          currentPosition = null;
          continue;
        }

        // Not-null violation (older schema): undated notes must use empty string.
        if (error?.code === "23502" && currentDate === null) {
          currentDate = "";
          continue;
        }

        console.error("Error adding note:", error);
        return null;
      }

      return null;
    },
    [userId, calendarId, insertStickyNote, isMissingColumn]
  );

  const updateNote = useCallback(
    async (id: string, text: string, color: StickyColor) => {
      if (!userId) return false;
      const { error } = await supabase.from("sticky_notes").update({ text, color }).eq("id", id);

      if (error) {
        console.error("Error updating note:", error);
        return false;
      }

      setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, text, color } : note)));
      return true;
    },
    [userId]
  );

  const moveNote = useCallback(async (id: string, newDate: string | null, connections: NoteConnection[]) => {
    if (!userId) return { ok: false as const, error: { message: "Not signed in" } satisfies SupabaseErrorLike };
    const noteToMove = notes.find((n) => n.id === id) ?? null;

    if (noteToMove && noteToMove.date === newDate) return { ok: true as const };

    // Get all connected note IDs
    const connectedNoteIds: string[] = [];
    connections.forEach((conn) => {
      if (conn.source_note_id === id) {
        connectedNoteIds.push(conn.target_note_id);
      } else if (conn.target_note_id === id) {
        connectedNoteIds.push(conn.source_note_id);
      }
    });

    const canComputeDiff = Boolean(noteToMove?.date) && Boolean(newDate);
    const daysDiff = canComputeDiff
      ? getDaysDifference(noteToMove?.date as string, newDate as string)
      : 0;

    // Move the main note
    const primary = await supabase
      .from('sticky_notes')
      .update({ date: newDate, pos_x: null, pos_y: null })
      .eq('id', id);
    let mainError = primary.error;

    // Back-compat: older schemas don't have pos_x/pos_y.
    if (mainError && (isMissingColumn(mainError, "pos_x") || isMissingColumn(mainError, "pos_y"))) {
      const retry = await supabase
        .from("sticky_notes")
        .update({ date: newDate })
        .eq("id", id);
      mainError = retry.error;
    }

    // Back-compat: if the DB hasn't been migrated yet and `date` is NOT NULL,
    // retry clearing the date as empty string.
    if (mainError && newDate === null && mainError.code === '23502') {
      // Prefer clearing pos fields if available; otherwise update just the date.
      const retry = await supabase
        .from("sticky_notes")
        .update({ date: "", pos_x: null, pos_y: null })
        .eq("id", id);
      const retryError =
        retry.error && (isMissingColumn(retry.error, "pos_x") || isMissingColumn(retry.error, "pos_y"))
          ? (
              await supabase
                .from("sticky_notes")
                .update({ date: "" })
                .eq("id", id)
            ).error
          : retry.error;
      if (retryError) {
        console.error('Error moving note:', retryError);
        return { ok: false as const, error: retryError as unknown as SupabaseErrorLike };
      }
      setNotes((prev) =>
        prev.map((note) =>
          note.id === id ? { ...note, date: '', pos_x: null, pos_y: null } : note
        )
      );
      return { ok: true as const };
    }

    if (mainError) {
      console.error('Error moving note:', mainError);
      return { ok: false as const, error: mainError as unknown as SupabaseErrorLike };
    }

    // Move connected notes (only when both old & new dates are set)
    if (noteToMove && canComputeDiff && daysDiff !== 0) {
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
        if (noteToMove && canComputeDiff && daysDiff !== 0 && connectedNoteIds.includes(note.id) && note.date) {
          return { ...note, date: addDaysToDate(note.date, daysDiff) };
        }
        return note;
      })
    );
    return { ok: true as const };
  }, [notes, userId, isMissingColumn]);

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
    if (error && (isMissingColumn(error, "pos_x") || isMissingColumn(error, "pos_y"))) {
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
  }, [notes, userId, isMissingColumn]);

  const setNoteCanvasPosition = useCallback(async (id: string, position: NotePosition) => {
    if (!userId) return false;
    const noteToMove = notes.find((n) => n.id === id);
    if (!noteToMove) return false;

    const { error } = await supabase
      .from('sticky_notes')
      .update({ pos_x: position.x, pos_y: position.y })
      .eq('id', id);

    // Back-compat: older schemas don't have pos_x/pos_y; keep the note unpositioned.
    if (error && (isMissingColumn(error, "pos_x") || isMissingColumn(error, "pos_y"))) {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pos_x: null, pos_y: null } : n)));
      return true;
    }

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
  }, [notes, userId, isMissingColumn]);

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
