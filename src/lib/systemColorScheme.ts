import { SETTINGS_KEY } from "@/lib/settingsStorage";

const COLOR_SCHEME_MEDIA = "(prefers-color-scheme: dark)";

function applySystemColorScheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export type ColorSchemePreference = "system" | "light" | "dark";

let currentPreference: ColorSchemePreference = "system";
let mediaQuery: MediaQueryList | null = null;

function coercePreference(value: unknown): ColorSchemePreference | null {
  if (value === "system" || value === "light" || value === "dark") return value;
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

  if ("addEventListener" in media) {
    media.addEventListener("change", updateFromSystem);
  } else {
    // Safari < 14
    media.addListener(updateFromSystem);
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== SETTINGS_KEY) return;
    applyColorSchemePreference(getStoredPreference() ?? "system");
  });
}

declare global {
  interface Window {
    __calendar365SystemColorSchemeInitialized?: boolean;
  }
}
