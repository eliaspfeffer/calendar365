import { useState, useRef, useEffect, useCallback } from 'react';
import { useCalendarData, formatDateKey } from '@/hooks/useCalendarData';
import { useStickyNotes } from '@/hooks/useStickyNotes';
import { useNoteConnections } from '@/hooks/useNoteConnections';
import { useZoomPan } from '@/hooks/useZoomPan';
import { CalendarCell } from './CalendarCell';
import { NoteDialog } from './NoteDialog';
import { ZoomControls } from './ZoomControls';
import { ConnectionLines } from './ConnectionLines';
import { StickyNote, StickyColor } from '@/types/calendar';
import { TextOverflowMode } from '@/hooks/useSettings';
import { useToast } from '@/hooks/use-toast';

interface SingleYearGridProps {
  year: number;
  scale: number;
  getNotesByDate: (date: string) => StickyNote[];
  onCellClick: (date: Date) => void;
  onNoteClick: (note: StickyNote) => void;
  onDeleteNote: (id: string) => void;
  onNoteHover: (noteId: string | null) => void;
  onLinkClick?: (noteId: string) => void;
  textOverflowMode: TextOverflowMode;
  isLinkMode: boolean;
  connectedNoteIds: string[];
  highlightedNoteIds: string[];
}

function SingleYearGrid({
  year,
  scale,
  getNotesByDate,
  onCellClick,
  onNoteClick,
  onDeleteNote,
  onNoteHover,
  onLinkClick,
  textOverflowMode,
  isLinkMode,
  connectedNoteIds,
  highlightedNoteIds,
}: SingleYearGridProps) {
  const { calendarData, months } = useCalendarData(year);
  const maxDays = Math.max(...calendarData.map((month) => month.length));

  return (
    <div className="inline-block bg-card shadow-2xl min-w-max">
      {/* Header */}
      <div className="bg-calendar-header px-8 py-6">
        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-primary-foreground tracking-wider text-center">
          THE BIG CALENDAR {year}
        </h1>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Month rows */}
        {calendarData.map((monthDays, monthIndex) => (
          <div key={monthIndex} className="flex">
            {/* Month label */}
            <div className="w-16 flex-shrink-0 flex items-center justify-center bg-secondary/50 border-b border-r border-calendar-grid">
              <span className="font-display text-2xl text-primary tracking-wide">
                {months[monthIndex]}
              </span>
            </div>

            {/* Days */}
            <div className="flex">
              {monthDays.map((day) => (
                <CalendarCell
                  key={formatDateKey(day.date)}
                  day={day}
                  notes={getNotesByDate(formatDateKey(day.date))}
                  onCellClick={() => onCellClick(day.date)}
                  onNoteClick={onNoteClick}
                  onDeleteNote={onDeleteNote}
                  onNoteHover={onNoteHover}
                  onLinkClick={onLinkClick}
                  scale={scale}
                  textOverflowMode={textOverflowMode}
                  isLinkMode={isLinkMode}
                  connectedNoteIds={connectedNoteIds}
                  highlightedNoteIds={highlightedNoteIds}
                />
              ))}

              {/* Empty cells to fill up to maxDays */}
              {Array.from({ length: maxDays - monthDays.length }).map((_, i) => (
                <div
                  key={`empty-${monthIndex}-${i}`}
                  className="min-w-[50px] h-[60px] border-r border-b border-calendar-grid bg-muted/30"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface YearCalendarProps {
  years: number[];
  userId: string | null;
  onAuthRequired?: () => void;
  textOverflowMode: TextOverflowMode;
}

export function YearCalendar({ years, userId, onAuthRequired, textOverflowMode }: YearCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { notes, addNote, updateNote, moveNote, deleteNote, getNotesByDate } = useStickyNotes(userId);
  const { connections, addConnection, getConnectedNotes, getConnectionsForNote } = useNoteConnections(userId);
  const { toast } = useToast();
  const {
    scale,
    translateX,
    translateY,
    handleWheel,
    handleMouseDown,
    zoomIn,
    zoomOut,
    resetView,
    isDragging,
  } = useZoomPan();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [linkSourceNoteId, setLinkSourceNoteId] = useState<string | null>(null);

  // Track Command/Meta key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        setIsLinkMode(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        setIsLinkMode(false);
        setLinkSourceNoteId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleCellClick = useCallback((date: Date) => {
    if (isDragging()) return;
    if (isLinkMode) return; // Don't open dialog in link mode
    if (!userId) {
      onAuthRequired?.();
      return;
    }
    setSelectedDate(formatDateKey(date));
    setEditingNote(null);
    setDialogOpen(true);
  }, [userId, onAuthRequired, isDragging, isLinkMode]);

  const handleNoteClick = useCallback((note: StickyNote) => {
    if (isDragging()) return;
    if (isLinkMode) return; // Handled by onLinkClick
    setSelectedDate(note.date);
    setEditingNote(note);
    setDialogOpen(true);
  }, [isDragging, isLinkMode]);

  const handleLinkClick = useCallback((noteId: string) => {
    if (!linkSourceNoteId) {
      // First note selected
      setLinkSourceNoteId(noteId);
      toast({
        title: 'Link mode',
        description: 'Now click another note to connect them (or the same note to cancel)',
      });
    } else if (linkSourceNoteId === noteId) {
      // Same note clicked, cancel
      setLinkSourceNoteId(null);
      toast({
        title: 'Link cancelled',
      });
    } else {
      // Second note selected, create or remove connection
      addConnection(linkSourceNoteId, noteId);
      setLinkSourceNoteId(null);
      toast({
        title: 'Notes linked!',
        description: 'Hover over either note to see the connection.',
      });
    }
  }, [linkSourceNoteId, addConnection, toast]);

  const handleNoteHover = useCallback((noteId: string | null) => {
    setHoveredNoteId(noteId);
  }, []);

  const handleSaveNote = useCallback(
    (text: string, color: StickyColor) => {
      if (editingNote) {
        updateNote(editingNote.id, text, color);
      } else if (selectedDate) {
        addNote(selectedDate, text, color);
      }
    },
    [editingNote, selectedDate, addNote, updateNote]
  );

  const handleDeleteNote = useCallback(() => {
    if (editingNote) {
      deleteNote(editingNote.id);
      setDialogOpen(false);
    }
  }, [editingNote, deleteNote]);

  const handleMoveNote = useCallback(
    (newDate: string) => {
      if (editingNote) {
        moveNote(editingNote.id, newDate, connections);
      }
    },
    [editingNote, moveNote, connections]
  );

  // Get all note IDs that have connections
  const connectedNoteIds = connections.flatMap((c) => [c.source_note_id, c.target_note_id]);
  const uniqueConnectedNoteIds = [...new Set(connectedNoteIds)];

  // Get highlighted notes (connected to hovered note)
  const highlightedNoteIds = hoveredNoteId ? [hoveredNoteId, ...getConnectedNotes(hoveredNoteId)] : [];

  return (
    <div
      ref={containerRef}
      className="w-full h-screen overflow-hidden bg-muted cursor-grab active:cursor-grabbing relative"
      onMouseDown={handleMouseDown}
    >
      <div
        ref={contentRef}
        className="origin-top-left transition-none relative"
        style={{
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        }}
      >
        {/* Multiple Year Calendars */}
        <div className="flex flex-col gap-12 p-10">
          {years.map((year) => (
            <SingleYearGrid
              key={year}
              year={year}
              scale={scale}
              getNotesByDate={getNotesByDate}
              onCellClick={handleCellClick}
              onNoteClick={handleNoteClick}
              onDeleteNote={deleteNote}
              onNoteHover={handleNoteHover}
              onLinkClick={handleLinkClick}
              textOverflowMode={textOverflowMode}
              isLinkMode={isLinkMode}
              connectedNoteIds={uniqueConnectedNoteIds}
              highlightedNoteIds={highlightedNoteIds}
            />
          ))}
        </div>

        {/* Connection lines overlay - inside transformed container */}
        <ConnectionLines
          connections={connections}
          notes={notes}
          hoveredNoteId={hoveredNoteId}
          containerRef={contentRef}
        />
      </div>

      {/* Link mode indicator */}
      {isLinkMode && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg z-50 animate-fade-in">
          {linkSourceNoteId ? 'Click another note to link' : 'Click a note to start linking'}
        </div>
      )}

      <ZoomControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetView}
        scale={scale}
      />

      <NoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={selectedDate}
        existingNote={editingNote}
        onSave={handleSaveNote}
        onDelete={editingNote ? handleDeleteNote : undefined}
        onMove={editingNote ? handleMoveNote : undefined}
      />
    </div>
  );
}
