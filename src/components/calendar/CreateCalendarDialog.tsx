import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { STICKY_NOTE_COLORS } from "@/lib/stickyNoteColors";
import type { StickyColor } from "@/types/calendar";
import { cn } from "@/lib/utils";

interface CreateCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, defaultNoteColor: StickyColor) => Promise<{ id: string | null; error?: string }>;
}

export function CreateCalendarDialog({ open, onOpenChange, onCreate }: CreateCalendarDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [defaultNoteColor, setDefaultNoteColor] = useState<StickyColor>("yellow");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setDefaultNoteColor("yellow");
    }
  }, [open]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    setIsCreating(true);
    const { id, error } = await onCreate(trimmed, defaultNoteColor);
    setIsCreating(false);
    if (!id) {
      toast({
        title: "Kalender konnte nicht erstellt werden",
        description: error,
        variant: "destructive",
      });
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

        <div className="space-y-2">
          <Label>Standard-Notizfarbe</Label>
          <div className="flex gap-2 justify-center">
            {STICKY_NOTE_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setDefaultNoteColor(c.value)}
                className={cn(
                  "w-8 h-8 rounded-full transition-all border-2",
                  c.className,
                  defaultNoteColor === c.value
                    ? "ring-2 ring-offset-2 ring-primary border-primary"
                    : "border-transparent hover:scale-110"
                )}
                title={c.label}
              />
            ))}
          </div>
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
