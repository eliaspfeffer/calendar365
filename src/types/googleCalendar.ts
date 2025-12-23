export interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  selected?: boolean;
  accessRole?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  timeZone?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  calendarId: string;
  calendarSummary?: string;
  summary: string;
  htmlLink?: string;
  location?: string;
  isAllDay: boolean;
  start: string; // ISO string
  end: string; // ISO string
}

export interface GoogleCalendarDayEvent extends GoogleCalendarEvent {
  dayKey: string; // YYYY-MM-DD in local time
  startTimeLabel?: string; // e.g. "09:30"
  isContinuation?: boolean; // event spans multiple days and this is not the first day
}

