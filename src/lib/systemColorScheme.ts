const COLOR_SCHEME_MEDIA = "(prefers-color-scheme: dark)";

function applySystemColorScheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export function initSystemColorScheme() {
  if (typeof window === "undefined") return;

  // Prevent duplicate listeners during Vite HMR / multiple inits.
  if (window.__calendar365SystemColorSchemeInitialized) return;
  window.__calendar365SystemColorSchemeInitialized = true;

  const media = window.matchMedia(COLOR_SCHEME_MEDIA);
  const update = () => applySystemColorScheme(media.matches);

  update();

  if ("addEventListener" in media) {
    media.addEventListener("change", update);
  } else {
    // Safari < 14
    media.addListener(update);
  }
}

declare global {
  interface Window {
    __calendar365SystemColorSchemeInitialized?: boolean;
  }
}
