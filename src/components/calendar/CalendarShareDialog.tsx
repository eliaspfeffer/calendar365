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
  editor: "Can edit",
  viewer: "View only",
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
      toast({ title: "Couldn’t create invite", variant: "destructive" });
      return;
    }
    setInviteToken(token);
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Copy failed", description: inviteUrl, variant: "destructive" });
    }
  };

  const handleCopyAny = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Copy failed", description: value, variant: "destructive" });
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
      toast({ title: "Please enter a link name", variant: "destructive" });
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
      toast({ title: "Couldn’t save public link", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Public link updated" });
  };

  const handleRevokePublic = async () => {
    if (!calendar) return;
    if (!canShare) return;
    setIsSavingPublic(true);
    const result = await revokePublicShare();
    setIsSavingPublic(false);
    if (!result.ok) {
      toast({ title: "Couldn’t disable link", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Public link disabled" });
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
          <DialogTitle className="font-display text-2xl tracking-wide text-primary">Share calendar</DialogTitle>
          {calendar ? (
            <p className="text-sm text-muted-foreground">
              {calendar.name} · {roleLabels[calendar.role]}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No calendar selected.</p>
          )}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "invite" | "public")} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="invite">Invite</TabsTrigger>
            <TabsTrigger value="public">Public link</TabsTrigger>
          </TabsList>

          <TabsContent value="invite">
            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label>Permissions</Label>
                <Select value={role} onValueChange={(v) => setRole(v as CalendarMemberRole)} disabled={!canShare}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Can edit</SelectItem>
                    <SelectItem value="viewer">View only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expires-days">Expires (days)</Label>
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
                  <Label>Invite link</Label>
                  <div className="flex gap-2">
                    <Input value={inviteUrl} readOnly />
                    <Button variant="outline" onClick={handleCopy}>
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Open (or forward) — signed-in users can then join the calendar.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="public">
            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="public-slug">Link name (readable)</Label>
                <Input
                  id="public-slug"
                  value={publicSlug}
                  onChange={(e) => setPublicSlug(e.target.value)}
                  disabled={!canShare || publicShareLoading}
                  placeholder="my-calendar"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">Allowed: a–z, 0–9, and “-” (3–64 characters).</p>
                {isRenamingExistingPublicLink ? (
                  <p className="text-xs text-muted-foreground">
                    Note: If you change the link name, the previous link will be overwritten and will become invalid.
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="public-password">Password protection (optional)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={publicPasswordEnabled ? "default" : "outline"}
                    onClick={() => setPublicPasswordEnabled((v) => !v)}
                    disabled={!canShare || publicShareLoading}
                  >
                    {publicPasswordEnabled ? "On" : "Off"}
                  </Button>
                  <Input
                    id="public-password"
                    type="password"
                    value={publicPassword}
                    onChange={(e) => setPublicPassword(e.target.value)}
                    disabled={!canShare || publicShareLoading || !publicPasswordEnabled}
                    placeholder={publicShare?.hasPassword && !publicPassword ? "Password set (hidden)" : "Enter password"}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  The password is stored as a secure hash. To create a “link with password”, enter the password here once.
                </p>
              </div>

              {publicLink && (
                <div className="grid gap-2">
                  <Label>Public link</Label>
                  <div className="flex gap-2">
                    <Input value={publicLink} readOnly />
                    <Button variant="outline" onClick={() => handleCopyAny(publicLink, "Link")}>
                      Copy
                    </Button>
                  </div>
                </div>
              )}

              {publicLinkWithPassword && (
                <div className="grid gap-2">
                  <Label>Link with password</Label>
                  <div className="flex gap-2">
                    <Input value={publicLinkWithPassword} readOnly />
                    <Button variant="outline" onClick={() => handleCopyAny(publicLinkWithPassword, "Link with password")}>
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Uses a URL fragment (“#pw=…”) which is not automatically sent to servers.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {activeTab === "invite" ? (
            <Button onClick={handleCreate} disabled={!canShare || isCreating || !calendar}>
              {isCreating ? "Creating…" : "Create invite link"}
            </Button>
          ) : (
            <div className="flex gap-2">
              {publicShare?.slug ? (
                <Button variant="outline" onClick={handleRevokePublic} disabled={!canShare || isSavingPublic || publicShareLoading}>
                  Disable
                </Button>
              ) : null}
              <Button onClick={handleSavePublic} disabled={!canShare || isSavingPublic || publicShareLoading}>
                {isSavingPublic ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
