import { useState, useCallback, useEffect } from "react";
import { NoteConnection } from "@/types/calendar";
import { supabase } from "@/integrations/supabase/client";

export function useNoteConnections({
  authUserId,
  calendarOwnerId,
}: {
  authUserId: string | null;
  calendarOwnerId: string | null;
}) {
  const [connections, setConnections] = useState<NoteConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch connections from Supabase
  useEffect(() => {
    if (!authUserId || !calendarOwnerId) {
      setConnections([]);
      setIsLoading(false);
      return;
    }

    const fetchConnections = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('note_connections')
        .select('*')
        .eq('user_id', calendarOwnerId);

      if (error) {
        console.error('Error fetching connections:', error);
      } else {
        const mappedConnections: NoteConnection[] = (data || []).map((conn) => ({
          id: conn.id,
          user_id: conn.user_id,
          source_note_id: conn.source_note_id,
          target_note_id: conn.target_note_id,
        }));
        setConnections(mappedConnections);
      }
      setIsLoading(false);
    };

    fetchConnections();
  }, [authUserId, calendarOwnerId]);

  // Realtime updates for co-editing
  useEffect(() => {
    if (!authUserId || !calendarOwnerId) return;

    const channel = supabase
      .channel(`note_connections:${calendarOwnerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "note_connections",
          filter: `user_id=eq.${calendarOwnerId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const next = payload.new as any;
            const mapped: NoteConnection = {
              id: next.id,
              user_id: next.user_id,
              source_note_id: next.source_note_id,
              target_note_id: next.target_note_id,
            };
            setConnections((prev) =>
              prev.some((c) => c.id === mapped.id) ? prev : [...prev, mapped]
            );
            return;
          }
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as any;
            const id = oldRow?.id as string | undefined;
            if (!id) return;
            setConnections((prev) => prev.filter((c) => c.id !== id));
            return;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUserId, calendarOwnerId]);

  const addConnection = useCallback(async (sourceNoteId: string, targetNoteId: string) => {
    if (!authUserId || !calendarOwnerId) return null;

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

    const { data, error } = await supabase
      .from('note_connections')
      .insert({
        user_id: calendarOwnerId,
        source_note_id: sourceNoteId,
        target_note_id: targetNoteId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding connection:', error);
      return null;
    }

    const newConnection: NoteConnection = {
      id: data.id,
      user_id: data.user_id,
      source_note_id: data.source_note_id,
      target_note_id: data.target_note_id,
    };

    setConnections((prev) => [...prev, newConnection]);
    return newConnection;
  }, [authUserId, calendarOwnerId, connections]);

  const deleteConnection = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('note_connections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting connection:', error);
      return;
    }

    setConnections((prev) => prev.filter((c) => c.id !== id));
  }, []);

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
