import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { usePublicShareLinks, type PublicShareLink, type ShareLinkPermission } from "@/hooks/usePublicShareLinks";
import type { CalendarSummary } from "@/hooks/useCalendars";
import { Copy, ExternalLink, Link2, Lock, Pencil, Plus, Trash2, Eye, Edit3, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PublicShareLinksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendars: CalendarSummary[];
  shareBaseUrl?: string | null;
}

type DialogMode = "list" | "create" | "edit";

const permissionLabels: Record<ShareLinkPermission, string> = {
  viewer: "View only",
  editor: "Can edit",
};

export function PublicShareLinksDialog({
  open,
  onOpenChange,
  calendars,
  shareBaseUrl,
}: PublicShareLinksDialogProps) {
  const { toast } = useToast();
  const { activeLinks, revokedLinks, isLoading, refresh, createLink, updateLink, revokeLink } = usePublicShareLinks();

  const [mode, setMode] = useState<DialogMode>("list");
  const [editingLink, setEditingLink] = useState<PublicShareLink | null>(null);
  const [showRevoked, setShowRevoked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [slug, setSlug] = useState("");
  const [permission, setPermission] = useState<ShareLinkPermission>("viewer");
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [removePassword, setRemovePassword] = useState(false);

  // Calendars user can share (owner or editor)
  const shareableCalendars = useMemo(
    () => calendars.filter((c) => c.role === "owner" || c.role === "editor"),
    [calendars]
  );

  const normalizedShareBaseUrl = useMemo(() => {
    const candidate = (shareBaseUrl ?? window.location.origin).trim().replace(/\/+$/, "");
    try {
      const url = new URL(candidate);
      return url.origin;
    } catch {
      return window.location.origin;
    }
  }, [shareBaseUrl]);

  const resetForm = useCallback(() => {
    setSlug("");
    setPermission("viewer");
    setSelectedCalendarIds([]);
    setPasswordEnabled(false);
    setPassword("");
    setRemovePassword(false);
  }, []);

  useEffect(() => {
    if (!open) {
      setMode("list");
      setEditingLink(null);
      resetForm();
    }
  }, [open, resetForm]);

  useEffect(() => {
    if (mode === "create") {
      resetForm();
      // Pre-select first calendar if available
      if (shareableCalendars.length > 0) {
        setSelectedCalendarIds([shareableCalendars[0].id]);
        // Generate a default slug from first calendar name
        const defaultSlug = shareableCalendars[0].name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9-]+/g, "-")
          .replace(/(^-+)|(-+$)/g, "")
          .slice(0, 64);
        setSlug(defaultSlug || "my-calendar");
      }
    } else if (mode === "edit" && editingLink) {
      setSlug(editingLink.slug);
      setPermission(editingLink.permission);
      setSelectedCalendarIds(editingLink.calendars.map((c) => c.id));
      setPasswordEnabled(editingLink.hasPassword);
      setPassword("");
      setRemovePassword(false);
    }
  }, [mode, editingLink, shareableCalendars, resetForm]);

  const handleCreate = async () => {
    const normalizedSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/(^-+)|(-+$)/g, "");

    if (!normalizedSlug || normalizedSlug.length < 3) {
      toast({ title: "Link name too short", description: "Minimum 3 characters", variant: "destructive" });
      return;
    }

    if (selectedCalendarIds.length === 0) {
      toast({ title: "No calendars selected", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const result = await createLink({
      slug: normalizedSlug,
      permission,
      calendarIds: selectedCalendarIds,
      password: passwordEnabled && password ? password : null,
    });
    setIsSaving(false);

    if (!result.ok) {
      toast({ title: "Couldn't create link", description: result.error, variant: "destructive" });
      return;
    }

    toast({ title: "Link created" });
    setMode("list");
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingLink) return;

    const normalizedSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/(^-+)|(-+$)/g, "");

    if (!normalizedSlug || normalizedSlug.length < 3) {
      toast({ title: "Link name too short", description: "Minimum 3 characters", variant: "destructive" });
      return;
    }

    if (selectedCalendarIds.length === 0) {
      toast({ title: "No calendars selected", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const result = await updateLink({
      shareLinkId: editingLink.id,
      slug: normalizedSlug !== editingLink.slug ? normalizedSlug : undefined,
      permission: permission !== editingLink.permission ? permission : undefined,
      calendarIds: selectedCalendarIds,
      password: passwordEnabled && password ? password : null,
      removePassword: removePassword,
    });
    setIsSaving(false);

    if (!result.ok) {
      toast({ title: "Couldn't update link", description: result.error, variant: "destructive" });
      return;
    }

    toast({ title: "Link updated" });
    setMode("list");
    setEditingLink(null);
    resetForm();
  };

  const handleRevoke = async (link: PublicShareLink) => {
    setIsSaving(true);
    const result = await revokeLink(link.id);
    setIsSaving(false);

    if (!result.ok) {
      toast({ title: "Couldn't disable link", description: result.error, variant: "destructive" });
      return;
    }

    toast({ title: "Link disabled" });
  };

  const handleCopy = async (link: PublicShareLink) => {
    const url = `${normalizedShareBaseUrl}/s/${encodeURIComponent(link.slug)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Copy failed", description: url, variant: "destructive" });
    }
  };

  const handleOpenLink = (link: PublicShareLink) => {
    const url = `${normalizedShareBaseUrl}/s/${encodeURIComponent(link.slug)}`;
    window.open(url, "_blank");
  };

  const toggleCalendar = (calendarId: string) => {
    setSelectedCalendarIds((prev) =>
      prev.includes(calendarId) ? prev.filter((id) => id !== calendarId) : [...prev, calendarId]
    );
  };

  // List view
  if (mode === "list") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide text-primary flex items-center gap-2">
              <Link2 className="h-6 w-6" />
              Public Share Links
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Manage shareable links to your calendars. Anyone with the link can view or edit (depending on permission).
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {activeLinks.length === 0 && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No active share links</p>
                <p className="text-xs mt-1">Create a link to share your calendar with others</p>
              </div>
            )}

            {activeLinks.length > 0 && (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-3 pr-4">
                  {activeLinks.map((link) => (
                    <LinkCard
                      key={link.id}
                      link={link}
                      baseUrl={normalizedShareBaseUrl}
                      onEdit={() => {
                        setEditingLink(link);
                        setMode("edit");
                      }}
                      onCopy={() => handleCopy(link)}
                      onOpen={() => handleOpenLink(link)}
                      onRevoke={() => handleRevoke(link)}
                      disabled={isSaving}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}

            {revokedLinks.length > 0 && (
              <>
                <Separator />
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowRevoked(!showRevoked)}
                >
                  {showRevoked ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {revokedLinks.length} disabled link{revokedLinks.length !== 1 ? "s" : ""}
                </button>

                {showRevoked && (
                  <ScrollArea className="max-h-[150px]">
                    <div className="space-y-2 pr-4">
                      {revokedLinks.map((link) => (
                        <div
                          key={link.id}
                          className="p-3 rounded-lg bg-muted/50 border border-border/50 opacity-60"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">/s/{link.slug}</span>
                            <Badge variant="secondary" className="text-xs">Disabled</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {link.calendars.map((c) => c.name).join(", ")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              onClick={() => setMode("create")}
              disabled={shareableCalendars.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Create/Edit form view
  const isEditing = mode === "edit";
  const formTitle = isEditing ? "Edit Link" : "Create New Link";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide text-primary">
            {formTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Slug */}
          <div className="grid gap-2">
            <Label htmlFor="share-slug">Link name</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/s/</span>
              <Input
                id="share-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-calendar"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Allowed: a–z, 0–9, and "-" (3–64 characters)
            </p>
          </div>

          {/* Permission */}
          <div className="grid gap-2">
            <Label>Permission</Label>
            <Select value={permission} onValueChange={(v) => setPermission(v as ShareLinkPermission)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">
                  <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    View only
                  </span>
                </SelectItem>
                <SelectItem value="editor">
                  <span className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4" />
                    Can edit
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {permission === "editor"
                ? "Anyone with this link can add, edit, and delete notes"
                : "Anyone with this link can only view the calendar"}
            </p>
          </div>

          {/* Calendars selection */}
          <div className="grid gap-2">
            <Label>Calendars to share</Label>
            <div className="border rounded-lg p-3 space-y-2 max-h-[150px] overflow-y-auto">
              {shareableCalendars.length === 0 ? (
                <p className="text-sm text-muted-foreground">No calendars available to share</p>
              ) : (
                shareableCalendars.map((cal) => (
                  <label
                    key={cal.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded p-1 -m-1"
                  >
                    <Checkbox
                      checked={selectedCalendarIds.includes(cal.id)}
                      onCheckedChange={() => toggleCalendar(cal.id)}
                    />
                    <span className="text-sm">{cal.name}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {cal.role}
                    </Badge>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Select which calendars can be accessed via this link
            </p>
          </div>

          {/* Password */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Password protection</Label>
              <Button
                type="button"
                variant={passwordEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (passwordEnabled && isEditing && editingLink?.hasPassword) {
                    setRemovePassword(true);
                  }
                  setPasswordEnabled(!passwordEnabled);
                }}
              >
                <Lock className="h-3 w-3 mr-1" />
                {passwordEnabled ? "On" : "Off"}
              </Button>
            </div>
            {passwordEnabled && (
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditing && editingLink?.hasPassword && !removePassword ? "Password set (hidden)" : "Enter password"}
              />
            )}
            {!passwordEnabled && isEditing && editingLink?.hasPassword && (
              <p className="text-xs text-amber-600">Password protection will be removed</p>
            )}
          </div>

          {/* Preview */}
          <div className="grid gap-2">
            <Label>Link preview</Label>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <code className="text-sm flex-1 truncate">
                {normalizedShareBaseUrl}/s/{slug || "..."}
              </code>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              setMode("list");
              setEditingLink(null);
              resetForm();
            }}
          >
            Back
          </Button>
          <Button
            onClick={isEditing ? handleUpdate : handleCreate}
            disabled={isSaving || selectedCalendarIds.length === 0 || !slug.trim()}
          >
            {isSaving ? "Saving…" : isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Link card component
interface LinkCardProps {
  link: PublicShareLink;
  baseUrl: string;
  onEdit: () => void;
  onCopy: () => void;
  onOpen: () => void;
  onRevoke: () => void;
  disabled?: boolean;
}

function LinkCard({ link, baseUrl, onEdit, onCopy, onOpen, onRevoke, disabled }: LinkCardProps) {
  return (
    <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <code className="text-sm font-semibold truncate">/s/{link.slug}</code>
            {link.hasPassword && <Lock className="h-3 w-3 text-muted-foreground" title="Password protected" />}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant={link.permission === "editor" ? "default" : "secondary"}
              className={cn(
                "text-xs",
                link.permission === "editor" && "bg-green-600 hover:bg-green-700"
              )}
            >
              {link.permission === "editor" ? (
                <><Edit3 className="h-3 w-3 mr-1" /> Can edit</>
              ) : (
                <><Eye className="h-3 w-3 mr-1" /> View only</>
              )}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Calendars:</span>{" "}
            {link.calendars.length > 0 ? link.calendars.map((c) => c.name).join(", ") : "None"}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onCopy} disabled={disabled} title="Copy link">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onOpen} disabled={disabled} title="Open link">
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit} disabled={disabled} title="Edit link">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRevoke}
            disabled={disabled}
            title="Disable link"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

