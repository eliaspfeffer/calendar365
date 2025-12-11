import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TextOverflowMode } from '@/hooks/useSettings';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  textOverflowMode: TextOverflowMode;
  onTextOverflowModeChange: (mode: TextOverflowMode) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  textOverflowMode,
  onTextOverflowModeChange,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-base font-medium">Sticky Note Text Overflow</Label>
            <RadioGroup
              value={textOverflowMode}
              onValueChange={(value) => onTextOverflowModeChange(value as TextOverflowMode)}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="scroll" id="scroll" className="mt-1" />
                <Label htmlFor="scroll" className="cursor-pointer">
                  <div className="font-medium">Overflow with scroll</div>
                  <div className="text-sm text-muted-foreground">
                    Note expands beyond cell and becomes scrollable. Calendar grid stays fixed.
                  </div>
                </Label>
              </div>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="truncate" id="truncate" className="mt-1" />
                <Label htmlFor="truncate" className="cursor-pointer">
                  <div className="font-medium">Truncate with ellipsis</div>
                  <div className="text-sm text-muted-foreground">
                    Text cuts off with "..." - click to see full note in dialog.
                  </div>
                </Label>
              </div>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="expand" id="expand" className="mt-1" />
                <Label htmlFor="expand" className="cursor-pointer">
                  <div className="font-medium">Expand cell</div>
                  <div className="text-sm text-muted-foreground">
                    Calendar cell expands to fit all text (current default).
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
