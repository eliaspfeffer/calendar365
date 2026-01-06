import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function DemoCalendarShareDialog({
  open,
  onOpenChange,
  calendarName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendarName: string;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"invite" | "public">("invite");

  const exampleInviteUrl = useMemo(() => `${window.location.origin}/invite/demo-token`, []);
  const examplePublicUrl = useMemo(() => `${window.location.origin}/s/demo-calendar`, []);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} kopiert` });
    } catch {
      toast({ title: "Kopieren fehlgeschlagen", description: value, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-tour-id="share-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide text-primary">Kalender teilen (Demo)</DialogTitle>
          <p className="text-sm text-muted-foreground">{calendarName}</p>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "invite" | "public")} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="invite">Einladung</TabsTrigger>
            <TabsTrigger value="public">Öffentlicher Link</TabsTrigger>
          </TabsList>

          <TabsContent value="invite">
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Im echten Modus kannst du einen Link erstellen, mit dem andere beitreten können — mit Rechten wie
                <span className="font-medium"> Kann bearbeiten</span> oder <span className="font-medium">Nur ansehen</span>.
              </p>
              <div className="grid gap-2">
                <Label>Einladungslink (Beispiel)</Label>
                <div className="flex gap-2">
                  <Input value={exampleInviteUrl} readOnly />
                  <Button variant="outline" onClick={() => copy(exampleInviteUrl, "Link")}>
                    Kopieren
                  </Button>
                </div>
              </div>
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                Zum Teilen wirklich nutzen: bitte einloggen/registrieren.
              </div>
            </div>
          </TabsContent>

          <TabsContent value="public">
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Du kannst einen öffentlichen Share-Link erstellen (optional passwortgeschützt) — ideal zum “nur ansehen”.
              </p>
              <div className="grid gap-2">
                <Label>Öffentlicher Link (Beispiel)</Label>
                <div className="flex gap-2">
                  <Input value={examplePublicUrl} readOnly />
                  <Button variant="outline" onClick={() => copy(examplePublicUrl, "Link")}>
                    Kopieren
                  </Button>
                </div>
              </div>
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                Zum Aktivieren/Passwort setzen: bitte einloggen/registrieren.
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

