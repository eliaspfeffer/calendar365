import { useState, useEffect } from 'react';

export type TextOverflowMode = 'scroll' | 'truncate' | 'expand';
export type CalendarColor = 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'teal' | 'pink' | 'indigo';

interface Settings {
  textOverflowMode: TextOverflowMode;
  calendarColor: CalendarColor;
  alwaysShowArrows: boolean;
  activeCalendarId: string | null;
  shareBaseUrl: string | null;
  visibleCalendarIds: string[] | null;
  googleSyncEnabled: boolean;
  googleSelectedCalendarIds: string[] | null;
}

const SETTINGS_KEY = 'calendar365_settings';

const defaultSettings: Settings = {
  textOverflowMode: 'expand',
  calendarColor: 'blue',
  alwaysShowArrows: false,
  activeCalendarId: null,
  shareBaseUrl: null,
  visibleCalendarIds: null,
  googleSyncEnabled: false,
  googleSelectedCalendarIds: null,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      } catch {
        // Invalid JSON, use defaults
      }
    }
  }, []);

  const updateSettings = (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
  };

  return { settings, updateSettings };
}
