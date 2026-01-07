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
      toast({ title: `${label} copied` });
    } catch {
      toast({ title: "Copy failed", description: value, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-tour-id="share-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide text-primary">Share calendar (demo)</DialogTitle>
          <p className="text-sm text-muted-foreground">{calendarName}</p>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "invite" | "public")} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="invite">Invite</TabsTrigger>
            <TabsTrigger value="public">Public link</TabsTrigger>
          </TabsList>

          <TabsContent value="invite">
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                In full mode you can create a link that others can use to join — with permissions like
                <span className="font-medium"> Can edit</span> or <span className="font-medium">View only</span>.
              </p>
              <div className="grid gap-2">
                <Label>Invite link (example)</Label>
                <div className="flex gap-2">
                  <Input value={exampleInviteUrl} readOnly />
                  <Button variant="outline" onClick={() => copy(exampleInviteUrl, "Link")}>
                    Copy
                  </Button>
                </div>
              </div>
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                To actually share: please sign in / register.
              </div>
            </div>
          </TabsContent>

          <TabsContent value="public">
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                You can create a public share link (optionally password-protected) — ideal for “view only”.
              </p>
              <div className="grid gap-2">
                <Label>Public link (example)</Label>
                <div className="flex gap-2">
                  <Input value={examplePublicUrl} readOnly />
                  <Button variant="outline" onClick={() => copy(examplePublicUrl, "Link")}>
                    Copy
                  </Button>
                </div>
              </div>
              <div className="rounded-md border p-3 text-sm text-muted-foreground">
                To enable / set a password: please sign in / register.
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
