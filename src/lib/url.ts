function normalizeOrigin(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) return null;
  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

/**
 * Public base URL/origin used for links sent via email (Supabase magic links, invites, etc).
 *
 * Configure via `VITE_PUBLIC_SITE_URL` (recommended for production/custom domains).
 * Falls back to `window.location.origin` in the browser.
 */
export function getPublicSiteOrigin(): string {
  const configured =
    normalizeOrigin(import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined ?? "") ??
    normalizeOrigin(import.meta.env.VITE_SITE_URL as string | undefined ?? "");
  if (configured) return configured;

  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;

  return "http://localhost:5173";
}

