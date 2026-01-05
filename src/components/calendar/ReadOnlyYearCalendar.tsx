import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCalendarData, formatDateKey } from "@/hooks/useCalendarData";
import { useZoomPan } from "@/hooks/useZoomPan";
import { CalendarCell } from "./CalendarCell";
import { ZoomControls } from "./ZoomControls";
import { ConnectionLines } from "./ConnectionLines";
import { StickyNoteComponent } from "./StickyNoteComponent";
import type { StickyNote, NoteConnection } from "@/types/calendar";
import type { CalendarColor, TextOverflowMode } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

interface ReadOnlyYearCalendarProps {
  years: number[];
  notes: StickyNote[];
  connections: NoteConnection[];
  textOverflowMode: TextOverflowMode;
  calendarColor?: CalendarColor;
  alwaysShowArrows?: boolean;
}

function SingleYearGridReadOnly({
  year,
  scale,
  getNotesByDate,
  onNoteHover,
  connectedNoteIds,
  highlightedNoteIds,
  textOverflowMode,
}: {
  year: number;
  scale: number;
  getNotesByDate: (date: string) => StickyNote[];
  onNoteHover: (noteId: string | null) => void;
  connectedNoteIds: string[];
  highlightedNoteIds: string[];
  textOverflowMode: TextOverflowMode;
}) {
  const { calendarData, months } = useCalendarData(year);
  const maxDays = Math.max(...calendarData.map((month) => month.length));

  return (
    <div className="year-calendar-grid inline-block bg-card shadow-2xl min-w-max">
      <div className="bg-calendar-header px-8 py-6">
        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-primary-foreground tracking-wider text-center">
          THE BIG A## CALENDAR {year}
        </h1>
      </div>

      <div className="p-4">
        {calendarData.map((monthDays, monthIndex) => (
          <div key={monthIndex} className="flex">
            <div className="w-16 flex-shrink-0 flex items-center justify-center bg-secondary/50 border-b border-r border-calendar-grid">
              <span className="font-display text-2xl text-primary tracking-wide">{months[monthIndex]}</span>
            </div>

            <div className="flex">
              {monthDays.map((day) => (
                <CalendarCell
                  key={formatDateKey(day.date)}
                  day={day}
                  notes={getNotesByDate(formatDateKey(day.date))}
                  onCellClick={() => {}}
                  onNoteClick={() => {}}
                  onDeleteNote={() => {}}
                  onNoteHover={onNoteHover}
                  scale={scale}
                  textOverflowMode={textOverflowMode}
                  isLinkMode={false}
                  connectedNoteIds={connectedNoteIds}
                  highlightedNoteIds={highlightedNoteIds}
                  draggedNoteId={null}
                  readOnly
                />
              ))}

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

export function ReadOnlyYearCalendar({
  years,
  notes,
  connections,
  textOverflowMode,
  calendarColor,
  alwaysShowArrows = false,
}: ReadOnlyYearCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { scale, translateX, translateY, handleWheel, handlePointerDown, zoomIn, zoomOut, resetView, setView, isDragging } =
    useZoomPan();

  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const didAutoFocusTodayRef = useRef(false);

  const notesByDate = useMemo(() => {
    const map = new Map<string, StickyNote[]>();
    for (const note of notes) {
      if (!note.date) continue;
      const key = note.date;
      const prev = map.get(key);
      if (prev) prev.push(note);
      else map.set(key, [note]);
    }
    return map;
  }, [notes]);

  const getNotesByDate = useCallback((date: string) => notesByDate.get(date) ?? [], [notesByDate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    if (didAutoFocusTodayRef.current) return;
    if (Math.abs(translateX) > 0.5 || Math.abs(translateY) > 0.5) return;

    const today = new Date();
    if (!years.includes(today.getFullYear())) return;

    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const todayKey = formatDateKey(today);
    const cell = content.querySelector<HTMLElement>(`[data-date-key="${todayKey}"]`);
    if (!cell) return;

    didAutoFocusTodayRef.current = true;
    const raf = requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const cellRect = cell.getBoundingClientRect();
      const desiredX = containerRect.left + containerRect.width / 2;
      const desiredY = containerRect.top + containerRect.height / 2;
      const currentX = cellRect.left + cellRect.width / 2;
      const currentY = cellRect.top + cellRect.height / 2;
      const dx = desiredX - currentX;
      const dy = desiredY - currentY;

      setView((prev) => ({
        ...prev,
        translateX: prev.translateX + dx,
        translateY: prev.translateY + dy,
      }));
    });

    return () => cancelAnimationFrame(raf);
  }, [years, setView, translateX, translateY]);

  const handleContainerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging()) return;
      const target = e.target as HTMLElement;
      if (target.closest(".sticky-note") || target.closest(".zoom-controls")) {
        e.stopPropagation();
        return;
      }
      handlePointerDown(e);
    },
    [handlePointerDown, isDragging]
  );

  const connectedNoteIds = useMemo(() => {
    const ids = connections.flatMap((c) => [c.source_note_id, c.target_note_id]);
    return [...new Set(ids)];
  }, [connections]);

  const connectedByHovered = useMemo(() => {
    if (!hoveredNoteId) return [];
    const out: string[] = [hoveredNoteId];
    for (const c of connections) {
      if (c.source_note_id === hoveredNoteId) out.push(c.target_note_id);
      else if (c.target_note_id === hoveredNoteId) out.push(c.source_note_id);
    }
    return [...new Set(out)];
  }, [connections, hoveredNoteId]);

  const canvasNotes = useMemo(
    () => notes.filter((n) => !n.date && n.pos_x != null && n.pos_y != null),
    [notes]
  );

  const calendarHeaderHsl =
    calendarColor === "blue"
      ? "207 90% 45%"
      : calendarColor === "green"
        ? "142 76% 36%"
        : calendarColor === "purple"
          ? "262 80% 50%"
          : calendarColor === "red"
            ? "0 84% 60%"
            : calendarColor === "orange"
              ? "25 95% 53%"
              : calendarColor === "teal"
                ? "173 80% 40%"
                : calendarColor === "pink"
                  ? "330 81% 60%"
                  : calendarColor === "indigo"
                    ? "231 48% 48%"
                    : "207 90% 45%";

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full h-screen overflow-hidden bg-muted relative cursor-grab active:cursor-grabbing touch-none",
        isDragging() && "cursor-grabbing"
      )}
      style={{ "--calendar-header": calendarHeaderHsl } as React.CSSProperties}
      onPointerDown={handleContainerPointerDown}
    >
      <div
        ref={contentRef}
        className="origin-top-left transition-none relative"
        style={{
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        }}
      >
        <div className="flex flex-col gap-12 p-10">
          {years.map((year) => (
            <SingleYearGridReadOnly
              key={year}
              year={year}
              scale={scale}
              getNotesByDate={getNotesByDate}
              onNoteHover={setHoveredNoteId}
              connectedNoteIds={connectedNoteIds}
              highlightedNoteIds={connectedByHovered}
              textOverflowMode={textOverflowMode}
            />
          ))}
        </div>

        {canvasNotes.length > 0 && (
          <div className="absolute inset-0 z-30">
            {canvasNotes.map((note) => (
              <div
                key={note.id}
                className="absolute"
                style={{ left: note.pos_x as number, top: note.pos_y as number, width: 220, height: 140 }}
              >
                <div className="relative w-full h-full">
                  <StickyNoteComponent
                    note={note}
                    onDelete={() => {}}
                    onClick={() => {}}
                    onHover={setHoveredNoteId}
                    scale={scale}
                    textOverflowMode={textOverflowMode}
                    isLinkMode={false}
                    isConnected={connectedNoteIds.includes(note.id)}
                    isHighlighted={connectedByHovered.includes(note.id)}
                    isDragging={false}
                    variant="full"
                    readOnly
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <ConnectionLines
          connections={connections}
          notes={notes}
          hoveredNoteId={hoveredNoteId}
          showAll={alwaysShowArrows}
          containerRef={contentRef}
        />
      </div>

      <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetView} scale={scale} />
    </div>
  );
}
