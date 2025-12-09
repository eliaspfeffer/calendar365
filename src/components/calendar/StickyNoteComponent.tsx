import { StickyNote, StickyColor } from '@/types/calendar';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickyNoteComponentProps {
  note: StickyNote;
  onDelete: (id: string) => void;
  onClick: () => void;
  scale: number;
}

const colorClasses: Record<StickyColor, string> = {
  yellow: 'bg-sticky-yellow',
  pink: 'bg-sticky-pink',
  green: 'bg-sticky-green',
  blue: 'bg-sticky-blue',
  orange: 'bg-sticky-orange',
  purple: 'bg-sticky-purple',
};

export function StickyNoteComponent({ note, onDelete, onClick, scale }: StickyNoteComponentProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(note.id);
  };

  return (
    <div
      className={cn(
        'sticky-note absolute inset-1 p-1 rounded-sm cursor-pointer animate-pop-in group overflow-hidden',
        colorClasses[note.color]
      )}
      onClick={onClick}
      style={{
        fontSize: `${Math.max(8, 10 * scale)}px`,
      }}
    >
      <button
        onClick={handleDelete}
        className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-black/10 rounded-full"
        style={{ fontSize: `${Math.max(10, 12 * scale)}px` }}
      >
        <X className="w-3 h-3 text-foreground/60" />
      </button>
      <p
        className="font-medium text-foreground/80 leading-tight line-clamp-3 pr-3"
        style={{ wordBreak: 'break-word' }}
      >
        {note.text}
      </p>
    </div>
  );
}
