export const ACTIVE_CALENDAR_OWNER_STORAGE_KEY =
  "calendar365_active_calendar_owner_id";

export type CalendarShareRole = "viewer" | "editor";
export type CalendarAccessRole = "owner" | CalendarShareRole;

export function isShareRole(role: string): role is CalendarShareRole {
  return role === "viewer" || role === "editor";
}

export function shortId(id: string, chars = 8) {
  if (!id) return "";
  return id.slice(0, chars);
}

