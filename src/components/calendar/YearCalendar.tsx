import { useState, useRef, useEffect, useCallback } from "react";
import { useCalendarData, formatDateKey } from "@/hooks/useCalendarData";
import { useStickyNotes } from "@/hooks/useStickyNotes";
import { useNoteConnections } from "@/hooks/useNoteConnections";
import { useZoomPan } from "@/hooks/useZoomPan";
import { CalendarCell } from "./CalendarCell";
import { NoteDialog } from "./NoteDialog";
import { ZoomControls } from "./ZoomControls";
import { ConnectionLines } from "./ConnectionLines";
import { InboxNotesPanel } from "./InboxNotesPanel";
import { StickyNoteComponent } from "./StickyNoteComponent";
import { StickyNote, StickyColor } from "@/types/calendar";
import { CalendarColor, TextOverflowMode } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { EyeOff, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { coerceStickyColor } from "@/lib/stickyNoteColors";
import type { GoogleCalendarDayEvent } from "@/types/googleCalendar";

interface SingleYearGridProps {
  year: number;
  scale: number;
  getNotesByDate: (date: string) => StickyNote[];
  getEventsByDate?: (date: string) => GoogleCalendarDayEvent[];
  onCellClick: (date: Date) => void;
  onNoteClick: (note: StickyNote) => void;
  onDeleteNote: (id: string) => void;
  onNoteHover: (noteId: string | null) => void;
  onLinkClick?: (noteId: string) => void;
  onNoteDragStart?: (noteId: string, e: React.DragEvent) => void;
  onNoteDragEnd?: () => void;
  onDrop?: (date: string, noteId: string) => void;
  onDragOver?: (e: React.DragEvent) => void;
  textOverflowMode: TextOverflowMode;
  isLinkMode: boolean;
  connectedNoteIds: string[];
  highlightedNoteIds: string[];
  draggedNoteId?: string | null;
  readOnly?: boolean;
}

function SingleYearGrid({
  year,
  scale,
  getNotesByDate,
  getEventsByDate,
  onCellClick,
  onNoteClick,
  onDeleteNote,
  onNoteHover,
  onLinkClick,
  onNoteDragStart,
  onNoteDragEnd,
  onDrop,
  onDragOver,
  textOverflowMode,
  isLinkMode,
  connectedNoteIds,
  highlightedNoteIds,
  draggedNoteId,
  readOnly = false,
}: SingleYearGridProps) {
  const { calendarData, months } = useCalendarData(year);
  const maxDays = Math.max(...calendarData.map((month) => month.length));

  return (
    <div
      className="year-calendar-grid inline-block bg-card shadow-2xl min-w-max"
      data-year={year}
    >
      {/* Header */}
      <div className="bg-calendar-header px-8 py-6">
        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-primary-foreground tracking-wider text-center">
          THE BIG A## CALENDAR {year}
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
                  events={getEventsByDate?.(formatDateKey(day.date)) ?? []}
                  onCellClick={() => onCellClick(day.date)}
                  onNoteClick={onNoteClick}
                  onDeleteNote={onDeleteNote}
                  onNoteHover={onNoteHover}
                  onLinkClick={onLinkClick}
                  onNoteDragStart={onNoteDragStart}
                  onNoteDragEnd={onNoteDragEnd}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  scale={scale}
                  textOverflowMode={textOverflowMode}
                  isLinkMode={isLinkMode}
                  connectedNoteIds={connectedNoteIds}
                  highlightedNoteIds={highlightedNoteIds}
                  draggedNoteId={draggedNoteId}
                  readOnly={readOnly}
                />
              ))}

              {/* Empty cells to fill up to maxDays */}
              {Array.from({ length: maxDays - monthDays.length }).map(
                (_, i) => (
                  <div
                    key={`empty-${monthIndex}-${i}`}
                    className="min-w-[50px] h-[60px] border-r border-b border-calendar-grid bg-muted/30"
                  />
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface YearCalendarProps {
  years: number[];
  userId: string | null;
  visibleCalendarIds: string[] | null;
  activeCalendarId: string | null;
  onAuthRequired?: () => void;
  skipHideYearConfirm?: boolean;
  onSkipHideYearConfirmChange?: (skip: boolean) => void;
  onAddYear?: () => void;
  onRemoveLastYear?: () => void;
  textOverflowMode: TextOverflowMode;
  calendarColor?: CalendarColor;
  alwaysShowArrows?: boolean;
  showInbox?: boolean;
  calendarOptions?: Array<{ id: string; name: string }>;
  calendarDefaultNoteColorById?: Record<string, StickyColor>;
  googleEventsByDate?: Record<string, GoogleCalendarDayEvent[]> | null;
}

export function YearCalendar({
  years,
  userId,
  visibleCalendarIds,
  activeCalendarId,
  onAuthRequired,
  skipHideYearConfirm = false,
  onSkipHideYearConfirmChange,
  onAddYear,
  onRemoveLastYear,
  textOverflowMode,
  calendarColor,
  alwaysShowArrows = false,
  showInbox = true,
  calendarOptions,
  calendarDefaultNoteColorById,
  googleEventsByDate,
}: YearCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const suppressNextCanvasClickRef = useRef(false);
  const [minScale, setMinScale] = useState(0.3);
  const {
    notes,
    addNote,
    updateNote,
    moveNote,
    moveNoteToCanvas,
    deleteNote,
    getNotesByDate,
  } = useStickyNotes(userId, visibleCalendarIds, activeCalendarId);
  const {
    connections,
    addConnection,
    getConnectedNotes,
    getConnectionsForNote,
  } = useNoteConnections(userId, visibleCalendarIds, activeCalendarId);
  const { toast } = useToast();
  const {
    scale,
    translateX,
    translateY,
    handleWheel,
    handlePointerDown,
    zoomIn,
    zoomOut,
    resetView,
    setView,
    isDragging,
  } = useZoomPan({ minScale });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [linkSourceNoteId, setLinkSourceNoteId] = useState<string | null>(null);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [newNotePosition, setNewNotePosition] = useState<{ x: number; y: number } | null>(null);
  const [newNoteCalendarId, setNewNoteCalendarId] = useState<string | null>(activeCalendarId);
  const didAutoFocusTodayRef = useRef(false);
  const [yearBeingHidden, setYearBeingHidden] = useState<number | null>(null);
  const focusAfterYearChangeRef = useRef(false);
  const [hideYearDialogOpen, setHideYearDialogOpen] = useState(false);
  const [hideYearDialogDontShowAgain, setHideYearDialogDontShowAgain] = useState(false);

  const inboxNotes = notes.filter((n) => !n.date && (n.pos_x == null || n.pos_y == null));
  const canvasNotes = notes.filter((n) => !n.date && n.pos_x != null && n.pos_y != null);

  const getGoogleEventsByDate = useCallback(
    (dateKey: string) => googleEventsByDate?.[dateKey] ?? [],
    [googleEventsByDate]
  );

  useEffect(() => {
    const container = containerRef.current;
    const grid = gridRef.current;
    if (!container || !grid) return;

    const computeMinScale = () => {
      const rect = container.getBoundingClientRect();
      const contentWidth = grid.scrollWidth;
      const contentHeight = grid.scrollHeight;
      if (!contentWidth || !contentHeight) return;

      const topControls = Array.from(document.querySelectorAll("[data-top-controls]"));
      let reservedTop = 0;
      for (const el of topControls) {
        if (!(el instanceof HTMLElement)) continue;
        const r = el.getBoundingClientRect();
        reservedTop = Math.max(reservedTop, r.bottom);
      }

      const bottomControls = Array.from(
        document.querySelectorAll(showInbox ? ".zoom-controls, .inbox-notes-panel" : ".zoom-controls")
      );
      let reservedBottom = 0;
      for (const el of bottomControls) {
        if (!(el instanceof HTMLElement)) continue;
        const r = el.getBoundingClientRect();
        reservedBottom = Math.max(reservedBottom, window.innerHeight - r.top);
      }

      const padding = 24;
      const availableWidth = Math.max(1, rect.width - padding);
      const availableHeight = Math.max(1, rect.height - reservedTop - reservedBottom - padding);

      const fitScale = Math.min(1, availableWidth / contentWidth, availableHeight / contentHeight);
      const nextMinScale = Math.max(0.05, Math.min(0.3, fitScale));

      setMinScale(nextMinScale);
    };

    computeMinScale();

    const ro = new ResizeObserver(() => computeMinScale());
    ro.observe(container);
    ro.observe(grid);

    window.addEventListener("resize", computeMinScale);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", computeMinScale);
    };
  }, [years.length]);

  useEffect(() => {
    if (dialogOpen) return;
    if (editingNote) return;
    setNewNoteCalendarId(activeCalendarId);
  }, [activeCalendarId, dialogOpen, editingNote]);

  // Track Command/Meta key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        setIsLinkMode(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        setIsLinkMode(false);
        setLinkSourceNoteId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    if (didAutoFocusTodayRef.current) return;
    // Avoid overriding user panning if they've already moved the view.
    if (Math.abs(translateX) > 0.5 || Math.abs(translateY) > 0.5) return;

    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) return;

    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const yearEl = content.querySelector<HTMLElement>(`[data-year="${currentYear}"]`);
    if (!yearEl) return;

    didAutoFocusTodayRef.current = true;
    const raf = requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const yearRect = yearEl.getBoundingClientRect();
      const margin = 32;
      const desiredX = containerRect.left + margin;
      const desiredY = containerRect.top + margin;
      const currentX = yearRect.left;
      const currentY = yearRect.top;
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

  const focusOnYear = useCallback(
    (year: number) => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;

      const yearEl = content.querySelector<HTMLElement>(`[data-year="${year}"]`);
      if (!yearEl) return;

      const raf = requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        const yearRect = yearEl.getBoundingClientRect();
        const margin = 32;
        const desiredX = containerRect.left + margin;
        const desiredY = containerRect.top + margin;
        const dx = desiredX - yearRect.left;
        const dy = desiredY - yearRect.top;

        setView((prev) => ({
          ...prev,
          translateX: prev.translateX + dx,
          translateY: prev.translateY + dy,
        }));
      });

      return () => cancelAnimationFrame(raf);
    },
    [setView],
  );

  useEffect(() => {
    if (!focusAfterYearChangeRef.current) return;
    focusAfterYearChangeRef.current = false;
    const last = years[years.length - 1];
    if (!last) return;
    focusOnYear(last);
  }, [years, focusOnYear]);

  const beginHideLastYear = useCallback(
    (options?: { showUndoToast?: boolean }) => {
      if (!onRemoveLastYear) return;
      const last = years[years.length - 1];
      if (!last) return;

      focusAfterYearChangeRef.current = true;
      setYearBeingHidden(last);

      window.setTimeout(() => {
        onRemoveLastYear();
        setYearBeingHidden(null);

        if (options?.showUndoToast && onAddYear) {
          toast({
            title: `Year ${last} hidden`,
            description: "You can add it back any time.",
            action: (
              <ToastAction altText="Undo" onClick={() => onAddYear()}>
                Undo
              </ToastAction>
            ),
          });
        }
      }, 520);
    },
    [onRemoveLastYear, years, onAddYear, toast],
  );

  const getContentPointFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      const x = (clientX - rect.left - translateX) / scale;
      const y = (clientY - rect.top - translateY) / scale;
      return { x, y };
    },
    [scale, translateX, translateY]
  );

  const handleCellClick = useCallback(
    (date: Date) => {
      if (isDragging()) return;
      if (isLinkMode) return; // Don't open dialog in link mode
      if (draggedNoteId) return; // Don't open dialog while dragging
      if (!userId) {
        onAuthRequired?.();
        return;
      }
      setSelectedDate(formatDateKey(date));
      setEditingNote(null);
      setNewNoteCalendarId(activeCalendarId ?? visibleCalendarIds?.[0] ?? null);
      setDialogOpen(true);
    },
    [userId, onAuthRequired, isDragging, isLinkMode, draggedNoteId, activeCalendarId, visibleCalendarIds]
  );

  const handleNoteClick = useCallback(
    (note: StickyNote) => {
      if (isDragging()) return;
      if (isLinkMode) return; // Handled by onLinkClick
      if (draggedNoteId) return; // Don't open dialog if we just dragged
      if (!userId) {
        onAuthRequired?.();
        return;
      }
      setSelectedDate(note.date ?? null);
      setEditingNote(note);
      setDialogOpen(true);
    },
    [isDragging, isLinkMode, draggedNoteId, onAuthRequired, userId]
  );

  const handleInboxNoteClick = useCallback(
    (note: StickyNote) => {
      if (isDragging()) return;
      if (draggedNoteId) return;
      if (!userId) {
        onAuthRequired?.();
        return;
      }
      setSelectedDate(note.date ?? null);
      setEditingNote(note);
      setDialogOpen(true);
    },
    [isDragging, draggedNoteId, onAuthRequired, userId]
  );

  const handleLinkClick = useCallback(
    (noteId: string) => {
      if (!userId) {
        onAuthRequired?.();
        return;
      }
      const note = notes.find((n) => n.id === noteId);
      if (!note?.date) {
        toast({
          title: "Todo List note",
          description: "Assign a date before linking notes.",
        });
        return;
      }
      if (!linkSourceNoteId) {
        // First note selected
        setLinkSourceNoteId(noteId);
        toast({
          title: "Link mode",
          description:
            "Now click another note to connect them (or the same note to cancel)",
        });
      } else if (linkSourceNoteId === noteId) {
        // Same note clicked, cancel
        setLinkSourceNoteId(null);
        toast({
          title: "Link cancelled",
        });
      } else {
        const sourceNote = notes.find((n) => n.id === linkSourceNoteId);
        if (!sourceNote?.date) {
          setLinkSourceNoteId(null);
          toast({
            title: "Todo List note",
            description: "Assign a date before linking notes.",
          });
          return;
        }
        if (sourceNote.calendar_id !== note.calendar_id) {
          setLinkSourceNoteId(null);
          toast({
            title: "Different calendars",
            description: "You can only link notes within the same calendar.",
          });
          return;
        }
        // Second note selected, create or remove connection
        addConnection(linkSourceNoteId, noteId, sourceNote.calendar_id ?? null);
        setLinkSourceNoteId(null);
        toast({
          title: "Notes linked!",
          description: "Hover over either note to see the connection.",
        });
      }
    },
    [linkSourceNoteId, addConnection, toast, notes, onAuthRequired, userId]
  );

  const handleNoteHover = useCallback((noteId: string | null) => {
    setHoveredNoteId(noteId);
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  }, []);

  const handleNoteDragStart = useCallback(
    (noteId: string, e: React.DragEvent) => {
      // Set dragged note ID immediately to prevent panning
      setDraggedNoteId(noteId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", noteId);
    },
    []
  );

  const handleNoteDragEnd = useCallback(() => {
    // Small delay to ensure drag end is fully processed
    setTimeout(() => {
      setDraggedNoteId(null);
    }, 0);
  }, []);

  const handleNoteDrop = useCallback(
    async (date: string, noteId: string) => {
      if (!userId) {
        onAuthRequired?.();
        return;
      }
      if (!noteId) {
        setDraggedNoteId(null);
        return;
      }
      const note = notes.find((n) => n.id === noteId);
      if (note && note.date !== date) {
        const moved = await moveNote(noteId, date, connections);
        if (!moved.ok) {
          const err = moved.error;
          const details = err?.message
            ? `${err.message}${err.code ? ` (${err.code})` : ""}`
            : null;
          toast({
            title: "Couldn’t move note",
            description: details
              ? `The change wasn’t saved: ${details}`
              : "The change wasn’t saved. Check your Supabase schema/migrations.",
            action: (
              <ToastAction
                altText="Copy error"
                onClick={() => copyToClipboard(details ?? "Couldn’t move note (no error details).")}
              >
                Copy error
              </ToastAction>
            ),
            variant: "destructive",
          });
          setDraggedNoteId(null);
          return;
        }
        toast({
          title: "Note moved",
          description: `Note moved to ${new Date(date).toLocaleDateString()}`,
        });
      } else if (!note) {
        console.warn("Note not found:", noteId);
      }
      setDraggedNoteId(null);
    },
    [notes, moveNote, connections, toast, onAuthRequired, userId, copyToClipboard]
  );

  const handleInboxDrop = useCallback(
    async (noteId: string) => {
      if (!userId) {
        onAuthRequired?.();
        return;
      }
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;
      if (!note.date) return;
      const moved = await moveNote(noteId, null, connections);
      if (!moved.ok) {
        const err = moved.error;
        const details = err?.message
          ? `${err.message}${err.code ? ` (${err.code})` : ""}`
          : null;
        toast({
          title: "Couldn’t move to Todo List",
          description: details
            ? `The change wasn’t saved: ${details}`
            : "The change wasn’t saved. Check your Supabase schema/migrations.",
          action: (
            <ToastAction
              altText="Copy error"
              onClick={() => copyToClipboard(details ?? "Couldn’t move to Todo List (no error details).")}
            >
              Copy error
            </ToastAction>
          ),
          variant: "destructive",
        });
        setDraggedNoteId(null);
        return;
      }
      toast({
        title: "Moved to Todo List",
        description: "Note now has no date.",
      });
      setDraggedNoteId(null);
    },
    [notes, moveNote, connections, toast, onAuthRequired, userId, copyToClipboard]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleCanvasDragOver = useCallback(
    (e: React.DragEvent) => {
      const types = e.dataTransfer.types;
      if (types.includes("text/plain") || draggedNoteId) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }
    },
    [draggedNoteId]
  );

  const handleCanvasDrop = useCallback(
    async (e: React.DragEvent) => {
      if (!userId) {
        onAuthRequired?.();
        return;
      }

      suppressNextCanvasClickRef.current = true;
      requestAnimationFrame(() => {
        suppressNextCanvasClickRef.current = false;
      });

      let noteId = draggedNoteId;
      if (!noteId) {
        noteId = e.dataTransfer.getData("text/plain");
      }
      if (!noteId) return;

      const target = e.target as HTMLElement;
      if (
        target.closest(".year-calendar-grid") ||
        target.closest(".inbox-notes-panel") ||
        target.closest(".zoom-controls")
        || target.closest(".year-range-controls")
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const point = getContentPointFromClient(e.clientX, e.clientY);
      if (!point) return;

      e.preventDefault();
      e.stopPropagation();

      const moved = await moveNoteToCanvas(noteId, point);
      if (!moved) {
        toast({
          title: "Couldn’t place note",
          description: "The change wasn’t saved. Check your Supabase schema/migrations.",
          variant: "destructive",
        });
        setDraggedNoteId(null);
        return;
      }
      toast({
        title: "Note parked",
        description: "Note now has no date.",
      });
      setDraggedNoteId(null);
    },
    [draggedNoteId, getContentPointFromClient, moveNoteToCanvas, onAuthRequired, toast, userId]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (suppressNextCanvasClickRef.current) return;
      if (isDragging()) return;
      if (isLinkMode) return;
      if (draggedNoteId) return;
      if (dialogOpen) return;

      const target = e.target as HTMLElement;
      if (
        target.closest(".year-calendar-grid") ||
        target.closest(".inbox-notes-panel") ||
        target.closest(".zoom-controls") ||
        target.closest(".year-range-controls") ||
        target.closest(".sticky-note") ||
        target.closest('[data-radix-dialog-content]') ||
        target.closest('[role="dialog"]')
      ) {
        return;
      }

      if (!userId) {
        onAuthRequired?.();
        return;
      }

      const point = getContentPointFromClient(e.clientX, e.clientY);
      if (!point) return;

      setSelectedDate(null);
      setEditingNote(null);
      setNewNotePosition(point);
      setNewNoteCalendarId(activeCalendarId ?? visibleCalendarIds?.[0] ?? null);
      setDialogOpen(true);
    },
    [draggedNoteId, getContentPointFromClient, isDragging, isLinkMode, onAuthRequired, userId, dialogOpen, activeCalendarId, visibleCalendarIds]
  );

  const handleSaveNote = useCallback(
    async (text: string, color: StickyColor, date: string | null) => {
      if (!userId) {
        onAuthRequired?.();
        return false;
      }
      if (editingNote) {
        const updated = await updateNote(editingNote.id, text, color);
        if (!updated) {
          toast({
            title: "Couldn’t save note",
            description: "Your changes weren’t saved to Supabase.",
            variant: "destructive",
          });
          return false;
        }
        return true;
      } else {
        const created = await addNote(
          date,
          text,
          color,
          date ? null : newNotePosition,
          newNoteCalendarId
        );
        if (!created) {
          const hint = newNoteCalendarId
            ? "Nothing was saved to Supabase. Check your Supabase schema/migrations (shared calendars + undated notes)."
            : "Nothing was saved to Supabase. If you use shared calendars, create/select a calendar; otherwise apply the latest sticky note migrations.";
          toast({
            title: "Couldn’t create note",
            description: hint,
            variant: "destructive",
          });
          return false;
        }
        setNewNotePosition(null);
        return true;
      }
    },
    [editingNote, addNote, updateNote, toast, onAuthRequired, userId, newNotePosition, newNoteCalendarId]
  );

  const handleDeleteNote = useCallback(() => {
    if (!userId) {
      onAuthRequired?.();
      return;
    }
    if (editingNote) {
      deleteNote(editingNote.id);
      setDialogOpen(false);
    }
  }, [editingNote, deleteNote, onAuthRequired, userId]);

  const handleMoveNote = useCallback(
    async (newDate: string | null) => {
      if (!userId) {
        onAuthRequired?.();
        return false;
      }
      if (editingNote) {
        const moved = await moveNote(editingNote.id, newDate, connections);
        if (!moved.ok) {
          const err = moved.error;
          const details = err?.message
            ? `${err.message}${err.code ? ` (${err.code})` : ""}`
            : null;
          toast({
            title: "Couldn’t move note",
            description: details
              ? `The change wasn’t saved: ${details}`
              : "The change wasn’t saved. Check your Supabase schema/migrations.",
            action: (
              <ToastAction
                altText="Copy error"
                onClick={() => copyToClipboard(details ?? "Couldn’t move note (no error details).")}
              >
                Copy error
              </ToastAction>
            ),
            variant: "destructive",
          });
          return false;
        }
        return true;
      }
      return false;
    },
    [editingNote, moveNote, connections, toast, onAuthRequired, userId, copyToClipboard]
  );

  // Get all note IDs that have connections
  const connectedNoteIds = connections.flatMap((c) => [
    c.source_note_id,
    c.target_note_id,
  ]);
  const uniqueConnectedNoteIds = [...new Set(connectedNoteIds)];

  // Get highlighted notes (connected to hovered note)
  const highlightedNoteIds = hoveredNoteId
    ? [hoveredNoteId, ...getConnectedNotes(hoveredNoteId)]
    : [];

  const handleContainerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Don't start panning if clicking on a note or in link mode or if already dragging
      const target = e.target as HTMLElement;
      if (
        target.closest(".sticky-note") ||
        target.closest(".inbox-notes-panel") ||
        target.closest(".zoom-controls") ||
        target.closest('[data-radix-dialog-content]') ||
        target.closest('[role="dialog"]') ||
        dialogOpen ||
        isLinkMode ||
        draggedNoteId
      ) {
        e.stopPropagation();
        return;
      }
      handlePointerDown(e);
    },
    [handlePointerDown, isLinkMode, draggedNoteId, dialogOpen]
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
                    : undefined;

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full h-screen overflow-hidden bg-muted relative touch-none select-none",
        draggedNoteId ? "cursor-grabbing" : "cursor-grab active:cursor-grabbing"
      )}
      style={
        calendarHeaderHsl
          ? ({ "--calendar-header": calendarHeaderHsl } as React.CSSProperties)
          : undefined
      }
      onPointerDown={handleContainerPointerDown}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
      onClick={handleCanvasClick}
      >
        <div
          ref={contentRef}
          className="origin-top-left transition-none relative"
          style={{
            transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
          }}
        >
          {/* Multiple Year Calendars */}
          <div ref={gridRef} className="flex flex-col items-start gap-12 p-10">
            {years.map((year, index) => {
              const isLast = index === years.length - 1;
              const isHiding = yearBeingHidden === year;
              return (
                <div
                  key={year}
                  className={cn(
                    "inline-block transition-opacity duration-500",
                    isHiding && "opacity-0 pointer-events-none"
                  )}
                >
                  <SingleYearGrid
                    year={year}
                    scale={scale}
                    getNotesByDate={getNotesByDate}
                    getEventsByDate={getGoogleEventsByDate}
                    onCellClick={handleCellClick}
                    onNoteClick={handleNoteClick}
                    onDeleteNote={(id) => {
                      if (!userId) {
                        onAuthRequired?.();
                        return;
                      }
                      deleteNote(id);
                    }}
                    onNoteHover={handleNoteHover}
                    onLinkClick={handleLinkClick}
                    onNoteDragStart={userId ? handleNoteDragStart : undefined}
                    onNoteDragEnd={userId ? handleNoteDragEnd : undefined}
                    onDrop={userId ? handleNoteDrop : undefined}
                    onDragOver={userId ? handleDragOver : undefined}
                    textOverflowMode={textOverflowMode}
                    isLinkMode={isLinkMode}
                    connectedNoteIds={uniqueConnectedNoteIds}
                    highlightedNoteIds={highlightedNoteIds}
                    draggedNoteId={draggedNoteId}
                  />

                  {isLast && (onAddYear || onRemoveLastYear) && (
                    <>
                      {onAddYear && !onRemoveLastYear ? (
                        <button
                          type="button"
                          className="year-range-controls mt-4 flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-full px-4 py-3 shadow-lg border border-border z-40 touch-auto cursor-pointer"
                          onMouseDown={(e) => e.stopPropagation()}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            suppressNextCanvasClickRef.current = true;
                            requestAnimationFrame(() => {
                              suppressNextCanvasClickRef.current = false;
                            });
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            focusAfterYearChangeRef.current = true;
                            onAddYear();
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter" && e.key !== " ") return;
                            e.preventDefault();
                            focusAfterYearChangeRef.current = true;
                            onAddYear();
                          }}
                          aria-label={`Add year ${years[years.length - 1] + 1}`}
                        >
                          <Plus className="h-4 w-4" />
                          <span className="font-medium">Add year {years[years.length - 1] + 1}</span>
                        </button>
                      ) : (
                        <div
                          className="year-range-controls mt-4 flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-border z-40 touch-auto"
                          onMouseDown={(e) => e.stopPropagation()}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            suppressNextCanvasClickRef.current = true;
                            requestAnimationFrame(() => {
                              suppressNextCanvasClickRef.current = false;
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {onAddYear && (
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              className="rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                focusAfterYearChangeRef.current = true;
                                onAddYear();
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add {years[years.length - 1] + 1}
                            </Button>
                          )}

                          {onAddYear && onRemoveLastYear && <div className="w-px h-6 bg-border mx-1" />}

                          {onRemoveLastYear && (
                            <>
                              {skipHideYearConfirm ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    beginHideLastYear({ showUndoToast: true });
                                  }}
                                >
                                  <EyeOff className="h-4 w-4 mr-2" />
                                  Hide {years[years.length - 1]}
                                </Button>
                              ) : (
                                <AlertDialog
                                  open={hideYearDialogOpen}
                                  onOpenChange={(open) => {
                                    setHideYearDialogOpen(open);
                                    if (open) setHideYearDialogDontShowAgain(false);
                                  }}
                                >
                                  <AlertDialogTrigger asChild>
                                    <Button type="button" variant="outline" size="sm" className="rounded-full">
                                      <EyeOff className="h-4 w-4 mr-2" />
                                      Hide {years[years.length - 1]}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Hide this year from view?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This only hides the year. Your notes and dates are kept and will show again if you
                                        add the year back.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>

                                    <div className="flex items-start gap-2">
                                      <Checkbox
                                        id="skip-hide-year-confirm"
                                        checked={hideYearDialogDontShowAgain}
                                        onCheckedChange={(checked) => setHideYearDialogDontShowAgain(checked === true)}
                                      />
                                      <Label htmlFor="skip-hide-year-confirm" className="leading-tight">
                                        I understand — don’t show this again pls
                                      </Label>
                                    </div>

                                    <AlertDialogFooter>
                                      <AlertDialogCancel asChild>
                                        <Button type="button" variant="outline">
                                          Cancel
                                        </Button>
                                      </AlertDialogCancel>
                                      <AlertDialogAction asChild>
                                        <Button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            if (hideYearDialogDontShowAgain) onSkipHideYearConfirmChange?.(true);
                                            beginHideLastYear();
                                            setHideYearDialogOpen(false);
                                          }}
                                        >
                                          Hide year
                                        </Button>
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

        {/* Canvas (undated, positioned) notes */}
        {canvasNotes.length > 0 && (
          <div className="absolute inset-0 z-30 pointer-events-none">
            {canvasNotes.map((note) => (
              <div
                key={note.id}
                className="absolute pointer-events-auto"
                style={{
                  left: note.pos_x as number,
                  top: note.pos_y as number,
                  width: 220,
                  height: 140,
                }}
              >
                <div className="relative w-full h-full">
                  <StickyNoteComponent
                    note={note}
                    onDelete={(id) => {
                      if (!userId) {
                        onAuthRequired?.();
                        return;
                      }
                      deleteNote(id);
                    }}
                    onClick={() => handleNoteClick(note)}
                    onHover={handleNoteHover}
                    onLinkClick={handleLinkClick}
                    onDragStart={userId ? handleNoteDragStart : undefined}
                    onDragEnd={userId ? handleNoteDragEnd : undefined}
                    scale={scale}
                    textOverflowMode={textOverflowMode}
                    isLinkMode={isLinkMode}
                    isConnected={uniqueConnectedNoteIds.includes(note.id)}
                    isHighlighted={highlightedNoteIds.includes(note.id)}
                    isDragging={draggedNoteId === note.id}
                    variant="full"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Connection lines overlay - inside transformed container */}
        <ConnectionLines
          connections={connections}
          notes={notes}
          hoveredNoteId={hoveredNoteId}
          showAll={alwaysShowArrows}
          containerRef={contentRef}
        />
      </div>

      {/* Link mode indicator */}
      {isLinkMode && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg z-50 animate-fade-in">
          {linkSourceNoteId
            ? "Click another note to link"
            : "Click a note to start linking"}
        </div>
      )}

      <ZoomControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetView}
        scale={scale}
      />

      {showInbox && (
        <InboxNotesPanel
          notes={inboxNotes}
          onNewNote={() => {
            if (!userId) {
              onAuthRequired?.();
              return;
            }
            setSelectedDate(null);
            setEditingNote(null);
            setNewNotePosition(null);
            setNewNoteCalendarId(activeCalendarId ?? visibleCalendarIds?.[0] ?? null);
            setDialogOpen(true);
          }}
          onNoteClick={handleInboxNoteClick}
          onDeleteNote={(id) => {
            if (!userId) {
              onAuthRequired?.();
              return;
            }
            deleteNote(id);
          }}
          onNoteHover={handleNoteHover}
          onDropToInbox={userId ? handleInboxDrop : () => onAuthRequired?.()}
          onNoteDragStart={userId ? handleNoteDragStart : undefined}
          onNoteDragEnd={userId ? handleNoteDragEnd : undefined}
          draggedNoteId={draggedNoteId}
          textOverflowMode={textOverflowMode}
        />
      )}

      <NoteDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setNewNotePosition(null);
        }}
        date={selectedDate}
        existingNote={editingNote}
        onSave={handleSaveNote}
        onDelete={editingNote ? handleDeleteNote : undefined}
        onMove={editingNote ? handleMoveNote : undefined}
        calendarOptions={calendarOptions && calendarOptions.length > 1 ? calendarOptions : undefined}
        calendarId={!editingNote ? newNoteCalendarId : null}
        onCalendarChange={!editingNote ? setNewNoteCalendarId : undefined}
        defaultColor={
          !editingNote && newNoteCalendarId
            ? coerceStickyColor(calendarDefaultNoteColorById?.[newNoteCalendarId], "yellow")
            : "yellow"
        }
      />
    </div>
  );
}
