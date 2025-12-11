import { StickyNote, StickyColor } from '@/types/calendar';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TextOverflowMode } from '@/hooks/useSettings';

interface StickyNoteComponentProps {
  note: StickyNote;
  onDelete: (id: string) => void;
  onClick: () => void;
  scale: number;
  textOverflowMode: TextOverflowMode;
}

const colorClasses: Record<StickyColor, string> = {
  yellow: 'bg-sticky-yellow',
  pink: 'bg-sticky-pink',
  green: 'bg-sticky-green',
  blue: 'bg-sticky-blue',
  orange: 'bg-sticky-orange',
  purple: 'bg-sticky-purple',
};

export function StickyNoteComponent({ note, onDelete, onClick, scale, textOverflowMode }: StickyNoteComponentProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(note.id);
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
      className={cn(
        'sticky-note absolute inset-1 p-1 rounded-sm cursor-pointer animate-pop-in group',
        colorClasses[note.color],
        getOverflowStyles()
      )}
      onClick={onClick}
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
