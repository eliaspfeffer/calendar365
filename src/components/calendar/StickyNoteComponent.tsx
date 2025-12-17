import { StickyNote, StickyColor } from '@/types/calendar';
import { X, Link } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TextOverflowMode } from '@/hooks/useSettings';

interface StickyNoteComponentProps {
  note: StickyNote;
  onDelete: (id: string) => void;
  onClick: () => void;
  onHover: (noteId: string | null) => void;
  onLinkClick?: (noteId: string) => void;
  scale: number;
  textOverflowMode: TextOverflowMode;
  isLinkMode: boolean;
  isConnected: boolean;
  isHighlighted: boolean;
}

const colorClasses: Record<StickyColor, string> = {
  yellow: 'bg-sticky-yellow',
  pink: 'bg-sticky-pink',
  green: 'bg-sticky-green',
  blue: 'bg-sticky-blue',
  orange: 'bg-sticky-orange',
  purple: 'bg-sticky-purple',
};

export function StickyNoteComponent({
  note,
  onDelete,
  onClick,
  onHover,
  onLinkClick,
  scale,
  textOverflowMode,
  isLinkMode,
  isConnected,
  isHighlighted,
}: StickyNoteComponentProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(note.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLinkMode && onLinkClick) {
      e.stopPropagation();
      onLinkClick(note.id);
    } else {
      onClick();
    }
  };

  const getOverflowStyles = () => {
    switch (textOverflowMode) {
      case 'scroll':
        return 'overflow-y-auto max-h-[80px]';
      case 'truncate':
        return 'overflow-hidden';
      case 'expand':
      default:
        return 'overflow-visible';
    }
  };

  const getTextStyles = () => {
    switch (textOverflowMode) {
      case 'truncate':
        return 'line-clamp-2';
      case 'scroll':
      case 'expand':
      default:
        return '';
    }
  };

  return (
    <div
      data-note-id={note.id}
      className={cn(
        'sticky-note absolute inset-1 p-1 rounded-sm cursor-pointer animate-pop-in group',
        colorClasses[note.color],
        getOverflowStyles(),
        isLinkMode && 'ring-2 ring-primary ring-offset-1 cursor-crosshair',
        isHighlighted && 'ring-2 ring-primary shadow-lg shadow-primary/30'
      )}
      onClick={handleClick}
      onMouseEnter={() => onHover(note.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        fontSize: `${Math.max(8, 10 * scale)}px`,
      }}
    >
      <button
        onClick={handleDelete}
        className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-black/10 rounded-full z-10"
        style={{ fontSize: `${Math.max(10, 12 * scale)}px` }}
      >
        <X className="w-3 h-3 text-foreground/60" />
      </button>
      {isConnected && (
        <div className="absolute bottom-0.5 right-0.5">
          <Link className="w-2.5 h-2.5 text-foreground/40" />
        </div>
      )}
      <p
        className={cn(
          'font-medium text-foreground/80 leading-tight pr-3',
          getTextStyles()
        )}
        style={{ wordBreak: 'break-word' }}
      >
        {note.text}
      </p>
    </div>
  );
}
