import { Link, useLocation } from "react-router-dom";

export function LegalLinks() {
  const location = useLocation();
  const isLegalPage = location.pathname === "/imprint" || location.pathname === "/privacy";

  if (isLegalPage) return null;

  return (
    <div
      className="fixed bottom-4 left-4 z-50 rounded-full border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur-sm"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3">
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
