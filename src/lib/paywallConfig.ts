function parsePositiveInt(value: string | undefined, fallback: number) {
  const raw = (value ?? "").trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

export function getFreeNotesLimit() {
  // Client-side limit (UI). Server-side enforcement lives in Supabase RLS policy.
  const fallback = 25;
  const n = parsePositiveInt(import.meta.env.VITE_FREE_NOTES_LIMIT as string | undefined, fallback);
  return Math.min(1000, Math.max(1, n));
}

