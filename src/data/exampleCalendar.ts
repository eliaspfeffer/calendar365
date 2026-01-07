import { NoteConnection, StickyNote } from "@/types/calendar";

export const EXAMPLE_USER_ID = "example";
export const EXAMPLE_CALENDAR_ID = "example-calendar";

export const exampleNotes: StickyNote[] = [
  {
    id: "example-note-urlaub-2025",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2025-07-14",
    text: "Vacation (1 week)\nCheck flight + hotel",
    color: "yellow",
  },
  {
    id: "example-note-kickoff-2025",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2025-02-05",
    text: "Project kickoff 10:00\nAgenda: goals, roles, next steps",
    color: "blue",
  },
  {
    id: "example-note-geburtstag-2025",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2025-11-22",
    text: "Birthday 🎂\nGift idea: book + card",
    color: "pink",
  },
  {
    id: "example-note-arzt-2026",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2026-03-12",
    text: "Doctor appointment 16:30\nBring referral",
    color: "green",
  },
  {
    id: "example-note-release-2026",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2026-09-01",
    text: "Release v1.0\nFinal check: tests, changelog, rollout",
    color: "orange",
  },
  {
    id: "example-note-inbox",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: null,
    text: "To-do list idea:\nPlan a “new ritual” for Monday",
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
