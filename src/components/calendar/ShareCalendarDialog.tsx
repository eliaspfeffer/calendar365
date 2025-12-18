import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { shortId, type CalendarShareRole } from "@/lib/calendarSharing";
import { isMissingTableOrSchemaCacheError } from "@/lib/supabaseErrorUtils";

type MemberRow = {
  id: string;
  member_id: string;
  role: string;
  label: string | null;
  created_at: string;
};

type ShareLinkRow = {
  token: string;
  role: string;
  expires_at: string | null;
  created_at: string;
};

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

export function ShareCalendarDialog({
  open,
  onOpenChange,
  ownerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string;
}) {
  const { toast } = useToast();
  const [role, setRole] = useState<CalendarShareRole>("editor");
  const [expiresInDays, setExpiresInDays] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string>("");

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [links, setLinks] = useState<ShareLinkRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [schemaReady, setSchemaReady] = useState(true);

  const expiresAt = useMemo(() => {
    const days = Number(expiresInDays);
    if (!Number.isFinite(days) || days <= 0) return null;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }, [expiresInDays]);

  useEffect(() => {
    if (!open) return;

    const fetchAll = async () => {
      setIsLoading(true);
      const [{ data: memberData, error: memberError }, { data: linkData, error: linkError }] =
        await Promise.all([
          supabase
            .from("calendar_members")
            .select("id, member_id, role, label, created_at")
            .eq("owner_id", ownerId)
            .order("created_at", { ascending: true }),
          supabase
            .from("calendar_share_links")
            .select("token, role, expires_at, created_at")
            .eq("owner_id", ownerId)
            .order("created_at", { ascending: false }),
        ]);

      const missingSchema =
        isMissingTableOrSchemaCacheError(memberError) ||
        isMissingTableOrSchemaCacheError(linkError);
      setSchemaReady(!missingSchema);

      if (missingSchema) {
        toast({
          title: "Sharing not set up yet",
          description:
            "Your Supabase project is missing the sharing tables (or the schema cache is stale). Apply the migration in calendar365/supabase/migrations and reload the API schema cache.",
          variant: "destructive",
        });
      } else {
        if (memberError) console.error("Error fetching members:", memberError);
        if (linkError) console.error("Error fetching share links:", linkError);
      }

      setMembers((memberData ?? []) as any);
      setLinks((linkData ?? []) as any);
      setIsLoading(false);
    };

    fetchAll();
  }, [open, ownerId, toast]);

  const handleCreateLink = async () => {
    if (!schemaReady) {
      toast({
        title: "Sharing not available",
        description:
          "Run the Supabase migration in calendar365/supabase/migrations and reload the schema cache, then try again.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from("calendar_share_links")
      .insert({
        owner_id: ownerId,
        role,
        expires_at: expiresAt,
      })
      .select("token, role, expires_at, created_at")
      .single();

    setIsLoading(false);

    if (error) {
      if (isMissingTableOrSchemaCacheError(error)) {
        setSchemaReady(false);
        toast({
          title: "Sharing tables missing",
          description:
            "Your Supabase project hasn’t been migrated yet (or the schema cache is stale). Apply calendar365/supabase/migrations/20251218194500_8b2a8b6a-5f1e-4b83-9f49-7e1cb6a01f2a.sql and reload the API schema cache.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Couldn’t create share link",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const url = `${window.location.origin}/join/${data.token}`;
    setShareUrl(url);
    setLinks((prev) => [
      {
        token: data.token,
        role: data.role,
        expires_at: data.expires_at,
        created_at: data.created_at,
      },
      ...prev,
    ]);
    toast({ title: "Share link created" });
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await copyToClipboard(shareUrl);
      toast({ title: "Copied link" });
    } catch (e) {
      toast({
        title: "Couldn’t copy",
        description: e instanceof Error ? e.message : "Clipboard unavailable",
        variant: "destructive",
      });
    }
  };

  const handleRevokeLink = async (token: string) => {
    setIsLoading(true);
    const { error } = await supabase.from("calendar_share_links").delete().eq("token", token);
    setIsLoading(false);
    if (error) {
      toast({
        title: "Couldn’t revoke link",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setLinks((prev) => prev.filter((l) => l.token !== token));
    toast({ title: "Link revoked" });
  };

  const handleRemoveMember = async (memberRowId: string) => {
    setIsLoading(true);
    const { error } = await supabase.from("calendar_members").delete().eq("id", memberRowId);
    setIsLoading(false);
    if (error) {
      toast({
        title: "Couldn’t remove member",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== memberRowId));
    toast({ title: "Access removed" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide text-primary">
            Share your calendar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-2">
              <Label>Permission</Label>
              <Select value={role} onValueChange={(v) => setRole(v as CalendarShareRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">View only</SelectItem>
                  <SelectItem value="editor">Can edit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Expires (days)</Label>
              <Input
                inputMode="numeric"
                placeholder="never"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                disabled={!schemaReady}
              />
            </div>

            <Button onClick={handleCreateLink} disabled={isLoading || !schemaReady}>
              Create link
            </Button>
          </div>

          {shareUrl && (
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly />
              <Button variant="outline" onClick={handleCopy}>
                Copy
              </Button>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">Active links</div>
            {links.length === 0 ? (
              <div className="text-sm text-muted-foreground">No share links yet.</div>
            ) : (
              <div className="space-y-2">
                {links.map((l) => (
                  <div
                    key={l.token}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <div className="text-sm">
                      <div className="font-medium">
                        {l.role === "editor" ? "Can edit" : "View only"} · token {shortId(l.token)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {l.expires_at ? `expires ${new Date(l.expires_at).toLocaleString()}` : "no expiry"}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeLink(l.token)}
                      disabled={isLoading}
                    >
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">People with access</div>
            {members.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nobody has joined yet.</div>
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <div className="text-sm">
                      <div className="font-medium">
                        {m.label?.trim() || `User ${shortId(m.member_id)}`} ·{" "}
                        {m.role === "editor" ? "can edit" : "view only"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        joined {new Date(m.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveMember(m.id)}
                      disabled={isLoading}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
