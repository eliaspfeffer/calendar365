export type StickyColor = 'yellow' | 'pink' | 'green' | 'blue' | 'orange' | 'purple';

export interface StickyNote {
  id: string;
  user_id: string;
  date: string | null; // Format: YYYY-MM-DD (null means "Inbox"/undated)
  text: string;
  color: StickyColor;
  pos_x?: number | null; // For undated notes placed on the canvas
  pos_y?: number | null; // For undated notes placed on the canvas
}

export interface NoteConnection {
  id: string;
  user_id: string;
  source_note_id: string;
  target_note_id: string;
}

export interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  dayOfWeek: string;
  isWeekend: boolean;
  isToday: boolean;
  month: number;
}
