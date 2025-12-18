import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StickyColor, StickyNote } from '@/types/calendar';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
  existingNote?: StickyNote | null;
  onSave: (text: string, color: StickyColor) => Promise<boolean> | boolean;
  onDelete?: () => void;
  onMove?: (newDate: string | null) => Promise<boolean> | boolean;
}

const colors: { value: StickyColor; className: string; label: string }[] = [
  { value: 'yellow', className: 'bg-sticky-yellow', label: 'Yellow' },
  { value: 'pink', className: 'bg-sticky-pink', label: 'Pink' },
  { value: 'green', className: 'bg-sticky-green', label: 'Green' },
  { value: 'blue', className: 'bg-sticky-blue', label: 'Blue' },
  { value: 'orange', className: 'bg-sticky-orange', label: 'Orange' },
  { value: 'purple', className: 'bg-sticky-purple', label: 'Purple' },
];

export function NoteDialog({
  open,
  onOpenChange,
  date,
  existingNote,
  onSave,
  onDelete,
  onMove,
}: NoteDialogProps) {
  const [text, setText] = useState('');
  const [color, setColor] = useState<StickyColor>('yellow');
  const [newDate, setNewDate] = useState<string>('');

  useEffect(() => {
    if (existingNote) {
      setText(existingNote.text);
      setColor(existingNote.color);
      setNewDate(existingNote.date ?? '');
    } else {
      setText('');
      setColor('yellow');
      setNewDate(date || '');
    }
  }, [existingNote, open, date]);

  const handleSave = async () => {
    if (text.trim()) {
      const normalizedExistingDate = existingNote?.date ?? null;
      const normalizedNewDate = newDate.trim() ? newDate : null;

      // Check if date changed for existing note
      if (existingNote && normalizedNewDate !== normalizedExistingDate && onMove) {
        const moved = await onMove(normalizedNewDate);
        if (moved === false) return;
      }
      const saved = await onSave(text.trim(), color);
      if (saved === false) return;
      onOpenChange(false);
    }
  };

  const handleTextKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key !== 'Enter') return;
    if (e.shiftKey) return;
    if (e.nativeEvent.isComposing) return;
    if (!text.trim()) return;

    e.preventDefault();
    e.stopPropagation();
    handleSave();
  };

  const formatDateDisplay = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl tracking-wide text-primary">
            {existingNote ? 'Edit Note' : 'Add Note'}
          </DialogTitle>
          {!existingNote && (
            <p className="text-sm text-muted-foreground">
              {date ? formatDateDisplay(date) : 'Inbox (no date yet)'}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date picker for existing notes */}
          {existingNote && (
            <div className="space-y-2">
              <Label htmlFor="note-date" className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="w-4 h-4" />
                {existingNote.date ? 'Move to date' : 'Assign date'} (connected notes may move too)
              </Label>
              <Input
                id="note-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          <div className="flex gap-2 justify-center">
            {colors.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                className={cn(
                  'w-8 h-8 rounded-full transition-all border-2',
                  c.className,
                  color === c.value
                    ? 'ring-2 ring-offset-2 ring-primary border-primary'
                    : 'border-transparent hover:scale-110'
                )}
                title={c.label}
              />
            ))}
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleTextKeyDown}
            placeholder="Write your note..."
            className="min-h-[100px] resize-none"
            autoFocus
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {existingNote && onDelete && (
            <Button variant="destructive" onClick={onDelete} className="mr-auto">
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!text.trim()}>
            Save Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
