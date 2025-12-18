import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface CreateCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => Promise<string | null>;
}

export function CreateCalendarDialog({ open, onOpenChange, onCreate }: CreateCalendarDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!open) setName("");
  }, [open]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    setIsCreating(true);
    const id = await onCreate(trimmed);
    setIsCreating(false);
    if (!id) {
      toast({ title: "Kalender konnte nicht erstellt werden", variant: "destructive" });
      return;
    }
    toast({ title: "Kalender erstellt" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide text-primary">Neuer Kalender</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="calendar-name">Name</Label>
          <Input
            id="calendar-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Familie, WG, Urlaub…"
            autoFocus
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Erstelle…" : "Erstellen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

