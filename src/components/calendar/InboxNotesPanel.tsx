import { StickyNote } from "@/types/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StickyNoteComponent } from "./StickyNoteComponent";
import { TextOverflowMode } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

interface InboxNotesPanelProps {
  notes: StickyNote[];
  onNewNote: () => void;
  onNoteClick: (note: StickyNote) => void;
  onDeleteNote: (id: string) => void;
  onNoteHover: (noteId: string | null) => void;
  onDropToInbox: (noteId: string) => void;
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
  onNoteDragStart,
  onNoteDragEnd,
  draggedNoteId,
  textOverflowMode,
}: InboxNotesPanelProps) {
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
        "fixed bottom-24 right-6 w-[340px] shadow-lg border border-border bg-card/90 backdrop-blur-sm z-50",
        draggedNoteId && "ring-2 ring-primary"
      )}
      onMouseDown={(e) => e.stopPropagation()}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <div className="font-display text-xl tracking-wide">Inbox</div>
          <div className="text-xs text-muted-foreground">
            {notes.length} {notes.length === 1 ? "note" : "notes"} (undated)
          </div>
        </div>
        <Button size="sm" onClick={onNewNote}>
          New
        </Button>
      </div>

      <div className="px-4 pb-4">
        {notes.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Add a note here, or drag one off the calendar to park it without a date.
          </div>
        ) : (
          <ScrollArea className="h-[280px] pr-3">
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
