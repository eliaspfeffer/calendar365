import { useEffect, useMemo, useRef, useState } from 'react';
import { YearCalendar } from '@/components/calendar/YearCalendar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { useGoogleCalendarSync } from "@/hooks/useGoogleCalendarSync";
import { LogOut, Loader2, LogIn, Settings, Share2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LoginDialog } from '@/components/auth/LoginDialog';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { useCalendars, type CalendarSummary } from '@/hooks/useCalendars';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarShareDialog } from '@/components/calendar/CalendarShareDialog';
import { CreateCalendarDialog } from '@/components/calendar/CreateCalendarDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Layers, Trash2 } from 'lucide-react';
import { STICKY_NOTE_COLORS, coerceStickyColor } from '@/lib/stickyNoteColors';
import type { StickyColor } from '@/types/calendar';
import { supabase } from '@/integrations/supabase/client';
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

const Index = () => {
  const { user, isLoading, signOut } = useAuth();
  const { settings, updateSettings } = useSettings(user?.id || null);
  const { toast } = useToast();
  const hasWarnedAboutCalendars = useRef(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [createCalendarDialogOpen, setCreateCalendarDialogOpen] = useState(false);
  const [calendarVisibilityPopoverOpen, setCalendarVisibilityPopoverOpen] = useState(false);
  const [deleteCalendarDialogOpen, setDeleteCalendarDialogOpen] = useState(false);
  const [calendarPendingDelete, setCalendarPendingDelete] = useState<CalendarSummary | null>(null);
  const [pendingDeleteNoteCount, setPendingDeleteNoteCount] = useState<number | null>(null);
  const [isLoadingDeleteNoteCount, setIsLoadingDeleteNoteCount] = useState(false);
  const [isDeletingCalendar, setIsDeletingCalendar] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const {
    calendars,
    byId,
    isLoading: calendarsLoading,
    defaultCalendarId,
    schemaStatus: calendarsSchemaStatus,
    schemaError: calendarsSchemaError,
    refresh: refreshCalendars,
    createCalendar,
    createInvite,
  } = useCalendars(user?.id || null);

  const { yearStart, yearEnd } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const rawStart = Number.isFinite(settings.yearStart) ? Math.trunc(settings.yearStart) : currentYear;
    const rawEnd = Number.isFinite(settings.yearEnd) ? Math.trunc(settings.yearEnd) : rawStart;

    const safeStart = Math.max(currentYear, rawStart);
    const safeEnd = Math.max(currentYear, rawEnd);

    if (safeStart <= safeEnd) return { yearStart: safeStart, yearEnd: safeEnd };
    return { yearStart: safeEnd, yearEnd: safeStart };
  }, [settings.yearStart, settings.yearEnd]);

  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = yearStart; y <= yearEnd; y += 1) out.push(y);
    return out;
  }, [yearStart, yearEnd]);

  const googleSync = useGoogleCalendarSync({
    years,
    enabled: settings.googleSyncEnabled,
    selectedCalendarIds: settings.googleSelectedCalendarIds ?? [],
  });

  // Default to syncing only the primary Google calendar unless the user explicitly chose others.
  useEffect(() => {
    if (!settings.googleSyncEnabled) return;
    if (!googleSync.isConnected) return;
    if (!googleSync.primaryCalendarId) return;
    if (settings.googleSelectedCalendarIds !== null) return;
    updateSettings({ googleSelectedCalendarIds: [googleSync.primaryCalendarId] });
  }, [
    googleSync.isConnected,
    googleSync.primaryCalendarId,
    settings.googleSelectedCalendarIds,
    settings.googleSyncEnabled,
    updateSettings,
  ]);

  const effectiveCalendarId = useMemo(() => {
    if (!user) return null;
    return settings.activeCalendarId ?? defaultCalendarId ?? null;
  }, [user, settings.activeCalendarId, defaultCalendarId]);

  const activeCalendar = useMemo(() => {
    if (!effectiveCalendarId) return null;
    return byId.get(effectiveCalendarId) ?? null;
  }, [byId, effectiveCalendarId]);

  const effectiveVisibleCalendarIds = useMemo(() => {
    if (!user) return null;
    const chosen = settings.visibleCalendarIds;
    if (chosen && chosen.length > 0) {
      const valid = chosen.filter((id) => byId.has(id));
      return valid.length > 0 ? valid : (effectiveCalendarId ? [effectiveCalendarId] : null);
    }
    return effectiveCalendarId ? [effectiveCalendarId] : null;
  }, [user, settings.visibleCalendarIds, byId, effectiveCalendarId]);

  useEffect(() => {
    if (!user) return;
    if (!settings.visibleCalendarIds) return;
    if (!effectiveCalendarId) return;
    if (settings.visibleCalendarIds.includes(effectiveCalendarId)) return;
    updateSettings({ visibleCalendarIds: [...settings.visibleCalendarIds, effectiveCalendarId] });
  }, [user, settings.visibleCalendarIds, effectiveCalendarId, updateSettings]);

  const calendarDefaultNoteColorById = useMemo(() => {
    const entries = calendars.map((c) => [c.id, coerceStickyColor(c.default_note_color, "yellow")] as const);
    return Object.fromEntries(entries) as Record<string, StickyColor>;
  }, [calendars]);

  const editableVisibleCalendars = useMemo(() => {
    const visible = new Set(effectiveVisibleCalendarIds ?? []);
    return calendars
      .filter((c) => visible.has(c.id) && (c.role === "owner" || c.role === "editor"))
      .map((c) => ({ id: c.id, name: c.name }));
  }, [calendars, effectiveVisibleCalendarIds]);

  const toggleCalendarVisibility = (calendarId: string, visible: boolean) => {
    const baseline = settings.visibleCalendarIds ?? (effectiveCalendarId ? [effectiveCalendarId] : []);
    const next = visible
      ? Array.from(new Set([...baseline, calendarId]))
      : baseline.filter((id) => id !== calendarId);
    if (next.length === 0) return;
    updateSettings({ visibleCalendarIds: next });
  };

  const updateCalendarDefaultNoteColor = async (calendarId: string, color: StickyColor) => {
    const { error } = await supabase.from("calendars").update({ default_note_color: color }).eq("id", calendarId);
    if (error) {
      toast({
        title: "Couldn’t update calendar color",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    refreshCalendars();
    toast({ title: "Default note color updated" });
  };

  useEffect(() => {
    if (!user) return;
    if (calendarsLoading) return;
    if (!hasWarnedAboutCalendars.current && calendars.length === 0 && calendarsSchemaStatus === "missing") {
      hasWarnedAboutCalendars.current = true;
      toast({
        title: "Kalender-Funktion nicht verfügbar",
        description:
          calendarsSchemaError ??
          "Bitte die neuesten Supabase-Migrationen anwenden (shared calendars).",
        variant: "destructive",
      });
    }
    const ids = new Set(calendars.map((c) => c.id));
    const current = settings.activeCalendarId;
    if (current && ids.has(current)) return;
    const fallback = defaultCalendarId && ids.has(defaultCalendarId) ? defaultCalendarId : calendars[0]?.id ?? null;
    if (fallback && fallback !== current) {
      updateSettings({ activeCalendarId: fallback });
    }
  }, [
    user,
    calendarsLoading,
    calendars,
    defaultCalendarId,
    calendarsSchemaStatus,
    calendarsSchemaError,
    settings.activeCalendarId,
    updateSettings,
    toast,
  ]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Error signing out',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return { error: new Error("Not signed in") };

    setIsDeletingAccount(true);
    const { error } = await supabase.rpc("delete_account");
    if (error) {
      setIsDeletingAccount(false);
      toast({
        title: "Couldn’t delete account",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    localStorage.removeItem("calendar365_settings");

    const signOutResult = await signOut();
    if (signOutResult.error) {
      // If the user is already deleted, auth signOut may fail. Ensure local tokens are cleared anyway.
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
          localStorage.removeItem(key);
        }
      }
    }

    setIsDeletingAccount(false);
    toast({ title: "Account deleted" });
    window.location.href = "/";
    return { error: null };
  };

  const handleAuthRequired = () => {
    setLoginDialogOpen(true);
  };

  const requestDeleteCalendar = async (calendar: CalendarSummary) => {
    if (!user) return;

    setCalendarVisibilityPopoverOpen(false);
    setCalendarPendingDelete(calendar);
    setPendingDeleteNoteCount(null);
    setIsLoadingDeleteNoteCount(true);
    setDeleteCalendarDialogOpen(true);

    const { count, error } = await supabase
      .from("sticky_notes")
      .select("id", { count: "exact", head: true })
      .eq("calendar_id", calendar.id);

    setIsLoadingDeleteNoteCount(false);

    if (error) {
      toast({
        title: "Couldn’t count notes",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setPendingDeleteNoteCount(count ?? 0);
  };

  const confirmDeleteCalendar = async () => {
    if (!calendarPendingDelete) return;
    setIsDeletingCalendar(true);

    const { error } = await supabase.from("calendars").delete().eq("id", calendarPendingDelete.id);

    setIsDeletingCalendar(false);

    if (error) {
      toast({
        title: "Couldn’t delete calendar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const updates: Partial<typeof settings> = {};
    if (settings.activeCalendarId === calendarPendingDelete.id) {
      updates.activeCalendarId = null;
    }
    if (settings.visibleCalendarIds) {
      const nextVisible = settings.visibleCalendarIds.filter((id) => id !== calendarPendingDelete.id);
      updates.visibleCalendarIds = nextVisible.length > 0 ? nextVisible : null;
    }
    if (Object.keys(updates).length > 0) updateSettings(updates);

    setDeleteCalendarDialogOpen(false);
    setCalendarPendingDelete(null);
    setPendingDeleteNoteCount(null);

    await refreshCalendars();
    toast({ title: "Calendar deleted" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Calendar controls */}
      {user && (
        <div
          data-top-controls
          className="fixed top-4 left-4 z-50 flex flex-wrap gap-2 items-center sm:flex-nowrap"
        >
          <Select
            value={effectiveCalendarId ?? ''}
            onValueChange={(id) => updateSettings({ activeCalendarId: id })}
            disabled={calendarsLoading || calendars.length === 0}
          >
            <SelectTrigger className="w-[160px] max-w-[60vw] bg-background/80 backdrop-blur-sm sm:w-[220px]">
              <SelectValue placeholder={calendarsLoading ? 'Lade Kalender…' : 'Kalender wählen'} />
            </SelectTrigger>
            <SelectContent>
              {calendars.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover open={calendarVisibilityPopoverOpen} onOpenChange={setCalendarVisibilityPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-background/80 backdrop-blur-sm"
                title="Kalender anzeigen/ausblenden + Standardfarben"
                disabled={calendarsLoading || calendars.length === 0}
              >
                <Layers className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[360px] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">Calendars</div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateSettings({ visibleCalendarIds: null })}
                    disabled={!settings.visibleCalendarIds}
                  >
                    Single
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateSettings({ visibleCalendarIds: calendars.map((c) => c.id) })}
                  >
                    All
                  </Button>
                </div>
              </div>
              <Separator className="my-3" />
              <ScrollArea className="h-[260px] pr-2">
                <div className="space-y-2">
                  {calendars.map((c) => {
                    const visible = (effectiveVisibleCalendarIds ?? []).includes(c.id);
                    const currentColor = calendarDefaultNoteColorById[c.id] ?? "yellow";
                    return (
                      <div key={c.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={visible}
                          onCheckedChange={(v) => toggleCalendarVisibility(c.id, Boolean(v))}
                        />
                        <div className="flex-1 truncate">{c.name}</div>
                        <div className="flex items-center gap-1">
                          {c.role === "owner" && (
                            <>
                              {STICKY_NOTE_COLORS.map((col) => (
                                <button
                                  key={col.value}
                                  className={[
                                    "h-4 w-4 rounded-full border",
                                    col.className,
                                    col.value === currentColor
                                      ? "border-foreground"
                                      : "border-transparent opacity-70 hover:opacity-100",
                                  ].join(" ")}
                                  title={`Default: ${col.label}`}
                                  onClick={() => updateCalendarDefaultNoteColor(c.id, col.value)}
                                />
                              ))}
                              {c.id !== defaultCalendarId && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  title="Delete calendar"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    requestDeleteCalendar(c);
                                  }}
                                  disabled={isDeletingCalendar}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <div className="mt-3 text-xs text-muted-foreground">
                Showing {(effectiveVisibleCalendarIds ?? []).length || 0} of {calendars.length}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (calendarsSchemaStatus === "missing") {
                toast({
                  title: "Kalender-Funktion nicht verfügbar",
                  description:
                    calendarsSchemaError ??
                    "Bitte die neuesten Supabase-Migrationen anwenden (shared calendars).",
                  variant: "destructive",
                });
                return;
              }
              setCreateCalendarDialogOpen(true);
            }}
            className="bg-background/80 backdrop-blur-sm"
            title="Neuen Kalender erstellen"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareDialogOpen(true)}
            className="bg-background/80 backdrop-blur-sm"
            title="Kalender teilen"
            disabled={!activeCalendar || (activeCalendar.role !== 'owner' && activeCalendar.role !== 'editor')}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Header with settings and auth buttons */}
      <div data-top-controls className="fixed right-4 z-50 flex gap-2 top-16 sm:top-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSettingsDialogOpen(true)}
          className="bg-background/80 backdrop-blur-sm"
        >
          <Settings className="h-4 w-4" />
        </Button>
        {user ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="bg-background/80 backdrop-blur-sm"
          >
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLoginDialogOpen(true)}
            className="bg-background/80 backdrop-blur-sm"
          >
            <LogIn className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign in</span>
          </Button>
        )}
      </div>
      
      <YearCalendar 
        years={years}
        userId={user?.id || null}
        visibleCalendarIds={effectiveVisibleCalendarIds}
        activeCalendarId={effectiveCalendarId}
        onAuthRequired={handleAuthRequired}
        skipHideYearConfirm={settings.skipHideYearConfirm}
        onSkipHideYearConfirmChange={(skip) => updateSettings({ skipHideYearConfirm: skip })}
        onAddYear={() => updateSettings({ yearEnd: yearEnd + 1 })}
        onRemoveLastYear={
          years.length > 1
            ? () => updateSettings({ yearEnd: Math.max(yearStart, yearEnd - 1) })
            : undefined
        }
        textOverflowMode={settings.textOverflowMode}
        calendarColor={settings.calendarColor}
        alwaysShowArrows={settings.alwaysShowArrows}
        calendarOptions={editableVisibleCalendars}
        calendarDefaultNoteColorById={calendarDefaultNoteColorById}
        googleEventsByDate={settings.googleSyncEnabled ? googleSync.eventsByDate : null}
      />

      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
        yearStart={yearStart}
        yearEnd={yearEnd}
        onYearStartChange={(next) => {
          if (next <= yearEnd) updateSettings({ yearStart: next });
          else updateSettings({ yearStart: next, yearEnd: next });
        }}
        onYearEndChange={(next) => {
          if (next >= yearStart) updateSettings({ yearEnd: next });
          else updateSettings({ yearStart: next, yearEnd: next });
        }}
        textOverflowMode={settings.textOverflowMode}
        onTextOverflowModeChange={(mode) => updateSettings({ textOverflowMode: mode })}
        calendarColor={settings.calendarColor}
        onCalendarColorChange={(color) => updateSettings({ calendarColor: color })}
        alwaysShowArrows={settings.alwaysShowArrows}
        onAlwaysShowArrowsChange={(alwaysShowArrows) => updateSettings({ alwaysShowArrows })}
        shareBaseUrl={settings.shareBaseUrl}
        onShareBaseUrlChange={(url) => updateSettings({ shareBaseUrl: url })}
        accountEmail={user?.email ?? null}
        onDeleteAccount={user ? handleDeleteAccount : undefined}
        googleSyncAvailable={googleSync.isAvailable}
        googleSyncEnabled={settings.googleSyncEnabled}
        onGoogleSyncEnabledChange={(enabled) => updateSettings({ googleSyncEnabled: enabled })}
        googleConnected={googleSync.isConnected}
        googleConnecting={googleSync.isConnecting}
        onGoogleConnect={googleSync.connect}
        onGoogleDisconnect={() => {
          googleSync.disconnect();
          updateSettings({ googleSelectedCalendarIds: null });
        }}
        googleCalendars={googleSync.calendars}
        googlePrimaryCalendarId={googleSync.primaryCalendarId}
        googleSelectedCalendarIds={settings.googleSelectedCalendarIds ?? []}
        onGoogleSelectedCalendarIdsChange={(ids) => updateSettings({ googleSelectedCalendarIds: ids })}
        googleSyncing={googleSync.isSyncing}
        googleLastSyncAt={googleSync.lastSyncAt}
        googleError={googleSync.error}
        onGoogleRefresh={googleSync.refresh}
      />

      <CreateCalendarDialog
        open={createCalendarDialogOpen}
        onOpenChange={setCreateCalendarDialogOpen}
        onCreate={async (name, defaultNoteColor) => {
          const result = await createCalendar(name, defaultNoteColor);
          if (result.id) updateSettings({ activeCalendarId: result.id });
          return result;
        }}
      />

      <CalendarShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        calendar={activeCalendar}
        shareBaseUrl={settings.shareBaseUrl}
        onCreateInvite={async (role, expiresInDays) => {
          if (!activeCalendar) return null;
          const token = await createInvite(activeCalendar.id, role, expiresInDays);
          if (!token) {
            toast({ title: 'Fehler beim Teilen', variant: 'destructive' });
          }
          return token;
        }}
      />

      <AlertDialog
        open={deleteCalendarDialogOpen}
        onOpenChange={(open) => {
          if (!open && isDeletingCalendar) return;
          setDeleteCalendarDialogOpen(open);
          if (!open) {
            setCalendarPendingDelete(null);
            setPendingDeleteNoteCount(null);
            setIsLoadingDeleteNoteCount(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete calendar?</AlertDialogTitle>
            <AlertDialogDescription>
              {calendarPendingDelete ? (
                <>
                  This will permanently delete{" "}
                  {isLoadingDeleteNoteCount
                    ? "…"
                    : pendingDeleteNoteCount === null
                      ? "an unknown number of notes"
                      : `${pendingDeleteNoteCount} ${pendingDeleteNoteCount === 1 ? "note" : "notes"}`}{" "}
                  from “{calendarPendingDelete.name}”.{pendingDeleteNoteCount === null ? " Try again." : ""}
                </>
              ) : (
                "This will permanently delete this calendar and its notes."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={isDeletingCalendar}>
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                disabled={isDeletingCalendar || isLoadingDeleteNoteCount || pendingDeleteNoteCount === null}
                onClick={(e) => {
                  e.preventDefault();
                  confirmDeleteCalendar();
                }}
              >
                {isDeletingCalendar ? "Deleting…" : "Delete"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
