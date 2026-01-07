import { CalendarDay, StickyNote } from "@/types/calendar";
import { StickyNoteComponent } from "./StickyNoteComponent";
import { cn } from "@/lib/utils";
import { TextOverflowMode } from "@/hooks/useSettings";
import { formatDateKey } from "@/hooks/useCalendarData";
import { Plus } from "lucide-react";
import type { GoogleCalendarDayEvent } from "@/types/googleCalendar";
import { GoogleEventItem } from "@/components/calendar/GoogleEventItem";

interface CalendarCellProps {
  day: CalendarDay;
  notes: StickyNote[];
  events?: GoogleCalendarDayEvent[];
  onCellClick: () => void;
  onNoteClick: (note: StickyNote) => void;
  onToggleNoteStrikethrough?: (noteId: string, next: boolean) => void;
  onDeleteNote: (id: string) => void;
  onNoteHover: (noteId: string | null) => void;
  onLinkClick?: (noteId: string) => void;
  onNoteDragStart?: (noteId: string, e: React.DragEvent) => void;
  onNoteDragEnd?: () => void;
  onDrop?: (date: string, noteId: string, insertIndex?: number) => void;
  onDragOver?: (e: React.DragEvent) => void;
  scale: number;
  textOverflowMode: TextOverflowMode;
  isLinkMode: boolean;
  connectedNoteIds: string[];
  highlightedNoteIds: string[];
  draggedNoteId?: string | null;
  isNoteReadOnly?: (note: StickyNote) => boolean;
  readOnly?: boolean;
}

export function CalendarCell({
  day,
  notes,
  events = [],
  onCellClick,
  onNoteClick,
  onToggleNoteStrikethrough,
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
  isNoteReadOnly,
  readOnly = false,
}: CalendarCellProps) {
  const dateKey = formatDateKey(day.date);
  const isExpandMode = textOverflowMode === "expand";
  const maxEvents = isExpandMode ? 3 : 2;
  const visibleEvents = events.slice(0, maxEvents);
  const hiddenEventCount = Math.max(0, events.length - visibleEvents.length);

  const handleDragOver = (e: React.DragEvent) => {
    if (readOnly) return;
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
    if (readOnly) return;
    // Get the note ID from dataTransfer or from draggedNoteId
    let noteId = draggedNoteId;
    if (!noteId) {
      noteId = e.dataTransfer.getData("text/plain");
    }
    if (noteId) {
      e.preventDefault();
      e.stopPropagation();
      const cell = e.currentTarget as HTMLElement;
      const noteElements = Array.from(cell.querySelectorAll<HTMLElement>("[data-note-id]"));
      const noteIds = noteElements
        .map((el) => el.getAttribute("data-note-id"))
        .filter((v): v is string => typeof v === "string" && v.length > 0);

      let insertIndex = noteIds.length;
      for (let i = 0; i < noteElements.length; i += 1) {
        const rect = noteElements[i].getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        if (e.clientY < midpoint) {
          insertIndex = i;
          break;
        }
      }

      const draggedIndex = noteIds.indexOf(noteId);
      if (draggedIndex !== -1 && insertIndex > draggedIndex) {
        insertIndex -= 1;
      }

      onDrop?.(dateKey, noteId, insertIndex);
    }
  };

  return (
    <div
      data-date-key={dateKey}
      className={cn(
        "calendar-cell min-w-[50px] relative group",
        !readOnly && "cursor-pointer",
        isExpandMode ? "min-h-[60px]" : "h-[60px]",
        day.isWeekend && "bg-calendar-weekend/50",
        day.isToday && "ring-2 ring-inset ring-primary",
        draggedNoteId && "ring-2 ring-primary ring-offset-1 bg-primary/5"
      )}
      onClick={
        readOnly
          ? undefined
          : (e) => {
              e.stopPropagation();
              onCellClick();
            }
      }
      onDragOver={readOnly ? undefined : handleDragOver}
      onDrop={readOnly ? undefined : handleDrop}
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
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "text-xs font-bold",
              day.isToday ? "text-primary" : "text-foreground/70"
            )}
          >
            {day.dayOfMonth}
          </span>
          {!readOnly && (
            <button
              type="button"
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-foreground/10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCellClick();
              }}
              aria-label="Add note"
              title="Add note"
            >
              <Plus className="w-3 h-3 text-foreground/60" />
            </button>
          )}
        </div>
      </div>

      {isExpandMode ? (
        <div className="pt-4 px-1 pb-1 flex flex-col gap-1">
          {visibleEvents.length > 0 && (
            <div className="flex flex-col gap-1">
              {visibleEvents.map((ev) => (
                <GoogleEventItem key={`${ev.calendarId}:${ev.id}:${ev.dayKey}`} event={ev} />
              ))}
              {hiddenEventCount > 0 && (
                <div className="px-1 text-[10px] leading-tight text-muted-foreground">
                  +{hiddenEventCount} more
                </div>
              )}
            </div>
          )}
          {notes.map((note) => (
            <StickyNoteComponent
              key={note.id}
              note={note}
              onDelete={onDeleteNote}
              onClick={() => onNoteClick(note)}
              onToggleStrikethrough={onToggleNoteStrikethrough}
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
              variant="list"
              readOnly={readOnly || (isNoteReadOnly?.(note) ?? false)}
            />
          ))}
        </div>
      ) : notes.length <= 1 ? (
        <div className="absolute left-1 right-1 bottom-1 top-4 flex flex-col gap-1">
          {visibleEvents.map((ev) => (
            <GoogleEventItem
              key={`${ev.calendarId}:${ev.id}:${ev.dayKey}`}
              event={ev}
              compact
            />
          ))}
          {hiddenEventCount > 0 && (
            <div className="px-1 text-[10px] leading-tight text-muted-foreground">
              +{hiddenEventCount} more
            </div>
          )}
          {notes.map((note) => (
            <StickyNoteComponent
              key={note.id}
              note={note}
              onDelete={onDeleteNote}
              onClick={() => onNoteClick(note)}
              onToggleStrikethrough={onToggleNoteStrikethrough}
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
              variant="full"
              readOnly={readOnly || (isNoteReadOnly?.(note) ?? false)}
            />
          ))}
        </div>
      ) : (
        <div className="absolute left-1 right-1 bottom-1 top-4 flex flex-col gap-1">
          {visibleEvents.map((ev) => (
            <GoogleEventItem
              key={`${ev.calendarId}:${ev.id}:${ev.dayKey}`}
              event={ev}
              compact
            />
          ))}
          {hiddenEventCount > 0 && (
            <div className="px-1 text-[10px] leading-tight text-muted-foreground">
              +{hiddenEventCount} more
            </div>
          )}
          {notes.map((note) => (
            <StickyNoteComponent
              key={note.id}
              note={note}
              onDelete={onDeleteNote}
              onClick={() => onNoteClick(note)}
              onToggleStrikethrough={onToggleNoteStrikethrough}
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
              variant="list"
              readOnly={readOnly || (isNoteReadOnly?.(note) ?? false)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
