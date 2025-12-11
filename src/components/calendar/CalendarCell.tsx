import { CalendarDay, StickyNote } from '@/types/calendar';
import { StickyNoteComponent } from './StickyNoteComponent';
import { cn } from '@/lib/utils';
import { TextOverflowMode } from '@/hooks/useSettings';

interface CalendarCellProps {
  day: CalendarDay;
  notes: StickyNote[];
  onCellClick: () => void;
  onNoteClick: (note: StickyNote) => void;
  onDeleteNote: (id: string) => void;
  scale: number;
  textOverflowMode: TextOverflowMode;
}

export function CalendarCell({
  day,
  notes,
  onCellClick,
  onNoteClick,
  onDeleteNote,
  scale,
  textOverflowMode,
}: CalendarCellProps) {
  const hasNote = notes.length > 0;

  return (
    <div
      className={cn(
        'calendar-cell min-w-[50px] relative cursor-pointer',
        textOverflowMode === 'expand' ? 'min-h-[60px]' : 'h-[60px]',
        day.isWeekend && 'bg-calendar-weekend/50',
        day.isToday && 'ring-2 ring-inset ring-primary'
      )}
      onClick={!hasNote ? onCellClick : undefined}
    >
      <div className="absolute top-0.5 left-1 right-1 flex items-center justify-between z-10">
        <span
          className={cn(
            'text-[10px] font-semibold uppercase',
            day.isWeekend ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {day.dayOfWeek}
        </span>
        <span
          className={cn(
            'text-xs font-bold',
            day.isToday ? 'text-primary' : 'text-foreground/70'
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
          scale={scale}
          textOverflowMode={textOverflowMode}
        />
      ))}
    </div>
  );
}
