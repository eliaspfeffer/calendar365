import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { YearCalendar } from '@/components/calendar/YearCalendar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { useGoogleCalendarSync } from "@/hooks/useGoogleCalendarSync";
import { useEntitlement } from "@/hooks/useEntitlement";
import { LogOut, Loader2, LogIn, Settings, Share2, Plus, Sparkles, GripVertical, Pencil, Layers, Trash2, FileCode2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LoginDialog } from '@/components/auth/LoginDialog';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { GitHubStarsBadge } from "@/components/github/GitHubStarsBadge";
import { useCalendars, type CalendarSummary } from '@/hooks/useCalendars';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarShareDialog } from '@/components/calendar/CalendarShareDialog';
import { CreateCalendarDialog } from '@/components/calendar/CreateCalendarDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from "@/components/ui/input";
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
import { PaywallDialog } from "@/components/payments/PaywallDialog";
import { getFreeNotesLimit } from "@/lib/paywallConfig";
import { YamlImportExportDialog } from "@/components/yaml/YamlImportExportDialog";
import { WalkthroughTour } from "@/components/walkthrough/WalkthroughTour";

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
  const [renamingCalendarId, setRenamingCalendarId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [isRenamingCalendar, setIsRenamingCalendar] = useState(false);
  const [draggingCalendarId, setDraggingCalendarId] = useState<string | null>(null);
  const [dragOverCalendarId, setDragOverCalendarId] = useState<string | null>(null);
  const [appearingCalendarId, setAppearingCalendarId] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [yamlDialogOpen, setYamlDialogOpen] = useState(false);
  const [calendarDataRefreshToken, setCalendarDataRefreshToken] = useState(0);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);

  const entitlement = useEntitlement(user?.id ?? null);
  const freeNotesLimit = useMemo(() => getFreeNotesLimit(), []);

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

  useEffect(() => {
    if (!user) return;
    const currentOrder = settings.calendarOrderIds;
    if (!currentOrder || currentOrder.length === 0) return;

    const known = new Set(calendars.map((c) => c.id));
    const next: string[] = currentOrder.filter((id) => known.has(id));
    for (const c of calendars) {
      if (!currentOrder.includes(c.id)) next.push(c.id);
    }

    if (next.length !== currentOrder.length || next.some((id, i) => id !== currentOrder[i])) {
      updateSettings({ calendarOrderIds: next });
    }
  }, [user, calendars, settings.calendarOrderIds, updateSettings]);

  const orderedCalendars = useMemo(() => {
    const order = settings.calendarOrderIds;
    if (!order || order.length === 0) return calendars;
    const by = new Map(calendars.map((c) => [c.id, c] as const));
    const seen = new Set<string>();
    const out: CalendarSummary[] = [];
    for (const id of order) {
      const cal = by.get(id);
      if (!cal) continue;
      seen.add(id);
      out.push(cal);
    }
    for (const cal of calendars) {
      if (!seen.has(cal.id)) out.push(cal);
    }
    return out;
  }, [calendars, settings.calendarOrderIds]);

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
    const chosen = settings.visibleCalendarIds;
    if (!chosen) return;

    const validVisible = chosen.filter((id) => byId.has(id));
    if (validVisible.length === 0) return;

    if (validVisible.length !== chosen.length) {
      updateSettings({ visibleCalendarIds: validVisible });
      return;
    }

    if (effectiveCalendarId && validVisible.includes(effectiveCalendarId)) return;
    const nextActive = validVisible[0] ?? null;
    if (!nextActive) return;
    if (settings.activeCalendarId === nextActive) return;
    updateSettings({ activeCalendarId: nextActive });
  }, [user, settings.visibleCalendarIds, byId, effectiveCalendarId, settings.activeCalendarId, updateSettings]);

  const calendarDefaultNoteColorById = useMemo(() => {
    const entries = orderedCalendars.map((c) => [c.id, coerceStickyColor(c.default_note_color, "yellow")] as const);
    return Object.fromEntries(entries) as Record<string, StickyColor>;
  }, [orderedCalendars]);

  const editableVisibleCalendars = useMemo(() => {
    const visible = new Set(effectiveVisibleCalendarIds ?? []);
    return orderedCalendars
      .filter((c) => visible.has(c.id) && (c.role === "owner" || c.role === "editor"))
      .map((c) => ({ id: c.id, name: c.name }));
  }, [orderedCalendars, effectiveVisibleCalendarIds]);

  const toggleCalendarVisibility = (calendarId: string, visible: boolean) => {
    updateSettings((prev) => {
      const effectiveId = prev.activeCalendarId ?? defaultCalendarId ?? null;
      const baseline = prev.visibleCalendarIds ?? (effectiveId ? [effectiveId] : []);
      const next = visible
        ? Array.from(new Set([...baseline, calendarId]))
        : baseline.filter((id) => id !== calendarId);
      if (next.length === 0) return {};
      return { visibleCalendarIds: next };
    });
  };

  const updateCalendarDefaultNoteColor = async (calendarId: string, color: StickyColor) => {
    const previousDefault = calendarDefaultNoteColorById[calendarId] ?? "yellow";
    const { error } = await supabase.from("calendars").update({ default_note_color: color }).eq("id", calendarId);
    if (error) {
      toast({
        title: "Couldn’t update calendar color",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Keep existing notes in sync with the calendar's default color, but only if they
    // still use the previous default (so manual per-note color choices are preserved).
    if (previousDefault !== color) {
      const notesUpdate = await supabase
        .from("sticky_notes")
        .update({ color })
        .eq("calendar_id", calendarId)
        .eq("color", previousDefault);

      if (notesUpdate.error) {
        const msg = `${notesUpdate.error.message ?? ""} ${notesUpdate.error.details ?? ""}`.toLowerCase();
        const isMissingCalendarId =
          notesUpdate.error.code === "42703" || (msg.includes("calendar_id") && msg.includes("does not exist"));
        if (!isMissingCalendarId) {
          toast({
            title: "Calendar color updated, but some notes weren’t updated",
            description: notesUpdate.error.message,
            variant: "destructive",
          });
        }
      }
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

  // Auto-open tour for first-time visitors when logged out.
  useEffect(() => {
    if (isLoading) return;
    if (user) return;
    let completed = false;
    try {
      completed = window.localStorage.getItem("calendar365_walkthrough_v1_completed") === "1";
    } catch {
      completed = false;
    }
    if (completed) return;
    const t = window.setTimeout(() => setWalkthroughOpen(true), 900);
    return () => window.clearTimeout(t);
  }, [isLoading, user]);

  const requestDeleteCalendar = async (calendar: CalendarSummary) => {
    if (!user) return;

    setCalendarVisibilityPopoverOpen(false);
    setRenamingCalendarId(null);
    setRenameDraft("");
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

  const startRenameCalendar = (calendar: CalendarSummary) => {
    setRenamingCalendarId(calendar.id);
    setRenameDraft(calendar.name);
  };

  const cancelRenameCalendar = () => {
    setRenamingCalendarId(null);
    setRenameDraft("");
  };

  const commitRenameCalendar = useCallback(
    async (calendarId: string) => {
      const nextName = renameDraft.trim();
      if (!nextName) {
        toast({ title: "Please enter a calendar name", variant: "destructive" });
        return;
      }
      setIsRenamingCalendar(true);
      const { error } = await supabase.from("calendars").update({ name: nextName }).eq("id", calendarId);
      setIsRenamingCalendar(false);

      if (error) {
        toast({
          title: "Couldn’t rename calendar",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      cancelRenameCalendar();
      await refreshCalendars();
      toast({ title: "Calendar renamed" });
    },
    [renameDraft, refreshCalendars, toast]
  );

  const applyCalendarReorder = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      const baseline =
        settings.calendarOrderIds && settings.calendarOrderIds.length > 0
          ? settings.calendarOrderIds
          : orderedCalendars.map((c) => c.id);
      const fromIndex = baseline.indexOf(fromId);
      const toIndex = baseline.indexOf(toId);
      if (fromIndex < 0 || toIndex < 0) return;
      const next = [...baseline];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, fromId);
      updateSettings({ calendarOrderIds: next });
    },
    [orderedCalendars, settings.calendarOrderIds, updateSettings]
  );

  const confirmDeleteCalendar = async () => {
    if (!calendarPendingDelete) return;
    setIsDeletingCalendar(true);

    const isLastRemainingCalendar = calendars.length === 1 && calendars[0]?.id === calendarPendingDelete.id;
    let replacementCalendarId: string | null = null;

    if (isLastRemainingCalendar) {
      const created = await createCalendar("clear new calendar");
      if (!created.id) {
        setIsDeletingCalendar(false);
        toast({
          title: "Couldn’t create replacement calendar",
          description: created.error,
          variant: "destructive",
        });
        return;
      }
      replacementCalendarId = created.id;
      setAppearingCalendarId(replacementCalendarId);
      window.setTimeout(() => setAppearingCalendarId(null), 1200);
      updateSettings({ activeCalendarId: replacementCalendarId, visibleCalendarIds: null, calendarOrderIds: [replacementCalendarId] });
    }

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
    if (!replacementCalendarId && settings.activeCalendarId === calendarPendingDelete.id) updates.activeCalendarId = null;
    if (!replacementCalendarId && settings.visibleCalendarIds) {
      const nextVisible = settings.visibleCalendarIds.filter((id) => id !== calendarPendingDelete.id);
      updates.visibleCalendarIds = nextVisible.length > 0 ? nextVisible : null;
    }
    if (!replacementCalendarId && settings.calendarOrderIds) {
      const nextOrder = settings.calendarOrderIds.filter((id) => id !== calendarPendingDelete.id);
      updates.calendarOrderIds = nextOrder.length > 0 ? nextOrder : null;
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
            disabled={calendarsLoading || orderedCalendars.length === 0}
          >
            <SelectTrigger
              data-tour-id="calendar-switcher"
              className={[
                "w-[160px] max-w-[60vw] bg-background/80 backdrop-blur-sm sm:w-[220px]",
                appearingCalendarId && effectiveCalendarId === appearingCalendarId ? "animate-in fade-in-0 zoom-in-95" : "",
              ].join(" ")}
            >
              <SelectValue placeholder={calendarsLoading ? 'Lade Kalender…' : 'Kalender wählen'} />
            </SelectTrigger>
            <SelectContent>
              {orderedCalendars.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover open={calendarVisibilityPopoverOpen} onOpenChange={setCalendarVisibilityPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                data-tour-id="calendar-visibility"
                variant="outline"
                size="sm"
                className="bg-background/80 backdrop-blur-sm"
                title="Kalender anzeigen/ausblenden + Standardfarben"
                disabled={calendarsLoading || orderedCalendars.length === 0}
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
                    onClick={() => updateSettings({ visibleCalendarIds: orderedCalendars.map((c) => c.id) })}
                  >
                    All
                  </Button>
                </div>
              </div>
              <Separator className="my-3" />
              <ScrollArea className="h-[260px] pr-2">
                <div className="space-y-2">
                  {orderedCalendars.map((c) => {
                    const visible = (effectiveVisibleCalendarIds ?? []).includes(c.id);
                    const currentColor = calendarDefaultNoteColorById[c.id] ?? "yellow";
                    const isRenaming = renamingCalendarId === c.id;
                    const canEditCalendar = c.role === "owner";
                    return (
                      <div
                        key={c.id}
                        className={[
                          "flex items-center gap-2 rounded-md px-1 overflow-x-auto",
                          draggingCalendarId === c.id ? "opacity-60" : "",
                          dragOverCalendarId === c.id ? "bg-muted/60" : "",
                          appearingCalendarId === c.id ? "animate-in fade-in-0 zoom-in-95" : "",
                        ].join(" ")}
                        onDragOver={(e) => {
                          if (!draggingCalendarId) return;
                          e.preventDefault();
                          setDragOverCalendarId(c.id);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromId = e.dataTransfer.getData("text/plain") || draggingCalendarId;
                          if (!fromId) return;
                          applyCalendarReorder(fromId, c.id);
                          setDraggingCalendarId(null);
                          setDragOverCalendarId(null);
                        }}
                      >
                        <button
                          className="h-7 w-7 shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
                          title="Drag to reorder"
                          draggable={!isRenaming && !isDeletingCalendar && !isRenamingCalendar}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", c.id);
                            setDraggingCalendarId(c.id);
                          }}
                          onDragEnd={() => {
                            setDraggingCalendarId(null);
                            setDragOverCalendarId(null);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                          }}
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                        <Checkbox
                          checked={visible}
                          onCheckedChange={(v) => toggleCalendarVisibility(c.id, v === true)}
                        />
                        <div className="flex-1 min-w-0 py-0.5">
                          {isRenaming ? (
                            <Input
                              value={renameDraft}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitRenameCalendar(c.id);
                                if (e.key === "Escape") cancelRenameCalendar();
                              }}
                              onBlur={() => commitRenameCalendar(c.id)}
                              disabled={isRenamingCalendar}
                              className="h-8 flex-none"
                              style={{ width: `${Math.max(8, renameDraft.length + 1)}ch` }}
                              autoFocus
                            />
                          ) : (
                            <div className="truncate">{c.name}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 py-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title={canEditCalendar ? "Rename calendar" : "Only the owner can rename"}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!canEditCalendar) return;
                              startRenameCalendar(c);
                            }}
                            disabled={!canEditCalendar || isDeletingCalendar || isRenamingCalendar}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                title="Delete calendar"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  cancelRenameCalendar();
                                  requestDeleteCalendar(c);
                                }}
                                disabled={isDeletingCalendar}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <div className="mt-3 text-xs text-muted-foreground">
                Showing {(effectiveVisibleCalendarIds ?? []).length || 0} of {orderedCalendars.length}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            data-tour-id="calendar-create"
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
            data-tour-id="calendar-share"
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
        <GitHubStarsBadge />
        <Button
          data-tour-id="tour-button"
          variant="outline"
          size="sm"
          onClick={() => setWalkthroughOpen(true)}
          className="bg-background/80 backdrop-blur-sm"
          title="Take a quick tour"
        >
          <Sparkles className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Tour</span>
        </Button>
        <Button
          data-tour-id="settings-button"
          variant="outline"
          size="sm"
          onClick={() => setYamlDialogOpen(true)}
          className="bg-background/80 backdrop-blur-sm"
          title="YAML import/export"
        >
          <FileCode2 className="h-4 w-4" />
        </Button>
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
            data-tour-id="auth-button"
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
            data-tour-id="auth-button"
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
        refreshToken={calendarDataRefreshToken}
        onAuthRequired={handleAuthRequired}
        skipHideYearConfirm={settings.skipHideYearConfirm}
        onSkipHideYearConfirmChange={(skip) => updateSettings({ skipHideYearConfirm: skip })}
        onAddYear={() => updateSettings({ yearEnd: yearEnd + 1 })}
        onRemoveLastYear={
          years.length > 1
            ? () => updateSettings({ yearEnd: Math.max(yearStart, yearEnd - 1) })
            : undefined
        }
        noteLimit={freeNotesLimit}
        noteCount={entitlement.noteCount}
        hasLifetimeAccess={entitlement.hasLifetimeAccess}
        onUpgradeRequired={() => setPaywallOpen(true)}
        onNoteCreated={() => entitlement.bumpNoteCount(1)}
        onNoteDeleted={() => entitlement.bumpNoteCount(-1)}
        textOverflowMode={settings.textOverflowMode}
        calendarColor={settings.calendarColor}
        alwaysShowArrows={settings.alwaysShowArrows}
        showInbox={settings.showInbox}
        calendarOptions={editableVisibleCalendars}
        calendarDefaultNoteColorById={calendarDefaultNoteColorById}
        googleEventsByDate={settings.googleSyncEnabled ? googleSync.eventsByDate : null}
      />

      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
      <YamlImportExportDialog
        open={yamlDialogOpen}
        onOpenChange={setYamlDialogOpen}
        userId={user?.id || null}
        calendars={orderedCalendars}
        activeCalendarId={effectiveCalendarId}
        onImported={() => setCalendarDataRefreshToken((v) => v + 1)}
      />
      <PaywallDialog
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        onPaid={async () => {
          await entitlement.refresh();
        }}
      />
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
        showInbox={settings.showInbox}
        onShowInboxChange={(showInbox) => updateSettings({ showInbox })}
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

      <WalkthroughTour
        open={walkthroughOpen}
        onOpenChange={setWalkthroughOpen}
        isAuthed={!!user}
        onRequestOpenSettings={() => setSettingsDialogOpen(true)}
      />
    </div>
  );
};

export default Index;
