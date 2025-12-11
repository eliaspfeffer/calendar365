import { useState, useEffect } from 'react';

export type TextOverflowMode = 'scroll' | 'truncate' | 'expand';

interface Settings {
  textOverflowMode: TextOverflowMode;
}

const SETTINGS_KEY = 'calendar365_settings';

const defaultSettings: Settings = {
  textOverflowMode: 'expand',
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
