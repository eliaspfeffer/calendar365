import { Link, useLocation } from "react-router-dom";

export function LegalLinks() {
  const location = useLocation();
  const isLegalPage = location.pathname === "/imprint" || location.pathname === "/privacy";

  return (
    <div
      className="fixed bottom-4 left-4 z-50 rounded-full border border-border bg-card/90 px-3 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur-sm"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3">
        <Link
          to="/imprint"
          className={isLegalPage && location.pathname === "/imprint" ? "text-foreground underline underline-offset-4" : "hover:text-foreground"}
        >
          Imprint
        </Link>
        <span className="opacity-60">·</span>
        <Link
          to="/privacy"
          className={isLegalPage && location.pathname === "/privacy" ? "text-foreground underline underline-offset-4" : "hover:text-foreground"}
        >
          Privacy
        </Link>
      </div>
    </div>
  );
}

