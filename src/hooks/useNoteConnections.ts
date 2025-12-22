import { useState, useCallback, useEffect } from 'react';
import { NoteConnection } from '@/types/calendar';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { exampleConnections } from '@/data/exampleCalendar';

export function useNoteConnections(userId: string | null, calendarId: string | null) {
  const [connections, setConnections] = useState<NoteConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  type NoteConnectionsInsert = Database["public"]["Tables"]["note_connections"]["Insert"];
  type NoteConnectionsRow = Database["public"]["Tables"]["note_connections"]["Row"];
  type NoteConnectionsRowLike = Omit<NoteConnectionsRow, "calendar_id"> & { calendar_id?: string };

  const isMissingCalendarIdColumn = useCallback((error: unknown) => {
    const err = error as { code?: string; message?: string; details?: string };
    if (!err) return false;
    if (err.code === "42703") return true; // undefined_column
    if (err.code === "PGRST204") {
      const msg = `${err.message ?? ""} ${err.details ?? ""}`.toLowerCase();
      return msg.includes("calendar_id") && msg.includes("schema cache");
    }
    const msg = `${err.message ?? ""} ${err.details ?? ""}`.toLowerCase();
    return msg.includes("calendar_id") && msg.includes("does not exist");
  }, []);

  // Fetch connections from Supabase
  useEffect(() => {
    if (!userId) {
      setConnections(exampleConnections);
      setIsLoading(false);
      return;
    }

    const fetchConnections = async () => {
      setIsLoading(true);
      const primary = calendarId
        ? await supabase.from("note_connections").select("*").eq("calendar_id", calendarId)
        : await supabase.from("note_connections").select("*").eq("user_id", userId);

      if (primary.error && calendarId && isMissingCalendarIdColumn(primary.error)) {
        const legacy = await supabase.from("note_connections").select("*").eq("user_id", userId);
        if (legacy.error) {
          console.error("Error fetching connections (legacy):", legacy.error);
          setConnections([]);
        } else {
          const rows = (legacy.data ?? []) as unknown as NoteConnectionsRowLike[];
          const mapped: NoteConnection[] = rows.map((conn) => ({
            id: conn.id,
            calendar_id: conn.calendar_id ?? calendarId ?? "",
            user_id: conn.user_id,
            source_note_id: conn.source_note_id,
            target_note_id: conn.target_note_id,
          }));
          setConnections(mapped);
        }
        setIsLoading(false);
        return;
      }

      if (primary.error) {
        console.error("Error fetching connections:", primary.error);
        setConnections([]);
      } else {
        const rows = (primary.data ?? []) as unknown as NoteConnectionsRowLike[];
        const mapped: NoteConnection[] = rows.map((conn) => ({
          id: conn.id,
          calendar_id: conn.calendar_id ?? calendarId ?? "",
          user_id: conn.user_id,
          source_note_id: conn.source_note_id,
          target_note_id: conn.target_note_id,
        }));
        setConnections(mapped);
      }
      setIsLoading(false);
    };

    fetchConnections();
  }, [userId, calendarId, isMissingCalendarIdColumn]);

  const deleteConnection = useCallback(async (id: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from('note_connections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting connection:', error);
      return;
    }

    setConnections((prev) => prev.filter((c) => c.id !== id));
  }, [userId]);

  const addConnection = useCallback(async (sourceNoteId: string, targetNoteId: string) => {
    if (!userId) return null;

    // Check if connection already exists (in either direction)
    const existingConnection = connections.find(
      (c) =>
        (c.source_note_id === sourceNoteId && c.target_note_id === targetNoteId) ||
        (c.source_note_id === targetNoteId && c.target_note_id === sourceNoteId)
    );

    if (existingConnection) {
      // Remove existing connection (toggle behavior)
      await deleteConnection(existingConnection.id);
      return null;
    }

    const base = {
      user_id: userId,
      source_note_id: sourceNoteId,
      target_note_id: targetNoteId,
    };

    const primary = calendarId
      ? await supabase
          .from("note_connections")
          .insert({ ...(base as unknown as NoteConnectionsInsert), calendar_id: calendarId } as NoteConnectionsInsert)
          .select()
          .single()
      : await supabase.from("note_connections").insert(base as unknown as NoteConnectionsInsert).select().single();

    // Back-compat: older schemas don't have `calendar_id`.
    const { data, error } =
      primary.error && calendarId && isMissingCalendarIdColumn(primary.error)
        ? await supabase.from("note_connections").insert(base as unknown as NoteConnectionsInsert).select().single()
        : primary;

    if (error) {
      console.error('Error adding connection:', error);
      return null;
    }

    const newConnection: NoteConnection = {
      id: data.id,
      calendar_id: ((data as unknown as NoteConnectionsRowLike).calendar_id ?? calendarId ?? ""),
      user_id: data.user_id,
      source_note_id: data.source_note_id,
      target_note_id: data.target_note_id,
    };

    setConnections((prev) => [...prev, newConnection]);
    return newConnection;
  }, [userId, calendarId, connections, deleteConnection, isMissingCalendarIdColumn]);

  const getConnectedNotes = useCallback(
    (noteId: string): string[] => {
      const connected: string[] = [];
      connections.forEach((conn) => {
        if (conn.source_note_id === noteId) {
          connected.push(conn.target_note_id);
        } else if (conn.target_note_id === noteId) {
          connected.push(conn.source_note_id);
        }
      });
      return connected;
    },
    [connections]
  );

  const getConnectionsForNote = useCallback(
    (noteId: string): NoteConnection[] => {
      return connections.filter(
        (c) => c.source_note_id === noteId || c.target_note_id === noteId
      );
    },
    [connections]
  );

  return {
    connections,
    isLoading,
    addConnection,
    deleteConnection,
    getConnectedNotes,
    getConnectionsForNote,
  };
}
