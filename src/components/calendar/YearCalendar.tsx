import { useState, useRef, useEffect, useCallback } from "react";
import { useCalendarData, formatDateKey } from "@/hooks/useCalendarData";
import { useStickyNotes } from "@/hooks/useStickyNotes";
import { useNoteConnections } from "@/hooks/useNoteConnections";
import { useZoomPan } from "@/hooks/useZoomPan";
import { CalendarCell } from "./CalendarCell";
import { NoteDialog } from "./NoteDialog";
import { ZoomControls } from "./ZoomControls";
import { ConnectionLines } from "./ConnectionLines";
import { InboxNotesPanel } from "./InboxNotesPanel";
import { StickyNote, StickyColor } from "@/types/calendar";
import { TextOverflowMode } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CalendarColor } from "@/hooks/useSettings";

interface SingleYearGridProps {
  year: number;
  scale: number;
  getNotesByDate: (date: string) => StickyNote[];
  onCellClick: (date: Date) => void;
  onNoteClick: (note: StickyNote) => void;
  onDeleteNote: (id: string) => void;
  onNoteHover: (noteId: string | null) => void;
  onLinkClick?: (noteId: string) => void;
  onNoteDragStart?: (noteId: string, e: React.DragEvent) => void;
  onNoteDragEnd?: () => void;
  onDrop?: (date: string, noteId: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  textOverflowMode: TextOverflowMode;
  isLinkMode: boolean;
  connectedNoteIds: string[];
  highlightedNoteIds: string[];
  draggedNoteId?: string | null;
  canEdit: boolean;
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
  onNoteDragStart,
  onNoteDragEnd,
  onDrop,
  onDragOver,
  textOverflowMode,
  isLinkMode,
  connectedNoteIds,
  highlightedNoteIds,
  draggedNoteId,
  canEdit,
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
                  onNoteDragStart={onNoteDragStart}
                  onNoteDragEnd={onNoteDragEnd}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  scale={scale}
                  textOverflowMode={textOverflowMode}
                  isLinkMode={isLinkMode}
                  connectedNoteIds={connectedNoteIds}
                  highlightedNoteIds={highlightedNoteIds}
                  draggedNoteId={draggedNoteId}
                  canEdit={canEdit}
                />
              ))}

              {/* Empty cells to fill up to maxDays */}
              {Array.from({ length: maxDays - monthDays.length }).map(
                (_, i) => (
                  <div
                    key={`empty-${monthIndex}-${i}`}
                    className="min-w-[50px] h-[60px] border-r border-b border-calendar-grid bg-muted/30"
                  />
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface YearCalendarProps {
  years: number[];
  authUserId: string | null;
  calendarOwnerId: string | null;
  canEdit: boolean;
  onAuthRequired?: () => void;
  textOverflowMode: TextOverflowMode;
  calendarColor: CalendarColor;
}

export function YearCalendar({
  years,
  authUserId,
  calendarOwnerId,
  canEdit,
  onAuthRequired,
  textOverflowMode,
  calendarColor,
}: YearCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { notes, addNote, updateNote, moveNote, deleteNote, getNotesByDate } =
    useStickyNotes({ authUserId, calendarOwnerId });
  const {
    connections,
    addConnection,
    getConnectedNotes,
  } = useNoteConnections({ authUserId, calendarOwnerId });
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
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);

  const inboxNotes = notes.filter((n) => !n.date);

  useEffect(() => {
    if (canEdit) return;
    setIsLinkMode(false);
    setLinkSourceNoteId(null);
  }, [canEdit]);

  // Track Command/Meta key state
  useEffect(() => {
    if (!canEdit) return;
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

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [canEdit]);

  // Allow deleting a note with the keyboard while hovering it
  useEffect(() => {
    const isTypingInField = () => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return false;
      const tag = active.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        active.isContentEditable
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (dialogOpen) return;
      if (!hoveredNoteId) return;
      if (draggedNoteId) return;
      if (!canEdit) return;
      if (isTypingInField()) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteNote(hoveredNoteId);
        setHoveredNoteId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hoveredNoteId, deleteNote, dialogOpen, draggedNoteId, canEdit]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleCellClick = useCallback(
    (date: Date) => {
      if (isDragging()) return;
      if (isLinkMode) return; // Don't open dialog in link mode
      if (draggedNoteId) return; // Don't open dialog while dragging
      if (!authUserId) {
        onAuthRequired?.();
        return;
      }
      if (!canEdit) {
        toast({
          title: "Read-only calendar",
          description: "You can view this calendar, but you can’t add notes.",
        });
        return;
      }
      setSelectedDate(formatDateKey(date));
      setEditingNote(null);
      setDialogOpen(true);
    },
    [authUserId, onAuthRequired, isDragging, isLinkMode, draggedNoteId, canEdit, toast]
  );

  const handleNoteClick = useCallback(
    (note: StickyNote) => {
      if (isDragging()) return;
      if (isLinkMode) return; // Handled by onLinkClick
      if (draggedNoteId) return; // Don't open dialog if we just dragged
      setSelectedDate(note.date ?? null);
      setEditingNote(note);
      setDialogOpen(true);
    },
    [isDragging, isLinkMode, draggedNoteId]
  );

  const handleInboxNoteClick = useCallback(
    (note: StickyNote) => {
      if (isDragging()) return;
      if (draggedNoteId) return;
      setSelectedDate(note.date ?? null);
      setEditingNote(note);
      setDialogOpen(true);
    },
    [isDragging, draggedNoteId]
  );

  const handleLinkClick = useCallback(
    (noteId: string) => {
      if (!canEdit) return;
      const note = notes.find((n) => n.id === noteId);
      if (!note?.date) {
        toast({
          title: "Inbox note",
          description: "Assign a date before linking notes.",
        });
        return;
      }
      if (!linkSourceNoteId) {
        // First note selected
        setLinkSourceNoteId(noteId);
        toast({
          title: "Link mode",
          description:
            "Now click another note to connect them (or the same note to cancel)",
        });
      } else if (linkSourceNoteId === noteId) {
        // Same note clicked, cancel
        setLinkSourceNoteId(null);
        toast({
          title: "Link cancelled",
        });
      } else {
        const sourceNote = notes.find((n) => n.id === linkSourceNoteId);
        if (!sourceNote?.date) {
          setLinkSourceNoteId(null);
          toast({
            title: "Inbox note",
            description: "Assign a date before linking notes.",
          });
          return;
        }
        // Second note selected, create or remove connection
        addConnection(linkSourceNoteId, noteId);
        setLinkSourceNoteId(null);
        toast({
          title: "Notes linked!",
          description: "Hover over either note to see the connection.",
        });
      }
    },
    [linkSourceNoteId, addConnection, toast, notes, canEdit]
  );

  const handleNoteHover = useCallback((noteId: string | null) => {
    setHoveredNoteId(noteId);
  }, []);

  const handleNoteDragStart = useCallback(
    (noteId: string, e: React.DragEvent) => {
      if (!canEdit) return;
      // Set dragged note ID immediately to prevent panning
      setDraggedNoteId(noteId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", noteId);
    },
    [canEdit]
  );

  const handleNoteDragEnd = useCallback(() => {
    // Small delay to ensure drag end is fully processed
    setTimeout(() => {
      setDraggedNoteId(null);
    }, 0);
  }, []);

  const handleNoteDrop = useCallback(
    async (date: string, noteId: string) => {
      if (!canEdit) return;
      if (!noteId) {
        setDraggedNoteId(null);
        return;
      }
      const note = notes.find((n) => n.id === noteId);
      if (note && note.date !== date) {
        const moved = await moveNote(noteId, date, connections);
        if (!moved) {
          toast({
            title: "Couldn’t move note",
            description: "The change wasn’t saved. Check your Supabase schema/migrations.",
            variant: "destructive",
          });
          setDraggedNoteId(null);
          return;
        }
        toast({
          title: "Note moved",
          description: `Note moved to ${new Date(date).toLocaleDateString()}`,
        });
      } else if (!note) {
        console.warn("Note not found:", noteId);
      }
      setDraggedNoteId(null);
    },
    [notes, moveNote, connections, toast]
  );

  const handleInboxDrop = useCallback(
    async (noteId: string) => {
      if (!canEdit) return;
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;
      if (!note.date) return;
      const moved = await moveNote(noteId, null, connections);
      if (!moved) {
        toast({
          title: "Couldn’t move to Inbox",
          description: "The change wasn’t saved. Check your Supabase schema/migrations.",
          variant: "destructive",
        });
        setDraggedNoteId(null);
        return;
      }
      toast({
        title: "Moved to Inbox",
        description: "Note now has no date.",
      });
      setDraggedNoteId(null);
    },
    [notes, moveNote, connections, toast]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleSaveNote = useCallback(
    async (text: string, color: StickyColor) => {
      if (!canEdit) return false;
      if (editingNote) {
        const updated = await updateNote(editingNote.id, text, color);
        if (!updated) {
          toast({
            title: "Couldn’t save note",
            description: "Your changes weren’t saved to Supabase.",
            variant: "destructive",
          });
          return false;
        }
        return true;
      } else {
        const created = await addNote(selectedDate, text, color);
        if (!created) {
          toast({
            title: "Couldn’t create note",
            description:
              "Nothing was saved to Supabase. If you’re using an older schema, apply the new migration (or we’ll fall back to an empty date).",
            variant: "destructive",
          });
          return false;
        }
        return true;
      }
    },
    [editingNote, selectedDate, addNote, updateNote, toast]
  );

  const handleDeleteNote = useCallback(() => {
    if (!canEdit) return;
    if (editingNote) {
      deleteNote(editingNote.id);
      setDialogOpen(false);
    }
  }, [editingNote, deleteNote, canEdit]);

  const handleMoveNote = useCallback(
    async (newDate: string | null) => {
      if (!canEdit) return false;
      if (editingNote) {
        const moved = await moveNote(editingNote.id, newDate, connections);
        if (!moved) {
          toast({
            title: "Couldn’t move note",
            description: "The change wasn’t saved. Check your Supabase schema/migrations.",
            variant: "destructive",
          });
          return false;
        }
        return true;
      }
      return false;
    },
    [editingNote, moveNote, connections, toast]
  );

  // Get all note IDs that have connections
  const connectedNoteIds = connections.flatMap((c) => [
    c.source_note_id,
    c.target_note_id,
  ]);
  const uniqueConnectedNoteIds = [...new Set(connectedNoteIds)];

  // Get highlighted notes (connected to hovered note)
  const highlightedNoteIds = hoveredNoteId
    ? [hoveredNoteId, ...getConnectedNotes(hoveredNoteId)]
    : [];

  const handleContainerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Don't start panning if clicking on a note or in link mode or if already dragging
      const target = e.target as HTMLElement;
      if (
        target.closest(".sticky-note") ||
        isLinkMode ||
        draggedNoteId
      ) {
        e.stopPropagation();
        return;
      }
      handleMouseDown(e);
    },
    [handleMouseDown, isLinkMode, draggedNoteId]
  );

  const calendarHeaderHsl: Record<CalendarColor, string> = {
    blue: "207 90% 45%",
    green: "142 76% 36%",
    purple: "268 70% 45%",
    red: "0 72% 45%",
    orange: "24 94% 45%",
    teal: "173 80% 35%",
    pink: "335 78% 50%",
    indigo: "226 70% 45%",
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full h-screen overflow-hidden bg-muted relative",
        draggedNoteId ? "cursor-grabbing" : "cursor-grab active:cursor-grabbing"
      )}
      onMouseDown={handleContainerMouseDown}
      style={
        {
          ["--calendar-header" as any]: calendarHeaderHsl[calendarColor],
        } as React.CSSProperties
      }
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
              onNoteDragStart={handleNoteDragStart}
              onNoteDragEnd={handleNoteDragEnd}
              onDrop={handleNoteDrop}
              onDragOver={handleDragOver}
              textOverflowMode={textOverflowMode}
              isLinkMode={isLinkMode}
              connectedNoteIds={uniqueConnectedNoteIds}
              highlightedNoteIds={highlightedNoteIds}
              draggedNoteId={draggedNoteId}
              canEdit={canEdit}
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
          {linkSourceNoteId
            ? "Click another note to link"
            : "Click a note to start linking"}
        </div>
      )}

      <ZoomControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetView}
        scale={scale}
      />

      <InboxNotesPanel
        notes={inboxNotes}
        onNewNote={() => {
          if (!authUserId) {
            onAuthRequired?.();
            return;
          }
          if (!canEdit) {
            toast({
              title: "Read-only calendar",
              description: "You can’t add notes to this calendar.",
            });
            return;
          }
          setSelectedDate(null);
          setEditingNote(null);
          setDialogOpen(true);
        }}
        onNoteClick={handleInboxNoteClick}
        onDeleteNote={deleteNote}
        onNoteHover={handleNoteHover}
        onDropToInbox={handleInboxDrop}
        onNoteDragStart={handleNoteDragStart}
        onNoteDragEnd={handleNoteDragEnd}
        draggedNoteId={draggedNoteId}
        textOverflowMode={textOverflowMode}
        canEdit={canEdit}
      />

      <NoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={selectedDate}
        existingNote={editingNote}
        onSave={handleSaveNote}
        onDelete={editingNote ? handleDeleteNote : undefined}
        onMove={editingNote ? handleMoveNote : undefined}
        readOnly={!canEdit}
      />
    </div>
  );
}
