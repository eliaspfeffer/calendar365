import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { DonateDialog } from "@/components/payments/DonateDialog";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlement } from "@/hooks/useEntitlement";

export function LegalLinks() {
  const location = useLocation();
  const isLegalPage = location.pathname === "/imprint" || location.pathname === "/privacy";
  const [donateOpen, setDonateOpen] = useState(false);
  const { user } = useAuth();
  const entitlement = useEntitlement(user?.id ?? null);

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
        <span className="opacity-60">·</span>
        <button type="button" className="hover:text-foreground" onClick={() => setDonateOpen(true)}>
          Donate
        </button>
      </div>
      <DonateDialog open={donateOpen} onOpenChange={setDonateOpen} onUnlocked={entitlement.refresh} />
    </div>
  );
}
