import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CalendarMemberRole, CalendarSummary } from "@/hooks/useCalendars";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCalendarPublicShare } from "@/hooks/useCalendarPublicShare";

interface CalendarShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendar: CalendarSummary | null;
  shareBaseUrl: string | null;
  onCreateInvite: (role: CalendarMemberRole, expiresInDays: number) => Promise<string | null>;
}

const roleLabels: Record<CalendarMemberRole, string> = {
  owner: "Owner",
  editor: "Kann bearbeiten",
  viewer: "Nur ansehen",
};

export function CalendarShareDialog({ open, onOpenChange, calendar, shareBaseUrl, onCreateInvite }: CalendarShareDialogProps) {
  const { toast } = useToast();
  const { settings: publicShare, isLoading: publicShareLoading, setPublicShare, revokePublicShare } = useCalendarPublicShare(calendar?.id ?? null);
  const [role, setRole] = useState<CalendarMemberRole>("editor");
  const [expiresInDays, setExpiresInDays] = useState<string>("14");
  const [isCreating, setIsCreating] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [publicSlug, setPublicSlug] = useState<string>("");
  const [publicPasswordEnabled, setPublicPasswordEnabled] = useState(false);
  const [publicPassword, setPublicPassword] = useState("");
  const [isSavingPublic, setIsSavingPublic] = useState(false);
  const [activeTab, setActiveTab] = useState<"invite" | "public">("invite");

  const inviteUrl = useMemo(() => {
    if (!inviteToken) return null;
    return `${window.location.origin}/invite/${inviteToken}`;
  }, [inviteToken]);

  const normalizedShareBaseUrl = useMemo(() => {
    const candidate = (shareBaseUrl ?? window.location.origin).trim().replace(/\/+$/, "");
    try {
      const url = new URL(candidate);
      return url.origin;
    } catch {
      return window.location.origin;
    }
  }, [shareBaseUrl]);

  const canShare = Boolean(calendar) && (calendar?.role === "owner" || calendar?.role === "editor");

  useEffect(() => {
    if (!open) return;
    if (!calendar) return;
    const fallback = calendar.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/(^-+)|(-+$)/g, "")
      .slice(0, 64);

    setPublicSlug(publicShare?.slug ?? fallback);
    setPublicPasswordEnabled(Boolean(publicShare?.hasPassword));
    setPublicPassword("");
  }, [open, calendar, publicShare?.slug, publicShare?.hasPassword]);

  const publicLink = useMemo(() => {
    const slug = (publicShare?.slug ?? publicSlug).trim();
    if (!slug) return null;
    return `${normalizedShareBaseUrl}/s/${encodeURIComponent(slug)}`;
  }, [normalizedShareBaseUrl, publicShare?.slug, publicSlug]);

  const publicLinkWithPassword = useMemo(() => {
    if (!publicLink) return null;
    if (!publicPasswordEnabled) return null;
    if (!publicPassword) return null;
    return `${publicLink}#pw=${encodeURIComponent(publicPassword)}`;
  }, [publicLink, publicPasswordEnabled, publicPassword]);

  const isRenamingExistingPublicLink = useMemo(() => {
    if (!publicShare?.slug) return false;
    const normalizedNext = publicSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/(^-+)|(-+$)/g, "");
    return Boolean(normalizedNext) && normalizedNext !== publicShare.slug;
  }, [publicShare?.slug, publicSlug]);

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

  const handleCopyAny = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} kopiert` });
    } catch {
      toast({ title: "Kopieren fehlgeschlagen", description: value, variant: "destructive" });
    }
  };

  const handleSavePublic = async () => {
    if (!calendar) return;
    if (!canShare) return;
    const slug = publicSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/(^-+)|(-+$)/g, "");
    if (!slug) {
      toast({ title: "Bitte einen Link-Namen eingeben", variant: "destructive" });
      return;
    }
    setIsSavingPublic(true);
    const result = await setPublicShare({
      slug,
      password: publicPasswordEnabled ? (publicPassword || null) : null,
      removePassword: !publicPasswordEnabled && Boolean(publicShare?.hasPassword),
    });
    setIsSavingPublic(false);
    if (!result.ok) {
      toast({ title: "Konnte öffentlichen Link nicht speichern", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Öffentlicher Link aktualisiert" });
  };

  const handleRevokePublic = async () => {
    if (!calendar) return;
    if (!canShare) return;
    setIsSavingPublic(true);
    const result = await revokePublicShare();
    setIsSavingPublic(false);
    if (!result.ok) {
      toast({ title: "Konnte Link nicht deaktivieren", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Öffentlicher Link deaktiviert" });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setInviteToken(null);
      }}
    >
      <DialogContent className="sm:max-w-lg" data-tour-id="share-dialog">
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

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "invite" | "public")} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="invite">Einladung</TabsTrigger>
            <TabsTrigger value="public">Öffentlicher Link</TabsTrigger>
          </TabsList>

          <TabsContent value="invite">
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
          </TabsContent>

          <TabsContent value="public">
            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="public-slug">Link-Name (lesbar)</Label>
                <Input
                  id="public-slug"
                  value={publicSlug}
                  onChange={(e) => setPublicSlug(e.target.value)}
                  disabled={!canShare || publicShareLoading}
                  placeholder="mein-kalender"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">Erlaubt: a–z, 0–9 und „-“ (3–64 Zeichen).</p>
                {isRenamingExistingPublicLink ? (
                  <p className="text-xs text-muted-foreground">
                    Hinweis: Wenn du den Link-Namen änderst, wird der bisherige Link überschrieben und ist danach ungültig.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="public-password">Passwortschutz (optional)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={publicPasswordEnabled ? "default" : "outline"}
                    onClick={() => setPublicPasswordEnabled((v) => !v)}
                    disabled={!canShare || publicShareLoading}
                  >
                    {publicPasswordEnabled ? "Aktiv" : "Aus"}
                  </Button>
                  <Input
                    id="public-password"
                    type="password"
                    value={publicPassword}
                    onChange={(e) => setPublicPassword(e.target.value)}
                    disabled={!canShare || publicShareLoading || !publicPasswordEnabled}
                    placeholder={publicShare?.hasPassword && !publicPassword ? "Passwort gesetzt (versteckt)" : "Passwort eingeben"}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Das Passwort wird sicher gehasht gespeichert. Um einen „Link inkl. Passwort“ zu erzeugen, das Passwort hier einmal eingeben.
                </p>
              </div>

              {publicLink && (
                <div className="grid gap-2">
                  <Label>Öffentlicher Link</Label>
                  <div className="flex gap-2">
                    <Input value={publicLink} readOnly />
                    <Button variant="outline" onClick={() => handleCopyAny(publicLink, "Link")}>
                      Kopieren
                    </Button>
                  </div>
                </div>
              )}

              {publicLinkWithPassword && (
                <div className="grid gap-2">
                  <Label>Link inkl. Passwort</Label>
                  <div className="flex gap-2">
                    <Input value={publicLinkWithPassword} readOnly />
                    <Button variant="outline" onClick={() => handleCopyAny(publicLinkWithPassword, "Link inkl. Passwort")}>
                      Kopieren
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Nutzt einen URL-Fragment-Teil („#pw=…“), der nicht automatisch an Server mitgesendet wird.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
          {activeTab === "invite" ? (
            <Button onClick={handleCreate} disabled={!canShare || isCreating || !calendar}>
              {isCreating ? "Erstelle…" : "Einladungslink erstellen"}
            </Button>
          ) : (
            <div className="flex gap-2">
              {publicShare?.slug ? (
                <Button variant="outline" onClick={handleRevokePublic} disabled={!canShare || isSavingPublic || publicShareLoading}>
                  Deaktivieren
                </Button>
              ) : null}
              <Button onClick={handleSavePublic} disabled={!canShare || isSavingPublic || publicShareLoading}>
                {isSavingPublic ? "Speichere…" : "Speichern"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
