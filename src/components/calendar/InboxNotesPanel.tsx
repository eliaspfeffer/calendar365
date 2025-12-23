import { StickyNote } from "@/types/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StickyNoteComponent } from "./StickyNoteComponent";
import { TextOverflowMode } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface InboxNotesPanelProps {
  notes: StickyNote[];
  onNewNote: () => void;
  onNoteClick: (note: StickyNote) => void;
  onDeleteNote: (id: string) => void;
  onNoteHover: (noteId: string | null) => void;
  onDropToInbox: (noteId: string) => void;
  onClose: () => void;
  width: number;
  onWidthChange: (width: number) => void;
  onNoteDragStart?: (noteId: string, e: React.DragEvent) => void;
  onNoteDragEnd?: () => void;
  draggedNoteId?: string | null;
  textOverflowMode: TextOverflowMode;
}

export function InboxNotesPanel({
  notes,
  onNewNote,
  onNoteClick,
  onDeleteNote,
  onNoteHover,
  onDropToInbox,
  onClose,
  width,
  onWidthChange,
  onNoteDragStart,
  onNoteDragEnd,
  draggedNoteId,
  textOverflowMode,
}: InboxNotesPanelProps) {
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  const clampWidth = useCallback((nextWidth: number) => {
    return Math.max(260, Math.min(640, nextWidth));
  }, []);

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      resizeStartRef.current = { x: e.clientX, width };
      setIsResizing(true);
    },
    [width]
  );

  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isResizing || !resizeStartRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      // Panel is anchored to the right; dragging left edge left increases width.
      const delta = resizeStartRef.current.x - e.clientX;
      onWidthChange(clampWidth(resizeStartRef.current.width + delta));
    },
    [clampWidth, isResizing, onWidthChange]
  );

  const handleResizePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isResizing) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(false);
    resizeStartRef.current = null;
  }, [isResizing]);

  const handleDragOver = (e: React.DragEvent) => {
    const types = e.dataTransfer.types;
    if (types.includes("text/plain") || draggedNoteId) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    let noteId = draggedNoteId;
    if (!noteId) {
      noteId = e.dataTransfer.getData("text/plain");
    }
    if (!noteId) return;
    e.preventDefault();
    e.stopPropagation();
    onDropToInbox(noteId);
  };

  return (
    <Card
      className={cn(
        "inbox-notes-panel fixed top-20 right-4 bottom-4 shadow-lg border border-border bg-card/90 backdrop-blur-sm z-50 flex flex-col",
        draggedNoteId && "ring-2 ring-primary",
        isResizing && "select-none"
      )}
      style={{ width }}
      onMouseDown={(e) => e.stopPropagation()}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        className="absolute left-0 top-0 h-full w-2 cursor-ew-resize"
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerCancel={handleResizePointerUp}
        aria-label="Resize inbox"
        role="separator"
      />

      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <div className="font-display text-xl tracking-wide">Inbox</div>
          <div className="text-xs text-muted-foreground">
            {notes.length} {notes.length === 1 ? "note" : "notes"} (undated)
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onNewNote}>
            New
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            title="Hide inbox"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="px-4 pb-4 flex-1 min-h-0">
        {notes.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Add a note here, or drag one off the calendar to park it without a date.
          </div>
        ) : (
          <ScrollArea className="h-full pr-3">
            <div className="space-y-2">
              {notes.map((note) => (
                <div key={note.id} className="relative h-[86px]">
                  <StickyNoteComponent
                    note={note}
                    onDelete={onDeleteNote}
                    onClick={() => onNoteClick(note)}
                    onHover={onNoteHover}
                    scale={1}
                    textOverflowMode={textOverflowMode}
                    isLinkMode={false}
                    isConnected={false}
                    isHighlighted={false}
                    onDragStart={onNoteDragStart}
                    onDragEnd={onNoteDragEnd}
                    isDragging={draggedNoteId === note.id}
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </Card>
  );
}
