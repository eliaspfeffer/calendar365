import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { SETTINGS_KEY } from '@/lib/settingsStorage';
import {
  applyColorSchemePreference,
  applyDarkThemePreference,
  DEFAULT_DARK_THEME,
  type ColorSchemePreference,
  type DarkThemePreference,
} from '@/lib/systemColorScheme';

export type TextOverflowMode = 'scroll' | 'truncate' | 'expand';
export type CalendarColor = 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'teal' | 'pink' | 'indigo';

interface Settings {
  colorScheme: ColorSchemePreference;
  darkTheme: DarkThemePreference;
  yearStart: number;
  yearEnd: number;
  skipHideYearConfirm: boolean;
  textOverflowMode: TextOverflowMode;
  autoScrollStruckNotes: boolean;
  calendarColor: CalendarColor;
  alwaysShowArrows: boolean;
  showInbox: boolean;
  activeCalendarId: string | null;
  shareBaseUrl: string | null;
  visibleCalendarIds: string[] | null;
  calendarOrderIds: string[] | null;
  googleSyncEnabled: boolean;
  googleSelectedCalendarIds: string[] | null;
}

type SettingsUpdater = Partial<Settings> | ((prev: Settings) => Partial<Settings>);

const defaultYearStart = new Date().getFullYear();
const defaultYearEnd = defaultYearStart + 1;

const defaultSettings: Settings = {
  colorScheme: 'system',
  darkTheme: DEFAULT_DARK_THEME,
  yearStart: defaultYearStart,
  yearEnd: defaultYearEnd,
  skipHideYearConfirm: false,
  textOverflowMode: 'expand',
  autoScrollStruckNotes: true,
  calendarColor: 'blue',
  alwaysShowArrows: false,
  showInbox: true,
  activeCalendarId: null,
  shareBaseUrl: null,
  visibleCalendarIds: null,
  calendarOrderIds: null,
  googleSyncEnabled: false,
  googleSelectedCalendarIds: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function coerceYear(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function coercePartialSettings(raw: unknown): Partial<Settings> {
  if (!isRecord(raw)) return {};

  const out: Partial<Settings> = {};

  if (raw.colorScheme === "system" || raw.colorScheme === "light" || raw.colorScheme === "dark") {
    out.colorScheme = raw.colorScheme;
  }
  if (raw.darkTheme === "vscode-dark" || raw.darkTheme === "vscode-dimmed" || raw.darkTheme === "vscode-abyss") {
    out.darkTheme = raw.darkTheme;
  }

  const yearStart = coerceYear(raw.yearStart);
  if (yearStart !== null) out.yearStart = yearStart;
  const yearEnd = coerceYear(raw.yearEnd);
  if (yearEnd !== null) out.yearEnd = yearEnd;
  if (typeof raw.skipHideYearConfirm === "boolean") out.skipHideYearConfirm = raw.skipHideYearConfirm;

  if (raw.textOverflowMode === "scroll" || raw.textOverflowMode === "truncate" || raw.textOverflowMode === "expand") {
    out.textOverflowMode = raw.textOverflowMode;
  }
  if (typeof raw.autoScrollStruckNotes === "boolean") out.autoScrollStruckNotes = raw.autoScrollStruckNotes;
  if (
    raw.calendarColor === "blue" ||
    raw.calendarColor === "green" ||
    raw.calendarColor === "purple" ||
    raw.calendarColor === "red" ||
    raw.calendarColor === "orange" ||
    raw.calendarColor === "teal" ||
    raw.calendarColor === "pink" ||
    raw.calendarColor === "indigo"
  ) {
    out.calendarColor = raw.calendarColor;
  }
  if (typeof raw.alwaysShowArrows === "boolean") out.alwaysShowArrows = raw.alwaysShowArrows;
  if (typeof raw.showInbox === "boolean") out.showInbox = raw.showInbox;
  if (typeof raw.activeCalendarId === "string" || raw.activeCalendarId === null) out.activeCalendarId = raw.activeCalendarId;
  if (typeof raw.shareBaseUrl === "string" || raw.shareBaseUrl === null) out.shareBaseUrl = raw.shareBaseUrl;
  if (isStringArray(raw.visibleCalendarIds) || raw.visibleCalendarIds === null) out.visibleCalendarIds = raw.visibleCalendarIds;
  if (isStringArray(raw.calendarOrderIds) || raw.calendarOrderIds === null) out.calendarOrderIds = raw.calendarOrderIds;
  if (typeof raw.googleSyncEnabled === "boolean") out.googleSyncEnabled = raw.googleSyncEnabled;
  if (isStringArray(raw.googleSelectedCalendarIds) || raw.googleSelectedCalendarIds === null) {
    out.googleSelectedCalendarIds = raw.googleSelectedCalendarIds;
  }

  return out;
}

export function useSettings(userId: string | null = null) {
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === "undefined") return defaultSettings;
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    if (!stored) return defaultSettings;
    try {
      const parsed = JSON.parse(stored) as unknown;
      return { ...defaultSettings, ...coercePartialSettings(parsed) };
    } catch {
      return defaultSettings;
    }
  });
  const settingsRef = useRef(settings);
  const saveTimeoutRef = useRef<number | null>(null);
  const pendingRemoteRef = useRef<Settings | null>(null);
  const remoteLoadedRef = useRef(false);
  const dirtyBeforeRemoteLoadRef = useRef(false);
  const remoteUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (remoteUserIdRef.current === userId) return;
    remoteUserIdRef.current = userId;
    remoteLoadedRef.current = false;
    dirtyBeforeRemoteLoadRef.current = false;
    pendingRemoteRef.current = null;
  }, [userId]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    applyColorSchemePreference(settings.colorScheme);
  }, [settings.colorScheme]);

  useEffect(() => {
    applyDarkThemePreference(settings.darkTheme);
  }, [settings.darkTheme]);

  useEffect(() => {
    if (!userId) return;
    if (!isSupabaseConfigured) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("settings")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("Error loading user settings:", error);
        remoteLoadedRef.current = true;
        return;
      }

      const hasRemote = Boolean(data?.settings);
      if (hasRemote && !dirtyBeforeRemoteLoadRef.current) {
        const next = { ...defaultSettings, ...coercePartialSettings(data.settings) };
        setSettings(next);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      }

      remoteLoadedRef.current = true;

      if (!hasRemote) {
        // No row yet: seed with whatever we currently have (likely localStorage-derived).
        const { error: upsertError } = await supabase
          .from("user_settings")
          .upsert({ user_id: userId, settings: settingsRef.current as unknown as Json }, { onConflict: "user_id" });

        if (!cancelled && upsertError) {
          console.error("Error seeding user settings:", upsertError);
        }
      } else if (dirtyBeforeRemoteLoadRef.current && pendingRemoteRef.current) {
        // Flush any local changes that happened before remote hydration completed.
        const pending = pendingRemoteRef.current;
        pendingRemoteRef.current = null;
        const { error: upsertError } = await supabase
          .from("user_settings")
          .upsert({ user_id: userId, settings: pending as unknown as Json }, { onConflict: "user_id" });
        if (!cancelled && upsertError) {
          console.error("Error saving user settings:", upsertError);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const scheduleRemoteSave = useCallback(
    (next: Settings) => {
      if (!userId) return;
      if (!isSupabaseConfigured) return;

      pendingRemoteRef.current = next;
      if (!remoteLoadedRef.current) {
        dirtyBeforeRemoteLoadRef.current = true;
        return;
      }
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = window.setTimeout(async () => {
        const pending = pendingRemoteRef.current;
        if (!pending) return;
        pendingRemoteRef.current = null;
        const { error } = await supabase
          .from("user_settings")
          .upsert({ user_id: userId, settings: pending as unknown as Json }, { onConflict: "user_id" });
        if (error) {
          console.error("Error saving user settings:", error);
        }
      }, 500);
    },
    [userId],
  );

  const updateSettings = useCallback(
    (updater: SettingsUpdater) => {
      setSettings((prev) => {
        const updates = typeof updater === "function" ? updater(prev) : updater;
        const next = { ...prev, ...updates };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
        scheduleRemoteSave(next);
        return next;
      });
    },
    [scheduleRemoteSave],
  );

  return { settings, updateSettings };
}
