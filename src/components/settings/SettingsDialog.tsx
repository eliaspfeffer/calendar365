import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { TextOverflowMode, CalendarColor } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useMemo, useState } from 'react';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  textOverflowMode: TextOverflowMode;
  onTextOverflowModeChange: (mode: TextOverflowMode) => void;
  calendarColor: CalendarColor;
  onCalendarColorChange: (color: CalendarColor) => void;
  alwaysShowArrows: boolean;
  onAlwaysShowArrowsChange: (alwaysShowArrows: boolean) => void;
  shareBaseUrl: string | null;
  onShareBaseUrlChange: (url: string | null) => void;
  accountEmail?: string | null;
  onDeleteAccount?: () => Promise<{ error: Error | null }>;
  googleSyncAvailable?: boolean;
  googleSyncEnabled?: boolean;
  onGoogleSyncEnabledChange?: (enabled: boolean) => void;
  googleConnected?: boolean;
  googleConnecting?: boolean;
  onGoogleConnect?: () => void;
  onGoogleDisconnect?: () => void;
  googleCalendars?: Array<{ id: string; summary: string; primary?: boolean }>;
  googleSelectedCalendarIds?: string[];
  onGoogleSelectedCalendarIdsChange?: (ids: string[]) => void;
  googleSyncing?: boolean;
  googleLastSyncAt?: Date | null;
  googleError?: string | null;
  onGoogleRefresh?: () => void;
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
  alwaysShowArrows,
  onAlwaysShowArrowsChange,
  shareBaseUrl,
  onShareBaseUrlChange,
  accountEmail,
  onDeleteAccount,
  googleSyncAvailable,
  googleSyncEnabled,
  onGoogleSyncEnabledChange,
  googleConnected,
  googleConnecting,
  onGoogleConnect,
  onGoogleDisconnect,
  googleCalendars,
  googleSelectedCalendarIds,
  onGoogleSelectedCalendarIdsChange,
  googleSyncing,
  googleLastSyncAt,
  googleError,
  onGoogleRefresh,
}: SettingsDialogProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const canDeleteAccount = useMemo(() => {
    if (!onDeleteAccount) return false;
    return deleteConfirmation.trim().toUpperCase() === 'DELETE';
  }, [deleteConfirmation, onDeleteAccount]);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && (deleteDialogOpen || isDeletingAccount)) return;
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent className="sm:max-w-md flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 space-y-6 overflow-y-auto py-4 pr-2">
            <div className="space-y-3">
              <Label className="text-base font-medium" htmlFor="share-base-url">
                Public share base URL
              </Label>
              <Input
                id="share-base-url"
                value={shareBaseUrl ?? ''}
                onChange={(e) => onShareBaseUrlChange(e.target.value || null)}
                placeholder="https://calendar.example.com"
                inputMode="url"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <p className="text-sm text-muted-foreground">
                Optional. Used when generating public share links (custom domains). Leave empty to use the current site
                URL.
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
              <p className="text-sm text-muted-foreground">Choose a color for the calendar header</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label className="text-base font-medium" htmlFor="always-show-arrows">
                    Always show arrows
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Show note connection arrows even when you aren’t hovering a note.
                  </p>
                </div>
                <Switch
                  id="always-show-arrows"
                  checked={alwaysShowArrows}
                  onCheckedChange={onAlwaysShowArrowsChange}
                />
              </div>
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
                      Text cuts off with &quot;...&quot; - click to see full note in dialog.
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

            <Separator />
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label className="text-base font-medium" htmlFor="google-sync-enabled">
                    Google Calendar sync
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Show your Google Calendar entries directly inside the year view (live refresh while the app is
                    open).
                  </p>
                </div>
                <Switch
                  id="google-sync-enabled"
                  checked={!!googleSyncEnabled}
                  onCheckedChange={(checked) => onGoogleSyncEnabledChange?.(checked)}
                  disabled={!googleSyncAvailable}
                />
              </div>
              {!googleSyncAvailable ? (
                <p className="text-sm text-muted-foreground">
                  Configure <span className="font-mono">VITE_GOOGLE_CLIENT_ID</span> to enable Google Calendar sync.
                </p>
              ) : !googleSyncEnabled ? (
                <p className="text-sm text-muted-foreground">Turn this on to connect and start syncing.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {!googleConnected ? (
                      <Button type="button" onClick={onGoogleConnect} disabled={googleConnecting}>
                        {googleConnecting ? 'Connecting…' : 'Connect Google'}
                      </Button>
                    ) : (
                      <>
                        <Button type="button" variant="outline" onClick={onGoogleDisconnect}>
                          Disconnect
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={onGoogleRefresh}
                          disabled={!!googleSyncing}
                        >
                          {googleSyncing ? 'Refreshing…' : 'Refresh now'}
                        </Button>
                      </>
                    )}
                    {googleLastSyncAt && (
                      <span className="text-xs text-muted-foreground">
                        Last sync: {googleLastSyncAt.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {googleError && <p className="text-sm text-destructive">{googleError}</p>}

                  {googleConnected && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Calendars to sync</Label>
                      <ScrollArea className="h-40 rounded-md border">
                        <div className="p-3 space-y-2">
                          {(googleCalendars ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">No calendars found.</p>
                          ) : (
                            (googleCalendars ?? []).map((cal) => {
                              const selected = (googleSelectedCalendarIds ?? []).includes(cal.id);
                              return (
                                <div key={cal.id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`google-cal-${cal.id}`}
                                    checked={selected}
                                    onCheckedChange={(checked) => {
                                      const current = googleSelectedCalendarIds ?? [];
                                      const next = checked
                                        ? Array.from(new Set([...current, cal.id]))
                                        : current.filter((id) => id !== cal.id);
                                      onGoogleSelectedCalendarIdsChange?.(next);
                                    }}
                                  />
                                  <Label htmlFor={`google-cal-${cal.id}`} className="cursor-pointer flex-1">
                                    {cal.summary}
                                    {cal.primary ? ' (primary)' : ''}
                                  </Label>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </ScrollArea>
                      <p className="text-xs text-muted-foreground">
                        Only synced in this browser. Leave the app open to keep it refreshed.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {onDeleteAccount && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="text-base font-medium text-destructive">Danger zone</div>
                    <p className="text-sm text-muted-foreground">
                      Delete your account and all private data stored in Supabase. This cannot be undone.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setDeleteConfirmation('');
                      setDeleteDialogOpen(true);
                    }}
                  >
                    Delete account
                  </Button>
                  {accountEmail && (
                    <p className="text-xs text-muted-foreground">
                      Signed in as <span className="font-medium">{accountEmail}</span>
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
      </DialogContent>
    </Dialog>
      {onDeleteAccount && (
        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen && isDeletingAccount) return;
            setDeleteDialogOpen(nextOpen);
            if (!nextOpen) setDeleteConfirmation('');
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete account?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account and all private data (notes, calendars, shares, invites).
                Type <span className="font-medium">DELETE</span> to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="delete-account-confirmation">Confirmation</Label>
              <Input
                id="delete-account-confirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type DELETE"
                autoCapitalize="characters"
                autoComplete="off"
                disabled={isDeletingAccount}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button variant="outline" disabled={isDeletingAccount}>
                  Cancel
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  variant="destructive"
                  disabled={!canDeleteAccount || isDeletingAccount}
                  onClick={async (e) => {
                    e.preventDefault();
                    if (!onDeleteAccount) return;
                    if (!canDeleteAccount) return;
                    setIsDeletingAccount(true);
                    try {
                      const { error } = await onDeleteAccount();
                      if (error) return;
                      setDeleteDialogOpen(false);
                      onOpenChange(false);
                    } finally {
                      setIsDeletingAccount(false);
                    }
                  }}
                >
                  {isDeletingAccount ? 'Deleting…' : 'Delete account'}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
