import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CalendarMemberRole, CalendarSummary } from "@/hooks/useCalendars";
import { useToast } from "@/hooks/use-toast";

interface CalendarShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendar: CalendarSummary | null;
  onCreateInvite: (role: CalendarMemberRole, expiresInDays: number) => Promise<string | null>;
}

const roleLabels: Record<CalendarMemberRole, string> = {
  owner: "Owner",
  editor: "Kann bearbeiten",
  viewer: "Nur ansehen",
};

export function CalendarShareDialog({ open, onOpenChange, calendar, onCreateInvite }: CalendarShareDialogProps) {
  const { toast } = useToast();
  const [role, setRole] = useState<CalendarMemberRole>("editor");
  const [expiresInDays, setExpiresInDays] = useState<string>("14");
  const [isCreating, setIsCreating] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  const inviteUrl = useMemo(() => {
    if (!inviteToken) return null;
    return `${window.location.origin}/invite/${inviteToken}`;
  }, [inviteToken]);

  const canShare = Boolean(calendar) && (calendar?.role === "owner" || calendar?.role === "editor");

  const handleCreate = async () => {
    if (!calendar) return;
    if (!canShare) return;
    setIsCreating(true);
    const days = Number.parseInt(expiresInDays, 10);
    const token = await onCreateInvite(role, Number.isFinite(days) ? days : 14);
    setIsCreating(false);
    if (!token) {
      toast({ title: "Einladung konnte nicht erstellt werden", variant: "destructive" });
      return;
    }
    setInviteToken(token);
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({ title: "Link kopiert" });
    } catch {
      toast({ title: "Kopieren fehlgeschlagen", description: inviteUrl, variant: "destructive" });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setInviteToken(null);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide text-primary">Kalender teilen</DialogTitle>
          {calendar ? (
            <p className="text-sm text-muted-foreground">
              {calendar.name} · {roleLabels[calendar.role]}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Kein Kalender ausgewählt.</p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-2">
            <Label>Rechte</Label>
            <Select value={role} onValueChange={(v) => setRole(v as CalendarMemberRole)} disabled={!canShare}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Kann bearbeiten</SelectItem>
                <SelectItem value="viewer">Nur ansehen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="expires-days">Gültigkeit (Tage)</Label>
            <Input
              id="expires-days"
              inputMode="numeric"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              disabled={!canShare}
            />
          </div>

          {inviteUrl && (
            <div className="grid gap-2">
              <Label>Einladungslink</Label>
              <div className="flex gap-2">
                <Input value={inviteUrl} readOnly />
                <Button variant="outline" onClick={handleCopy}>
                  Kopieren
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Öffnen (oder weiterleiten) – eingeloggte Nutzer können dann dem Kalender beitreten.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
          <Button onClick={handleCreate} disabled={!canShare || isCreating || !calendar}>
            {isCreating ? "Erstelle…" : "Einladungslink erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

