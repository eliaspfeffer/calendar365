import { useState, useRef, useEffect, useCallback } from 'react';
import { useCalendarData, formatDateKey } from '@/hooks/useCalendarData';
import { useStickyNotes } from '@/hooks/useStickyNotes';
import { useZoomPan } from '@/hooks/useZoomPan';
import { CalendarCell } from './CalendarCell';
import { NoteDialog } from './NoteDialog';
import { ZoomControls } from './ZoomControls';
import { StickyNote, StickyColor } from '@/types/calendar';

interface SingleYearGridProps {
  year: number;
  scale: number;
  getNotesByDate: (date: string) => StickyNote[];
  onCellClick: (date: Date) => void;
  onNoteClick: (note: StickyNote) => void;
  onDeleteNote: (id: string) => void;
}

function SingleYearGrid({
  year,
  scale,
  getNotesByDate,
  onCellClick,
  onNoteClick,
  onDeleteNote,
}: SingleYearGridProps) {
  const { calendarData, months } = useCalendarData(year);
  const maxDays = Math.max(...calendarData.map((month) => month.length));

  return (
    <div className="inline-block bg-card shadow-2xl min-w-max">
      {/* Header */}
      <div className="bg-calendar-header px-8 py-6">
        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-primary-foreground tracking-wider text-center">
          THE BIG CALENDAR {year}
        </h1>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Month rows */}
        {calendarData.map((monthDays, monthIndex) => (
          <div key={monthIndex} className="flex">
            {/* Month label */}
            <div className="w-16 flex-shrink-0 flex items-center justify-center bg-secondary/50 border-b border-r border-calendar-grid">
              <span className="font-display text-2xl text-primary tracking-wide">
                {months[monthIndex]}
              </span>
            </div>

            {/* Days */}
            <div className="flex">
              {monthDays.map((day) => (
                <CalendarCell
                  key={formatDateKey(day.date)}
                  day={day}
                  notes={getNotesByDate(formatDateKey(day.date))}
                  onCellClick={() => onCellClick(day.date)}
                  onNoteClick={onNoteClick}
                  onDeleteNote={onDeleteNote}
                  scale={scale}
                />
              ))}

              {/* Empty cells to fill up to maxDays */}
              {Array.from({ length: maxDays - monthDays.length }).map((_, i) => (
                <div
                  key={`empty-${monthIndex}-${i}`}
                  className="min-w-[50px] h-[60px] border-r border-b border-calendar-grid bg-muted/30"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface YearCalendarProps {
  years: number[];
}

export function YearCalendar({ years }: YearCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { notes, addNote, updateNote, deleteNote, getNotesByDate } = useStickyNotes();
  const {
    scale,
    translateX,
    translateY,
    handleWheel,
    handleMouseDown,
    zoomIn,
    zoomOut,
    resetView,
  } = useZoomPan();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleCellClick = useCallback((date: Date) => {
    setSelectedDate(formatDateKey(date));
    setEditingNote(null);
    setDialogOpen(true);
  }, []);

  const handleNoteClick = useCallback((note: StickyNote) => {
    setSelectedDate(note.date);
    setEditingNote(note);
    setDialogOpen(true);
  }, []);

  const handleSaveNote = useCallback(
    (text: string, color: StickyColor) => {
      if (editingNote) {
        updateNote(editingNote.id, text, color);
      } else if (selectedDate) {
        addNote(selectedDate, text, color);
      }
    },
    [editingNote, selectedDate, addNote, updateNote]
  );

  const handleDeleteNote = useCallback(() => {
    if (editingNote) {
      deleteNote(editingNote.id);
      setDialogOpen(false);
    }
  }, [editingNote, deleteNote]);

  return (
    <div
      ref={containerRef}
      className="w-full h-screen overflow-hidden bg-muted cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
    >
      <div
        className="origin-top-left transition-none"
        style={{
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        }}
      >
        {/* Multiple Year Calendars */}
        <div className="flex flex-col gap-12 p-10">
          {years.map((year) => (
            <SingleYearGrid
              key={year}
              year={year}
              scale={scale}
              getNotesByDate={getNotesByDate}
              onCellClick={handleCellClick}
              onNoteClick={handleNoteClick}
              onDeleteNote={deleteNote}
            />
          ))}
        </div>
      </div>

      <ZoomControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetView}
        scale={scale}
      />

      <NoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={selectedDate}
        existingNote={editingNote}
        onSave={handleSaveNote}
        onDelete={editingNote ? handleDeleteNote : undefined}
      />
    </div>
  );
}
