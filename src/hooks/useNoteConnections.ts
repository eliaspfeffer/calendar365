import { useState, useCallback, useEffect } from 'react';
import { NoteConnection } from '@/types/calendar';
import { supabase } from '@/integrations/supabase/client';
import { exampleConnections } from '@/data/exampleCalendar';

export function useNoteConnections(userId: string | null, calendarId: string | null) {
  const [connections, setConnections] = useState<NoteConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch connections from Supabase
  useEffect(() => {
    if (!userId) {
      setConnections(exampleConnections);
      setIsLoading(false);
      return;
    }

    if (!calendarId) {
      setConnections([]);
      setIsLoading(true);
      return;
    }

    const fetchConnections = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('note_connections')
        .select('*')
        .eq('calendar_id', calendarId);

      if (error) {
        console.error('Error fetching connections:', error);
      } else {
        const mappedConnections: NoteConnection[] = (data || []).map((conn) => ({
          id: conn.id,
          calendar_id: conn.calendar_id,
          user_id: conn.user_id,
          source_note_id: conn.source_note_id,
          target_note_id: conn.target_note_id,
        }));
        setConnections(mappedConnections);
      }
      setIsLoading(false);
    };

    fetchConnections();
  }, [userId, calendarId]);

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
    if (!userId || !calendarId) return null;

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
        calendar_id: calendarId!,
        user_id: userId,
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
      calendar_id: data.calendar_id,
      user_id: data.user_id,
      source_note_id: data.source_note_id,
      target_note_id: data.target_note_id,
    };

    setConnections((prev) => [...prev, newConnection]);
    return newConnection;
  }, [userId, calendarId, connections, deleteConnection]);

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
