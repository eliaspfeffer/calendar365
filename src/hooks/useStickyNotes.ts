import { useState, useCallback } from 'react';
import { StickyNote, StickyColor } from '@/types/calendar';

const STORAGE_KEY = 'calendar-sticky-notes';

function loadNotes(): StickyNote[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: StickyNote[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function useStickyNotes() {
  const [notes, setNotes] = useState<StickyNote[]>(loadNotes);

  const addNote = useCallback((date: string, text: string, color: StickyColor) => {
    const newNote: StickyNote = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date,
      text,
      color,
    };

    setNotes((prev) => {
      const updated = [...prev, newNote];
      saveNotes(updated);
      return updated;
    });

    return newNote;
  }, []);

  const updateNote = useCallback((id: string, text: string, color: StickyColor) => {
    setNotes((prev) => {
      const updated = prev.map((note) =>
        note.id === id ? { ...note, text, color } : note
      );
      saveNotes(updated);
      return updated;
    });
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => {
      const updated = prev.filter((note) => note.id !== id);
      saveNotes(updated);
      return updated;
    });
  }, []);

  const getNotesByDate = useCallback(
    (date: string) => notes.filter((note) => note.date === date),
    [notes]
  );

  return { notes, addNote, updateNote, deleteNote, getNotesByDate };
}
