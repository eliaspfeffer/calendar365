import { useEffect, useRef, useState } from "react";
import { StickyNote } from "@/types/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StickyNoteComponent } from "./StickyNoteComponent";
import { TextOverflowMode } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  const [isMobile, setIsMobile] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const userToggledRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      const mobile = mql.matches;
      setIsMobile(mobile);

      if (!mobile) {
        userToggledRef.current = false;
        setIsMinimized(false);
        return;
      }

      if (!userToggledRef.current) {
        setIsMinimized(true);
      }
    };

    apply();
    if (mql.addEventListener) {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }

    mql.addListener(apply);
    return () => mql.removeListener(apply);
  }, []);

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
        "inbox-notes-panel fixed shadow-lg border border-border bg-card/90 backdrop-blur-sm z-50 touch-auto",
        isMobile
          ? "bottom-4 left-4 w-[min(320px,calc(100vw-2rem))]"
          : "bottom-20 right-6 w-[340px]",
        draggedNoteId && "ring-2 ring-primary"
      )}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={cn("flex items-center justify-between px-4 pt-4 pb-3", isMobile && isMinimized && "py-3")}>
        <div>
          <div className={cn("font-display text-xl tracking-wide", isMobile && isMinimized && "flex items-baseline gap-2")}>
            <span>Inbox</span>
            {isMobile && isMinimized && (
              <span className="text-xs font-sans text-muted-foreground">
                {notes.length} {notes.length === 1 ? "note" : "notes"}
              </span>
            )}
          </div>
          {(!isMobile || !isMinimized) && (
            <div className="text-xs text-muted-foreground">
              {notes.length} {notes.length === 1 ? "note" : "notes"} (undated)
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" onClick={onNewNote}>
            New
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={() => {
              userToggledRef.current = true;
              setIsMinimized((v) => !v);
            }}
            aria-label={isMinimized ? "Expand inbox" : "Minimize inbox"}
          >
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {(!isMobile || !isMinimized) && (
        <div className="px-4 pb-4">
          {notes.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Add a note here, or drag one off the calendar to park it without a date.
            </div>
          ) : (
            <ScrollArea className="max-h-[280px] max-md:max-h-[40vh] pr-3">
              <div className="space-y-0">
                {notes.map((note) => (
                  <StickyNoteComponent
                    key={note.id}
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
                    variant="list"
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </Card>
  );
}
