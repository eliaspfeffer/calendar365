import { NoteConnection, StickyNote } from "@/types/calendar";

export const EXAMPLE_USER_ID = "example";
export const EXAMPLE_CALENDAR_ID = "example-calendar";

export const exampleNotes: StickyNote[] = [
  // Q1 2026 - New Year Goals & Planning
  {
    id: "example-note-newyear-2026",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2026-01-01",
    text: "🎆 New Year Goals\nLearn Spanish • Run a marathon • Read 24 books",
    color: "purple",
  },
  {
    id: "example-note-kickoff-2026",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2026-02-05",
    text: "Project kickoff 10:00\nAgenda: goals, roles, next steps",
    color: "blue",
  },
  {
    id: "example-note-marathon-training",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2026-02-15",
    text: "🏃 Marathon training starts\n16-week plan begins today!",
    color: "green",
  },
  {
    id: "example-note-arzt-2026",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2026-03-12",
    text: "Doctor appointment 16:30\nBring referral",
    color: "green",
  },

  // Q2 2026 - Spring & Growth
  {
    id: "example-note-spanish-exam",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2026-04-20",
    text: "📚 Spanish A2 Exam\n3 months of learning - you got this!",
    color: "yellow",
  },
  {
    id: "example-note-garden-planting",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2026-05-01",
    text: "🌱 Start balcony garden\nTomatoes, herbs, strawberries",
    color: "green",
  },
  {
    id: "example-note-marathon-race",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2026-06-07",
    text: "🏅 MARATHON DAY!\nGoal: finish under 4:30",
    color: "orange",
  },
  {
    id: "example-note-wedding-anniversary",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2026-06-15",
    text: "💕 5th Anniversary\nSurprise dinner reservation",
    color: "pink",
  },

  // Q3 2026 - Summer & Vacation
  {
    id: "example-note-urlaub-2026",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2026-07-14",
    text: "✈️ Italy Trip (2 weeks)\nRome → Florence → Amalfi Coast",
    color: "yellow",
  },
  {
    id: "example-note-book-club",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2026-08-10",
    text: "📖 Book #16 done!\nHalfway to yearly reading goal",
    color: "purple",
  },
  {
    id: "example-note-release-2026",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2026-09-01",
    text: "🚀 Release v1.0\nFinal check: tests, changelog, rollout",
    color: "orange",
  },

  // Q4 2026 - Fall & Year-End
  {
    id: "example-note-conference",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2026-10-15",
    text: "🎤 Tech Conference Talk\nTopic: Building for the long term",
    color: "blue",
  },
  {
    id: "example-note-geburtstag-2026",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2026-11-22",
    text: "🎂 Mom's Birthday\nParty planning + photo album gift",
    color: "pink",
  },
  {
    id: "example-note-year-review",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2026-12-28",
    text: "✨ Year in Review\nReflect on goals & plan 2027",
    color: "purple",
  },

  // Future Planning - 2027
  {
    id: "example-note-sabbatical-2027",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2027-03-01",
    text: "🌍 Sabbatical begins!\n3 months exploring Southeast Asia",
    color: "yellow",
  },
  {
    id: "example-note-house-goal",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: "2027-09-01",
    text: "🏠 House hunting deadline\nSave €50k by this date",
    color: "orange",
  },

  // Inbox - Ideas & Someday
  {
    id: "example-note-inbox",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: null,
    text: "💡 Someday ideas:\n• Learn pottery • Visit Japan • Write a book",
    color: "purple",
  },
  {
    id: "example-note-inbox-habits",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    date: null,
    text: "📝 Weekly habits to track:\nMeditation • Journaling • Cold showers",
    color: "blue",
  },
];

export const exampleConnections: NoteConnection[] = [
  // Project timeline: kickoff → release
  {
    id: "example-conn-kickoff-release",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    source_note_id: "example-note-kickoff-2026",
    target_note_id: "example-note-release-2026",
  },
  // Marathon journey: training → race day
  {
    id: "example-conn-marathon-journey",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    source_note_id: "example-note-marathon-training",
    target_note_id: "example-note-marathon-race",
  },
  // Year goals: new year → year review
  {
    id: "example-conn-year-goals",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    source_note_id: "example-note-newyear-2026",
    target_note_id: "example-note-year-review",
  },
  // Language learning: goals → exam
  {
    id: "example-conn-spanish-learning",
    calendar_id: EXAMPLE_CALENDAR_ID,
    user_id: EXAMPLE_USER_ID,
    source_note_id: "example-note-newyear-2026",
    target_note_id: "example-note-spanish-exam",
  },
];
