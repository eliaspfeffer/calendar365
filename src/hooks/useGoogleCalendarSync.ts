import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isValid,
  parseISO,
  startOfDay,
  subMinutes,
} from "date-fns";
import type {
  GoogleCalendarDayEvent,
  GoogleCalendarEvent,
  GoogleCalendarListEntry,
} from "@/types/googleCalendar";

const SESSION_KEY = "calendar365_google_token_v1";

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  error?: string;
  error_description?: string;
};

type GoogleOauth2 = {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (resp: GoogleTokenResponse) => void;
  }) => { requestAccessToken: (options?: { prompt?: "" | "consent" }) => void };
};

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOauth2 } };
  }
}

function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.oauth2) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-google-identity="true"]'
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity script")), {
        once: true,
      });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity script"));
    document.head.appendChild(script);
  });
}

function loadStoredToken(): { accessToken: string; expiresAtMs: number } | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { accessToken?: string; expiresAtMs?: number };
    if (!parsed.accessToken || !parsed.expiresAtMs) return null;
    return { accessToken: parsed.accessToken, expiresAtMs: parsed.expiresAtMs };
  } catch {
    return null;
  }
}

function storeToken(accessToken: string, expiresAtMs: number) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken, expiresAtMs }));
}

function clearStoredToken() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

function getYearRangeIso(years: number[]) {
  const safeYears = years.length > 0 ? years : [new Date().getFullYear()];
  const minYear = Math.min(...safeYears);
  const maxYear = Math.max(...safeYears);
  const timeMin = new Date(minYear, 0, 1, 0, 0, 0, 0).toISOString();
  const timeMax = new Date(maxYear + 1, 0, 1, 0, 0, 0, 0).toISOString();
  return { timeMin, timeMax };
}

function toLocalDayKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function normalizeEventToDays(event: GoogleCalendarEvent): GoogleCalendarDayEvent[] {
  const startDate = parseISO(event.start);
  const endDate = parseISO(event.end);
  if (!isValid(startDate) || !isValid(endDate)) return [];

  if (event.isAllDay) {
    // All-day events from Google use end as exclusive. Convert to inclusive by subtracting one day.
    const lastDay = addDays(startDate, Math.max(0, differenceInCalendarDays(endDate, startDate) - 1));
    const days = eachDayOfInterval({ start: startDate, end: lastDay });
    return days.map((d, idx) => ({
      ...event,
      dayKey: toLocalDayKey(d),
      startTimeLabel: "All day",
      isContinuation: idx > 0,
    }));
  }

  // Timed events: treat end as exclusive for midnight edges by subtracting 1 minute.
  const endInclusive = subMinutes(endDate, 1);
  const startDay = startOfDay(startDate);
  const endDay = startOfDay(endInclusive);
  if (!isValid(endInclusive) || endDay < startDay) return [];

  const timeLabel = format(startDate, "HH:mm");
  const days = eachDayOfInterval({ start: startDay, end: endDay });
  return days.map((d, idx) => ({
    ...event,
    dayKey: toLocalDayKey(d),
    startTimeLabel: idx === 0 ? timeLabel : undefined,
    isContinuation: idx > 0,
  }));
}

async function googleApiGet<T>(url: string, accessToken: string): Promise<T> {
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Google API error ${resp.status}: ${text || resp.statusText}`);
  }
  return (await resp.json()) as T;
}

type CalendarListResponse = { items?: GoogleCalendarListEntry[] };
type EventsResponse = {
  items?: Array<{
    id: string;
    summary?: string;
    htmlLink?: string;
    location?: string;
    start?: { date?: string; dateTime?: string };
    end?: { date?: string; dateTime?: string };
    status?: string;
    recurringEventId?: string;
    originalStartTime?: { date?: string; dateTime?: string };
  }>;
  nextPageToken?: string;
};

function toBase64Url(input: string) {
  // Google Calendar web uses a base64url-ish encoding for the `eid` param.
  const utf8 = encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
  const b64 = btoa(utf8);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function buildGoogleCalendarWebLink(eventId: string, calendarId: string) {
  const eid = toBase64Url(`${eventId} ${calendarId}`);
  return `https://calendar.google.com/calendar/u/0/r/event?eid=${encodeURIComponent(eid)}`;
}

export function useGoogleCalendarSync(options: {
  years: number[];
  enabled: boolean;
  selectedCalendarIds: string[];
  pollIntervalMs?: number;
}) {
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "";
  const isAvailable = clientId.trim().length > 0;

  const initial = useMemo(() => loadStoredToken(), []);
  const [accessToken, setAccessToken] = useState<string | null>(initial?.accessToken ?? null);
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(initial?.expiresAtMs ?? null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [calendars, setCalendars] = useState<GoogleCalendarListEntry[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [eventsByDate, setEventsByDate] = useState<Record<string, GoogleCalendarDayEvent[]>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isConnected = !!accessToken;
  const pollIntervalMs = options.pollIntervalMs ?? 60_000;
  const { timeMin, timeMax } = useMemo(() => getYearRangeIso(options.years), [options.years]);

  const scopes = useMemo(() => ["https://www.googleapis.com/auth/calendar.readonly"], []);
  const scopeString = useMemo(() => scopes.join(" "), [scopes]);

  const requestToken = useCallback(
    async (prompt: "" | "consent") => {
      if (!isAvailable) throw new Error("Google Calendar is not configured (missing VITE_GOOGLE_CLIENT_ID)");
      await loadGoogleIdentityScript();
      const oauth2 = window.google?.accounts?.oauth2;
      if (!oauth2) throw new Error("Google Identity Services not available");

      return await new Promise<GoogleTokenResponse>((resolve, reject) => {
        const tokenClient = oauth2.initTokenClient({
          client_id: clientId,
          scope: scopeString,
          callback: (resp) => {
            if (resp.error) {
              reject(new Error(resp.error_description || resp.error));
              return;
            }
            resolve(resp);
          },
        });
        tokenClient.requestAccessToken({ prompt });
      });
    },
    [clientId, isAvailable, scopeString]
  );

  const connect = useCallback(async () => {
    setError(null);
    if (!isAvailable) {
      setError("Google Calendar sync is not configured (missing VITE_GOOGLE_CLIENT_ID).");
      return;
    }
    setIsConnecting(true);
    try {
      const resp = await requestToken("consent");
      const nextExpiresAt = Date.now() + resp.expires_in * 1000 - 30_000;
      setAccessToken(resp.access_token);
      setExpiresAtMs(nextExpiresAt);
      storeToken(resp.access_token, nextExpiresAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsConnecting(false);
    }
  }, [isAvailable, requestToken]);

  const disconnect = useCallback(() => {
    setAccessToken(null);
    setExpiresAtMs(null);
    clearStoredToken();
    setCalendars([]);
    setEventsByDate({});
    setLastSyncAt(null);
    setError(null);
  }, []);

  const ensureValidToken = useCallback(async () => {
    if (!isAvailable) return null;
    if (!accessToken) return null;
    if (!expiresAtMs) return accessToken;
    if (Date.now() < expiresAtMs) return accessToken;

    // Attempt a "silent" refresh. If Google requires user interaction, this will fail and we'll surface an error.
    const resp = await requestToken("");
    const nextExpiresAt = Date.now() + resp.expires_in * 1000 - 30_000;
    setAccessToken(resp.access_token);
    setExpiresAtMs(nextExpiresAt);
    storeToken(resp.access_token, nextExpiresAt);
    return resp.access_token;
  }, [accessToken, expiresAtMs, isAvailable, requestToken]);

  // If enabled and we don't have a token (e.g. after reload), try a silent reconnect.
  useEffect(() => {
    if (!options.enabled) return;
    if (!isAvailable) return;
    if (accessToken) return;

    const restored = loadStoredToken();
    if (restored && Date.now() < restored.expiresAtMs) {
      setAccessToken(restored.accessToken);
      setExpiresAtMs(restored.expiresAtMs);
      return;
    }

    requestToken("")
      .then((resp) => {
        const nextExpiresAt = Date.now() + resp.expires_in * 1000 - 30_000;
        setAccessToken(resp.access_token);
        setExpiresAtMs(nextExpiresAt);
        storeToken(resp.access_token, nextExpiresAt);
      })
      .catch(() => {
        // Silent reconnect failed (likely requires interaction). Leave as disconnected.
      });
  }, [accessToken, isAvailable, options.enabled, requestToken]);

  const fetchCalendars = useCallback(
    async (token: string) => {
      setIsLoadingCalendars(true);
      try {
        const data = await googleApiGet<CalendarListResponse>(
          "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader",
          token
        );
        setCalendars(data.items ?? []);
      } finally {
        setIsLoadingCalendars(false);
      }
    },
    []
  );

  const fetchEvents = useCallback(
    async (token: string, calendarIds: string[]) => {
      const calendarById = new Map(calendars.map((c) => [c.id, c]));
      const all: GoogleCalendarEvent[] = [];

      for (const calendarId of calendarIds) {
        let pageToken: string | undefined;
        do {
          const url = new URL(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
          );
          url.searchParams.set("timeMin", timeMin);
          url.searchParams.set("timeMax", timeMax);
          url.searchParams.set("singleEvents", "true");
          url.searchParams.set("orderBy", "startTime");
          url.searchParams.set("maxResults", "2500");
          url.searchParams.set("showDeleted", "false");
          if (pageToken) url.searchParams.set("pageToken", pageToken);

          const data = await googleApiGet<EventsResponse>(url.toString(), token);
          const items = data.items ?? [];
          const calendar = calendarById.get(calendarId);

          for (const item of items) {
            if (!item.id) continue;
            if (!item.start || !item.end) continue;
            if (item.status === "cancelled") continue;
            const isAllDay = !!item.start.date && !!item.end.date;
            const start = item.start.dateTime ?? item.start.date ?? "";
            const end = item.end.dateTime ?? item.end.date ?? "";
            if (!start || !end) continue;
            const stableId = item.recurringEventId ?? item.id;

            all.push({
              id: item.id,
              calendarId,
              calendarSummary: calendar?.summary,
              summary: item.summary || "(No title)",
              htmlLink: item.htmlLink,
              recurringEventId: item.recurringEventId,
              webLink: buildGoogleCalendarWebLink(stableId, calendarId),
              location: item.location,
              isAllDay,
              start: isAllDay ? `${start}T00:00:00` : start,
              end: isAllDay ? `${end}T00:00:00` : end,
            });
          }

          pageToken = data.nextPageToken;
        } while (pageToken);
      }

      const byDate: Record<string, GoogleCalendarDayEvent[]> = {};
      for (const event of all) {
        for (const dayEvent of normalizeEventToDays(event)) {
          (byDate[dayEvent.dayKey] ??= []).push(dayEvent);
        }
      }

      for (const key of Object.keys(byDate)) {
        byDate[key].sort((a, b) => {
          if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1;
          return a.start.localeCompare(b.start);
        });
      }

      setEventsByDate(byDate);
    },
    [calendars, timeMax, timeMin]
  );

  const refresh = useCallback(async () => {
    setError(null);
    if (!options.enabled) return;
    if (!accessToken) return;
    if (!options.selectedCalendarIds || options.selectedCalendarIds.length === 0) {
      setEventsByDate({});
      return;
    }

    setIsSyncing(true);
    try {
      const token = await ensureValidToken();
      if (!token) return;
      if (calendars.length === 0) await fetchCalendars(token);
      await fetchEvents(token, options.selectedCalendarIds);
      setLastSyncAt(new Date());
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setIsSyncing(false);
    }
  }, [
    accessToken,
    calendars.length,
    ensureValidToken,
    fetchCalendars,
    fetchEvents,
    options.enabled,
    options.selectedCalendarIds,
  ]);

  // Load calendar list when connected.
  useEffect(() => {
    if (!options.enabled) return;
    if (!accessToken) return;
    if (!isAvailable) return;
    if (calendars.length > 0) return;
    fetchCalendars(accessToken).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [accessToken, calendars.length, fetchCalendars, isAvailable, options.enabled]);

  // Poll events while enabled and connected.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    if (!options.enabled) return;
    if (!accessToken) return;
    const handle = window.setInterval(() => refreshRef.current(), pollIntervalMs);
    return () => window.clearInterval(handle);
  }, [accessToken, options.enabled, pollIntervalMs]);

  // Initial refresh when enabled + selection changes.
  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const selectedCalendars = useMemo(() => {
    const set = new Set(options.selectedCalendarIds);
    return calendars.filter((c) => set.has(c.id));
  }, [calendars, options.selectedCalendarIds]);

  return {
    isAvailable,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    calendars,
    selectedCalendars,
    isLoadingCalendars,
    eventsByDate,
    isSyncing,
    lastSyncAt,
    error,
    refresh,
  };
}
