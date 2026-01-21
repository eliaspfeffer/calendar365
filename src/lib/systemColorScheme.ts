import { SETTINGS_KEY } from "@/lib/settingsStorage";

const COLOR_SCHEME_MEDIA = "(prefers-color-scheme: dark)";

function applySystemColorScheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export type ColorSchemePreference = "system" | "light" | "dark";
export const DARK_THEMES = ["vscode-dark", "vscode-dimmed", "vscode-abyss"] as const;
export type DarkThemePreference = (typeof DARK_THEMES)[number];
export const DEFAULT_DARK_THEME: DarkThemePreference = "vscode-dark";

const DARK_THEME_CLASS_PREFIX = "theme-";
const DARK_THEME_CLASSES = DARK_THEMES.map((theme) => `${DARK_THEME_CLASS_PREFIX}${theme}`);

let currentPreference: ColorSchemePreference = "system";
let mediaQuery: MediaQueryList | null = null;

function coercePreference(value: unknown): ColorSchemePreference | null {
  if (value === "system" || value === "light" || value === "dark") return value;
  return null;
}

function coerceDarkTheme(value: unknown): DarkThemePreference | null {
  if (DARK_THEMES.includes(value as DarkThemePreference)) return value as DarkThemePreference;
  return null;
}

function getStoredPreference(): ColorSchemePreference | null {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return coercePreference((parsed as Record<string, unknown>).colorScheme);
  } catch {
    return null;
  }
}

function getStoredDarkTheme(): DarkThemePreference | null {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return coerceDarkTheme((parsed as Record<string, unknown>).darkTheme);
  } catch {
    return null;
  }
}

export function applyColorSchemePreference(preference: ColorSchemePreference) {
  if (typeof window === "undefined") return;
  currentPreference = preference;

  if (preference === "dark") {
    applySystemColorScheme(true);
    return;
  }

  if (preference === "light") {
    applySystemColorScheme(false);
    return;
  }

  const media = mediaQuery ?? window.matchMedia(COLOR_SCHEME_MEDIA);
  mediaQuery = media;
  applySystemColorScheme(media.matches);
}

export function applyDarkThemePreference(theme: DarkThemePreference) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  root.classList.remove(...DARK_THEME_CLASSES);
  root.classList.add(`${DARK_THEME_CLASS_PREFIX}${theme}`);
}

export function initSystemColorScheme() {
  if (typeof window === "undefined") return;

  // Prevent duplicate listeners during Vite HMR / multiple inits.
  if (window.__calendar365SystemColorSchemeInitialized) return;
  window.__calendar365SystemColorSchemeInitialized = true;

  const media = window.matchMedia(COLOR_SCHEME_MEDIA);
  mediaQuery = media;
  const updateFromSystem = () => {
    if (currentPreference !== "system") return;
    applySystemColorScheme(media.matches);
  };

  applyColorSchemePreference(getStoredPreference() ?? "system");
  applyDarkThemePreference(getStoredDarkTheme() ?? DEFAULT_DARK_THEME);

  if ("addEventListener" in media) {
    media.addEventListener("change", updateFromSystem);
  } else {
    // Safari < 14
    media.addListener(updateFromSystem);
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== SETTINGS_KEY) return;
    applyColorSchemePreference(getStoredPreference() ?? "system");
    applyDarkThemePreference(getStoredDarkTheme() ?? DEFAULT_DARK_THEME);
  });
}

declare global {
  interface Window {
    __calendar365SystemColorSchemeInitialized?: boolean;
  }
}
