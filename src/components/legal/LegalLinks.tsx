import { Link, useLocation } from "react-router-dom";

export function LegalLinks() {
  const location = useLocation();
  const isLegalPage = location.pathname === "/imprint" || location.pathname === "/privacy";

  if (isLegalPage) return null;

  return (
    <div
      className="fixed bottom-4 left-4 z-50 max-w-[calc(100vw-2rem-11rem)] overflow-x-auto rounded-full border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur-sm touch-auto max-[360px]:max-w-[calc(100vw-2rem-14rem)] sm:max-w-none"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex min-w-max items-center gap-3 whitespace-nowrap">
        <Link
          to="/imprint"
          state={{ backgroundLocation: location }}
          className="hover:text-foreground"
        >
          Imprint
        </Link>
        <span className="opacity-60">·</span>
        <Link
          to="/privacy"
          state={{ backgroundLocation: location }}
          className="hover:text-foreground"
        >
          Privacy
        </Link>
      </div>
    </div>
  );
}
