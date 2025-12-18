import { CalendarDay, StickyNote } from "@/types/calendar";
import { StickyNoteComponent } from "./StickyNoteComponent";
import { cn } from "@/lib/utils";
import { TextOverflowMode } from "@/hooks/useSettings";
import { formatDateKey } from "@/hooks/useCalendarData";

interface CalendarCellProps {
  day: CalendarDay;
  notes: StickyNote[];
  onCellClick: () => void;
  onNoteClick: (note: StickyNote) => void;
  onDeleteNote: (id: string) => void;
  onNoteHover: (noteId: string | null) => void;
  onLinkClick?: (noteId: string) => void;
  onNoteDragStart?: (noteId: string, e: React.DragEvent) => void;
  onNoteDragEnd?: () => void;
  onDrop?: (date: string, noteId: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  scale: number;
  textOverflowMode: TextOverflowMode;
  isLinkMode: boolean;
  connectedNoteIds: string[];
  highlightedNoteIds: string[];
  draggedNoteId?: string | null;
}

export function CalendarCell({
  day,
  notes,
  onCellClick,
  onNoteClick,
  onDeleteNote,
  onNoteHover,
  onLinkClick,
  onNoteDragStart,
  onNoteDragEnd,
  onDrop,
  onDragOver,
  scale,
  textOverflowMode,
  isLinkMode,
  connectedNoteIds,
  highlightedNoteIds,
  draggedNoteId,
}: CalendarCellProps) {
  const hasNote = notes.length > 0;
  const dateKey = formatDateKey(day.date);

  const handleDragOver = (e: React.DragEvent) => {
    // Check if we're dragging a note by looking at dataTransfer types
    const types = e.dataTransfer.types;
    if (types.includes("text/plain") || draggedNoteId) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      onDragOver?.(e);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    // Get the note ID from dataTransfer or from draggedNoteId
    let noteId = draggedNoteId;
    if (!noteId) {
      noteId = e.dataTransfer.getData("text/plain");
    }
    if (noteId) {
      e.preventDefault();
      e.stopPropagation();
      onDrop?.(dateKey, noteId);
    }
  };

  return (
    <div
      className={cn(
        "calendar-cell min-w-[50px] relative cursor-pointer",
        textOverflowMode === "expand" ? "min-h-[60px]" : "h-[60px]",
        day.isWeekend && "bg-calendar-weekend/50",
        day.isToday && "ring-2 ring-inset ring-primary",
        draggedNoteId && "ring-2 ring-primary ring-offset-1 bg-primary/5"
      )}
      onClick={!hasNote ? onCellClick : undefined}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="absolute top-0.5 left-1 right-1 flex items-center justify-between z-10">
        <span
          className={cn(
            "text-[10px] font-semibold uppercase",
            day.isWeekend ? "text-primary" : "text-muted-foreground"
          )}
        >
          {day.dayOfWeek}
        </span>
        <span
          className={cn(
            "text-xs font-bold",
            day.isToday ? "text-primary" : "text-foreground/70"
          )}
        >
          {day.dayOfMonth}
        </span>
      </div>

      {notes.map((note) => (
        <StickyNoteComponent
          key={note.id}
          note={note}
          onDelete={onDeleteNote}
          onClick={() => onNoteClick(note)}
          onHover={onNoteHover}
          onLinkClick={onLinkClick}
          onDragStart={onNoteDragStart}
          onDragEnd={onNoteDragEnd}
          scale={scale}
          textOverflowMode={textOverflowMode}
          isLinkMode={isLinkMode}
          isConnected={connectedNoteIds.includes(note.id)}
          isHighlighted={highlightedNoteIds.includes(note.id)}
          isDragging={draggedNoteId === note.id}
        />
      ))}
    </div>
  );
}
