export type StickyColor = 'yellow' | 'pink' | 'green' | 'blue' | 'orange' | 'purple';

export interface StickyNote {
  id: string;
  user_id: string;
  date: string; // Format: YYYY-MM-DD
  text: string;
  color: StickyColor;
}

export interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  dayOfWeek: string;
  isWeekend: boolean;
  isToday: boolean;
  month: number;
}
