# CALENDAR365.APP

A year-at-a-glance planner with a zoomable 365‑day view and sticky notes.

![Demo](demo.png)

## Installation

### npm (Recommended)

Install globally to run from anywhere:

```bash
npm install -g calendar365
```

Then start the calendar:

```bash
calendar365
```

Options:
```bash
calendar365                    # Start on default port 3650
calendar365 -p 8080            # Use custom port
calendar365 --open             # Start and open in browser
calendar365 --help             # Show all options
```

### Homebrew (macOS/Linux)

```bash
# Add the tap
brew tap eliaspfeffer/tap

# Install
brew install calendar365
```

Or install directly:

```bash
brew install eliaspfeffer/tap/calendar365
```

### npx (No Installation)

Run without installing:

```bash
npx calendar365
```

## Features

- 365‑day year grid with zoom/pan
- Sticky notes per day
- Optional Google Calendar live sync (read-only, while app is open)
- Optional sign-in + sync via Supabase
- Shared calendars / public sharing (when Supabase is configured)

## Controls

- Touch: pinch to zoom, drag to pan
- Trackpad: pinch (or Ctrl/⌘ + scroll) to zoom, scroll to pan

## CLI Commands

```bash
calendar365 [command] [options]

Commands:
  start, serve    Start the calendar server (default)
  dev             Start development server with hot reload
  build           Build for production
  help            Show help message

Options:
  -p, --port      Port to run on (default: 3650)
  -h, --host      Host to bind to (default: localhost)
  --open          Open browser automatically
  -v, --version   Show version
```

## Environment Variables

Configure the calendar using environment variables:

```bash
# Server configuration
CALENDAR365_PORT=3650           # Default port
CALENDAR365_HOST=localhost      # Default host
```

## YAML import/export

- Open the `YAML import/export` dialog via the code icon in the top-right controls.
- Select a sub-calendar and use **Export** to copy a YAML 1.2 document you can paste into any chat/LLM.
- Edit the YAML and use **Import** to merge changes (or choose "Replace existing notes in this calendar").

Schema: `calendar365.notes.v1` with one entry per note. Fields include `calendar`, `date` (or `float` for undated notes), `text`, `color`, and `connection`.

## Local development

Prereqs: Node.js 18+ and npm (or Bun).

```sh
git clone https://github.com/eliaspfeffer/calendar365.git
cd calendar365
npm install
npm run dev
```

Other useful commands:

```sh
npm run lint
npm run build
npm run preview
```

## Legal pages (Imprint / Privacy)

- The app includes `/imprint` and `/privacy` as a popup modal (with a close button).
- Configure contact details via env vars (see `.env.example`): `VITE_LEGAL_PROVIDER_NAME`, `VITE_LEGAL_PROVIDER_ADDRESS` (newline-separated), `VITE_LEGAL_PHONE`, `VITE_LEGAL_EMAIL`, `VITE_LEGAL_WEBSITE`.

## Environment variables (Supabase)

Without Supabase env vars, the app still runs, but sign-in and persistence are disabled.

Create `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_ANON_KEY
VITE_FREE_NOTES_LIMIT=25
VITE_PAYPAL_CLIENT_ID=YOUR_PAYPAL_CLIENT_ID
```

## Payments / paywall (PayPal, lifetime 4 USD)

- Free to use up to N notes per account (default 25).
- Adding note N+1 opens a "support the app" dialog to unlock unlimited notes.
- The user can choose the amount (including 0 USD). 4 USD is the suggested amount.

### Changing the free-note limit

- UI limit (local/prod build): set `VITE_FREE_NOTES_LIMIT`.
- Server enforcement (Supabase RLS): after applying migrations, update the singleton row:

```sql
UPDATE public.app_config
SET free_notes_limit = 25
WHERE id = 1;
```

### Supabase Edge Function secrets

The PayPal API secret must NOT go into Vite env vars. Configure it as Supabase secrets:

```sh
supabase secrets set \
  PAYPAL_ENV="sandbox" \
  PAYPAL_CLIENT_ID="YOUR_PAYPAL_CLIENT_ID" \
  PAYPAL_SECRET="YOUR_PAYPAL_SECRET"
```

Deploy the functions:

```sh
supabase functions deploy paypal-create-order
supabase functions deploy paypal-capture-order
supabase functions deploy entitlement-grant-free
```

## Google Calendar sync (optional)

Set `VITE_GOOGLE_CLIENT_ID` to enable connecting a Google account and showing Google Calendar events inside the year view.

## Database migrations (Supabase)

Apply the SQL migrations in `supabase/migrations` to your Supabase project (includes shared calendars and sharing-related tables/policies).

If you use the Supabase CLI, a typical flow is:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## Auth (Supabase)

This app uses email + password auth. If your Supabase project requires email confirmation on sign-up, customize the template:

- Supabase Dashboard → Authentication → Templates → `Confirm signup`
- Optional: use `supabase/email-templates/magic-link.html` as a starting point (it uses `{{ .ConfirmationURL }}`)

If you previously used magic-link sign-in, use the password reset flow in the app (`/reset-password`) to set a password for your existing account.

If password reset emails fail (e.g. 500 "Error sending recovery email"), configure email delivery in Supabase:

- Supabase Dashboard → Authentication → Logs (look for SMTP/mailer errors)
- Supabase Dashboard → Authentication → Providers → Email (SMTP settings / rate limits)
- Supabase Dashboard → Authentication → URL Configuration (ensure your site URL / redirect URLs include `/reset-password`)

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (auth + data)

## Publishing

For maintainers - publish a new version:

```bash
# Update version in package.json
npm version patch  # or minor/major

# Publish to npm and update Homebrew formula
./scripts/publish.sh
```

## License

MIT License — see `LICENSE`.
