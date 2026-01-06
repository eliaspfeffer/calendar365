import type { StickyColor, StickyNote } from "@/types/calendar";

export const GUEST_USER_ID = "guest";
export const GUEST_CALENDAR_ID = "guest-calendar";
export const GUEST_NOTES_STORAGE_KEY = "calendar365_guest_notes_v1";

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadGuestNotes(): StickyNote[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(GUEST_NOTES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((n) => n as Partial<StickyNote>)
      .filter((n) => typeof n.id === "string" && typeof n.text === "string" && typeof n.color === "string")
      .map(
        (n): StickyNote => ({
          id: n.id as string,
          calendar_id: typeof n.calendar_id === "string" ? n.calendar_id : GUEST_CALENDAR_ID,
          user_id: typeof n.user_id === "string" ? n.user_id : GUEST_USER_ID,
          date: typeof n.date === "string" || n.date === null ? (n.date as string | null) : null,
          text: n.text as string,
          color: n.color as StickyColor,
          is_struck: typeof n.is_struck === "boolean" ? n.is_struck : false,
          pos_x: typeof n.pos_x === "number" ? n.pos_x : null,
          pos_y: typeof n.pos_y === "number" ? n.pos_y : null,
          sort_order: typeof n.sort_order === "number" ? n.sort_order : null,
        })
      )
      .filter((n) => n.user_id === GUEST_USER_ID);
  } catch {
    return [];
  }
}

export function saveGuestNotes(notes: StickyNote[]) {
  if (!isBrowser()) return;
  try {
    const guestNotes = notes.filter((n) => n.user_id === GUEST_USER_ID);
    window.localStorage.setItem(GUEST_NOTES_STORAGE_KEY, JSON.stringify(guestNotes));
  } catch {
    // ignore
  }
}

export function clearGuestNotes() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(GUEST_NOTES_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function makeGuestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (crypto as any).randomUUID() as string;
  }
  return `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
