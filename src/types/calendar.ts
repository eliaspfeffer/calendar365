export type StickyColor = 'yellow' | 'pink' | 'green' | 'blue' | 'orange' | 'purple';

export interface StickyNote {
  id: string;
  calendar_id: string;
  user_id: string;
  date: string | null; // Format: YYYY-MM-DD (null means "Todo List"/undated)
  text: string;
  color: StickyColor;
  is_struck?: boolean;
  pos_x?: number | null; // For undated notes placed on the canvas
  pos_y?: number | null; // For undated notes placed on the canvas
  sort_order?: number | null; // Ordering within a single day (lower = higher)
  created_at?: string;
  updated_at?: string;
}

export interface NoteConnection {
  id: string;
  calendar_id: string;
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
