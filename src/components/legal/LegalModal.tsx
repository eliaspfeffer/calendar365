import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ImprintContent } from "@/components/legal/ImprintContent";
import { PrivacyContent } from "@/components/legal/PrivacyContent";

type LegalKind = "imprint" | "privacy";

function useCloseToBackground() {
  const navigate = useNavigate();
  const location = useLocation();
  const backgroundLocation = (location.state as { backgroundLocation?: unknown } | null)?.backgroundLocation;

  return () => {
    if (backgroundLocation) {
      navigate(-1);
      return;
    }
    navigate("/");
  };
}

export function LegalModal({ kind }: { kind: LegalKind }) {
  const close = useCloseToBackground();

  return (
    <Dialog open onOpenChange={(open) => (!open ? close() : undefined)}>
      <DialogContent className="max-w-3xl p-0">
        <ScrollArea className="max-h-[80vh] p-6">
          {kind === "imprint" ? <ImprintContent /> : <PrivacyContent />}
        </ScrollArea>
        <DialogFooter className="border-t bg-muted/30 px-6 py-4">
          <Button variant="outline" onClick={close}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

