# Big Year Calendar (365 Calendar)

A year-at-a-glance planner with a zoomable 365‑day view and sticky notes.

## Features

- 365‑day year grid with zoom/pan
- Sticky notes per day
- Optional sign-in + sync via Supabase
- Shared calendars / public sharing (when Supabase is configured)

## Local development

Prereqs: Node.js 18+ and npm (or Bun).

```sh
npm install
npm run dev
```

Other useful commands:

```sh
npm run lint
npm run build
npm run preview
```

## Environment variables (Supabase)

Without Supabase env vars, the app still runs, but sign-in and persistence are disabled.

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_ANON_KEY
```

## Database migrations (Supabase)

Apply the SQL migrations in `supabase/migrations` to your Supabase project (includes shared calendars and sharing-related tables/policies).

If you use the Supabase CLI, a typical flow is:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (auth + data)

## License

Proprietary — see `LICENSE`.
