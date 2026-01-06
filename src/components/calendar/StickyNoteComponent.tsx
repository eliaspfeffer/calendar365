import { useRef } from "react";
import { StickyNote, StickyColor } from "@/types/calendar";
import { X, Link } from "lucide-react";
import { cn } from "@/lib/utils";
import { TextOverflowMode } from "@/hooks/useSettings";

interface StickyNoteComponentProps {
  note: StickyNote;
  onDelete: (id: string) => void;
  onClick: () => void;
  onToggleStrikethrough?: (noteId: string, next: boolean) => void;
  onHover: (noteId: string | null) => void;
  onLinkClick?: (noteId: string) => void;
  onDragStart?: (noteId: string, e: React.DragEvent) => void;
  onDragEnd?: () => void;
  scale: number;
  textOverflowMode: TextOverflowMode;
  isLinkMode: boolean;
  isConnected: boolean;
  isHighlighted: boolean;
  isDragging?: boolean;
  variant?: "full" | "list";
  readOnly?: boolean;
}

const colorClasses: Record<StickyColor, string> = {
  yellow: "bg-sticky-yellow",
  pink: "bg-sticky-pink",
  green: "bg-sticky-green",
  blue: "bg-sticky-blue",
  orange: "bg-sticky-orange",
  purple: "bg-sticky-purple",
};

export function StickyNoteComponent({
  note,
  onDelete,
  onClick,
  onToggleStrikethrough,
  onHover,
  onLinkClick,
  onDragStart,
  onDragEnd,
  scale,
  textOverflowMode,
  isLinkMode,
  isConnected,
  isHighlighted,
  isDragging = false,
  variant = "full",
  readOnly = false,
}: StickyNoteComponentProps) {
  const hasDraggedRef = useRef(false);

  // Counteract zoomed-out scales so note text stays legible without growing the note itself
  const getReadableFontSize = () => {
    const baseSize = 12;
    if (scale < 1) {
      const compensated = baseSize / scale;
      return Math.min(28, Math.max(baseSize, compensated));
    }
    return baseSize;
  };

  const getReadableIconSize = () => {
    const baseSize = 12;
    if (scale < 1) {
      const compensated = baseSize / scale;
      return Math.min(20, Math.max(baseSize, compensated));
    }
    return baseSize;
  };

  const noteFontSize = getReadableFontSize();
  const iconFontSize = getReadableIconSize();

  const handleDelete = (e: React.MouseEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    onDelete(note.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (readOnly) return;
    // Prevent click if we just dragged
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!isLinkMode && e.altKey && onToggleStrikethrough) {
      e.preventDefault();
      e.stopPropagation();
      onToggleStrikethrough(note.id, !note.is_struck);
      return;
    }
    if (isLinkMode && onLinkClick) {
      e.stopPropagation();
      onLinkClick(note.id);
    } else {
      e.stopPropagation();
      onClick();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent panning when clicking on a note (unless it's the delete button)
    if (!isLinkMode && !(e.target as HTMLElement).closest("button")) {
      e.stopPropagation();
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (readOnly) {
      e.preventDefault();
      return;
    }
    if (isLinkMode) {
      e.preventDefault();
      return;
    }
    hasDraggedRef.current = false;
    e.stopPropagation();
    // Set data transfer before calling onDragStart
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", note.id);
    onDragStart?.(note.id, e);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    hasDraggedRef.current = true;
    // Reset after a short delay to allow click prevention
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 100);
    onDragEnd?.();
  };

  const getOverflowStyles = () => {
    switch (textOverflowMode) {
      case "scroll":
        return "overflow-y-auto max-h-[80px]";
      case "truncate":
        return "overflow-hidden";
      case "expand":
      default:
        return "overflow-visible";
    }
  };

  const getTextStyles = () => {
    switch (textOverflowMode) {
      case "truncate":
        return "line-clamp-2";
      case "scroll":
      case "expand":
      default:
        return "";
    }
  };

  return (
    <div
      data-note-id={note.id}
      draggable={!readOnly && !isLinkMode}
      className={cn(
        "sticky-note rounded-sm cursor-pointer animate-pop-in group",
        variant === "full" ? "absolute inset-1 p-1" : "relative w-full p-1",
        colorClasses[note.color],
        getOverflowStyles(),
        isLinkMode && "ring-2 ring-primary ring-offset-1 cursor-crosshair",
        !readOnly && !isLinkMode && !isDragging && "cursor-grab",
        readOnly && "cursor-default",
        isHighlighted && "ring-2 ring-primary shadow-lg shadow-primary/30",
        isDragging && "opacity-50 cursor-grabbing z-50"
      )}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onMouseEnter={() => onHover(note.id)}
      onMouseLeave={() => onHover(null)}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        fontSize: `${noteFontSize}px`,
        lineHeight: 1.2,
        letterSpacing: "-0.01em",
        userSelect: readOnly ? "text" : "none",
        WebkitUserSelect: readOnly ? "text" : "none",
      }}
    >
      {!readOnly && (
        <button
          onClick={handleDelete}
          className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-black/10 rounded-full z-10"
          style={{ fontSize: `${iconFontSize}px` }}
        >
          <X className={cn("text-foreground/60", "w-3 h-3")} />
        </button>
      )}
      {variant === "full" && isConnected && (
        <div className="absolute bottom-0.5 right-0.5">
          <Link className="w-2.5 h-2.5 text-foreground/40" />
        </div>
      )}
      <p
        className={cn(
          "font-medium text-foreground/90 leading-tight pr-3",
          note.is_struck && "line-through text-foreground/60",
          getTextStyles()
        )}
        style={{ wordBreak: "break-word" }}
      >
        {note.text}
      </p>
    </div>
  );
}
