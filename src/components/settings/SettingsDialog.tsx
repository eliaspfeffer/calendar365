import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TextOverflowMode, CalendarColor } from '@/hooks/useSettings';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  textOverflowMode: TextOverflowMode;
  onTextOverflowModeChange: (mode: TextOverflowMode) => void;
  calendarColor: CalendarColor;
  onCalendarColorChange: (color: CalendarColor) => void;
  shareBaseUrl: string | null;
  onShareBaseUrlChange: (url: string | null) => void;
}

const calendarColors: { value: CalendarColor; label: string; hsl: string }[] = [
  { value: 'blue', label: 'Blue', hsl: '207 90% 45%' },
  { value: 'green', label: 'Green', hsl: '142 76% 36%' },
  { value: 'purple', label: 'Purple', hsl: '262 80% 50%' },
  { value: 'red', label: 'Red', hsl: '0 84% 60%' },
  { value: 'orange', label: 'Orange', hsl: '25 95% 53%' },
  { value: 'teal', label: 'Teal', hsl: '173 80% 40%' },
  { value: 'pink', label: 'Pink', hsl: '330 81% 60%' },
  { value: 'indigo', label: 'Indigo', hsl: '231 48% 48%' },
];

export function SettingsDialog({
  open,
  onOpenChange,
  textOverflowMode,
  onTextOverflowModeChange,
  calendarColor,
  onCalendarColorChange,
  shareBaseUrl,
  onShareBaseUrlChange,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-base font-medium" htmlFor="share-base-url">
              Public share base URL
            </Label>
            <Input
              id="share-base-url"
              value={shareBaseUrl ?? ""}
              onChange={(e) => onShareBaseUrlChange(e.target.value || null)}
              placeholder="https://calendar.example.com"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="text-sm text-muted-foreground">
              Optional. Used when generating public share links (custom domains). Leave empty to use the current site URL.
            </p>
          </div>
          <div className="space-y-3">
            <Label className="text-base font-medium">Calendar Color</Label>
            <div className="grid grid-cols-4 gap-3">
              {calendarColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => onCalendarColorChange(color.value)}
                  className={`relative h-12 w-full rounded-md border-2 transition-all ${
                    calendarColor === color.value
                      ? 'border-foreground ring-2 ring-offset-2 ring-offset-background ring-foreground'
                      : 'border-border hover:border-foreground/50'
                  }`}
                  style={{ backgroundColor: `hsl(${color.hsl})` }}
                  aria-label={`Select ${color.label} color`}
                >
                  {calendarColor === color.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg
                        className="h-6 w-6 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Choose a color for the calendar header
            </p>
          </div>
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
