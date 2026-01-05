import { NoteConnection, StickyNote } from "@/types/calendar";

export const EXAMPLE_USER_ID = "example";
export const EXAMPLE_CALENDAR_ID = "example-calendar";

export const exampleNotes: StickyNote[] = [
  {
    id: "example-note-urlaub-2025",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2025-07-14",
    text: "Urlaub (1 Woche)\nFlug + Hotel checken",
    color: "yellow",
  },
  {
    id: "example-note-kickoff-2025",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2025-02-05",
    text: "Projekt-Kickoff 10:00\nAgenda: Ziele, Rollen, nächste Schritte",
    color: "blue",
  },
  {
    id: "example-note-geburtstag-2025",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2025-11-22",
    text: "Geburtstag 🎂\nGeschenkidee: Buch + Karte",
    color: "pink",
  },
  {
    id: "example-note-arzt-2026",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2026-03-12",
    text: "Arzttermin 16:30\nÜberweisung mitnehmen",
    color: "green",
  },
  {
    id: "example-note-release-2026",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2026-09-01",
    text: "Release v1.0\nFinaler Check: Tests, Changelog, Rollout",
    color: "orange",
  },
  {
    id: "example-note-inbox",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: null,
    text: "Todo List-Idee:\n„Neues Ritual“ für Montag planen",
    color: "purple",
  },
];

export const exampleConnections: NoteConnection[] = [
  {
    id: "example-conn-kickoff-release",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    source_note_id: "example-note-kickoff-2025",
    target_note_id: "example-note-release-2026",
  },
];
