import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { CalendarSummary } from "@/hooks/useCalendars";
import type { NoteConnection, StickyNote } from "@/types/calendar";
import { coerceStickyColor } from "@/lib/stickyNoteColors";
import { GUEST_CALENDAR_ID, GUEST_USER_ID, loadGuestNotes, makeGuestId, saveGuestNotes } from "@/lib/guestNotesStorage";
import { makeYamlNotesExample, parseYamlNotesDocument, stringifyYamlNotesDocument } from "@/lib/yamlNotes";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  calendars: CalendarSummary[];
  activeCalendarId: string | null;
  onImported: () => void;
};

type SupabaseErrorLike = { code?: string; message?: string; details?: string; hint?: string };

function isMissingColumn(error: unknown, column: string) {
  const err = error as SupabaseErrorLike | null | undefined;
  if (!err) return false;
  const msg = `${err.message ?? ""} ${err.details ?? ""} ${err.hint ?? ""}`.toLowerCase();
  const col = column.toLowerCase();
  if (err.code === "42703") return msg.includes(col); // undefined_column
  if (err.code === "PGRST204") return msg.includes(col) && msg.includes("schema cache");
  return msg.includes(col) && msg.includes("does not exist");
}

function isMissingCalendarIdColumn(error: unknown) {
  return isMissingColumn(error, "calendar_id");
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

function toYamlForCalendar(calendarName: string, notes: StickyNote[], connections: NoteConnection[]) {
  const byId = new Map(notes.map((n) => [n.id, n]));
  const connectionsByNoteId = new Map<string, string[]>();
  for (const c of connections) {
    const a = byId.get(c.source_note_id);
    const b = byId.get(c.target_note_id);
    if (!a || !b) continue;
    connectionsByNoteId.set(a.id, [...(connectionsByNoteId.get(a.id) ?? []), b.text]);
    connectionsByNoteId.set(b.id, [...(connectionsByNoteId.get(b.id) ?? []), a.text]);
  }

  const sorted = [...notes].sort((a, b) => {
    const ad = a.date ?? "";
    const bd = b.date ?? "";
    if (ad !== bd) return ad.localeCompare(bd);
    return a.id.localeCompare(b.id);
  });

  return stringifyYamlNotesDocument({
    schema: "calendar365.notes.v1",
    language: "YAML 1.2",
    calendar: calendarName,
    notes: sorted.map((n) => ({
      id: n.id,
      calendar: calendarName,
      date: n.date ?? null,
      float: n.date ? null : n.pos_x != null && n.pos_y != null ? { x: n.pos_x, y: n.pos_y } : null,
      text: n.text,
      color: n.color,
      connection: connectionsByNoteId.get(n.id) ?? null,
    })),
  });
}

export function YamlImportExportDialog({ open, onOpenChange, userId, calendars, activeCalendarId, onImported }: Props) {
  const { toast } = useToast();

  const isSignedIn = Boolean(userId);
  const writableCalendars = useMemo(
    () => calendars.filter((c) => c.role === "owner" || c.role === "editor"),
    [calendars],
  );

  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("__guest__");
  const [tab, setTab] = useState<"export" | "import">("export");
  const [exportYaml, setExportYaml] = useState<string>("");
  const [exportLoading, setExportLoading] = useState(false);
  const [importYaml, setImportYaml] = useState<string>("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const selectedCalendar = useMemo(() => {
    if (!isSignedIn) return null;
    return calendars.find((c) => c.id === selectedCalendarId) ?? null;
  }, [calendars, isSignedIn, selectedCalendarId]);

  const selectedCalendarName = useMemo(() => {
    if (!isSignedIn) return "Local (guest)";
    return selectedCalendar?.name ?? "Calendar";
  }, [isSignedIn, selectedCalendar?.name]);

  useEffect(() => {
    if (!open) return;
    if (!isSignedIn) {
      setSelectedCalendarId("__guest__");
      return;
    }
    const preferred = writableCalendars.find((c) => c.id === activeCalendarId)?.id ?? writableCalendars[0]?.id ?? null;
    if (preferred && preferred !== selectedCalendarId) setSelectedCalendarId(preferred);
  }, [activeCalendarId, isSignedIn, open, selectedCalendarId, writableCalendars]);

  const refreshExport = useCallback(async () => {
    setExportLoading(true);
    try {
      if (!isSignedIn) {
        const guestNotes = loadGuestNotes().filter((n) => n.user_id === GUEST_USER_ID);
        setExportYaml(toYamlForCalendar("Local (guest)", guestNotes, []));
        return;
      }

      if (!userId) return;
      const calId = selectedCalendarId;
      const calName = selectedCalendarName;

      const notesRes = await supabase.from("sticky_notes").select("*").eq("calendar_id", calId);
      if (notesRes.error) throw notesRes.error;
      const notes = (notesRes.data ?? []) as StickyNote[];

      const connectionsRes = await supabase.from("note_connections").select("*").eq("calendar_id", calId);
      if (connectionsRes.error) {
        if (isMissingCalendarIdColumn(connectionsRes.error)) {
          const legacy = await supabase.from("note_connections").select("*").eq("user_id", userId);
          if (legacy.error) throw legacy.error;
          const legacyConnections = (legacy.data ?? []) as NoteConnection[];
          setExportYaml(toYamlForCalendar(calName, notes, legacyConnections.filter((c) => c.calendar_id === calId)));
          return;
        }
        throw connectionsRes.error;
      }
      const connections = (connectionsRes.data ?? []) as NoteConnection[];
      setExportYaml(toYamlForCalendar(calName, notes, connections));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn’t export YAML";
      toast({ title: "YAML export failed", description: message, variant: "destructive" });
      setExportYaml("");
    } finally {
      setExportLoading(false);
    }
  }, [isSignedIn, selectedCalendarId, selectedCalendarName, toast, userId]);

  useEffect(() => {
    if (!open) return;
    refreshExport();
  }, [open, refreshExport, selectedCalendarId]);

  const handleFillExample = useCallback(() => {
    setImportYaml(makeYamlNotesExample(selectedCalendarName));
    setTab("import");
  }, [selectedCalendarName]);

  const handleImport = useCallback(async () => {
    if (importLoading) return;
    setImportLoading(true);

    try {
      const parsed = parseYamlNotesDocument(importYaml);
      if (!parsed.ok) {
        toast({
          title: "Invalid YAML",
          description: parsed.errors[0] ?? "Couldn’t parse YAML.",
          variant: "destructive",
        });
        return;
      }

      const doc = parsed.value;
      const effectiveReplace = replaceExisting || doc.mode === "replace";
      const expectedCalendar = selectedCalendarName.trim();
      if (doc.calendar.trim() !== expectedCalendar) {
        toast({
          title: "Wrong calendar selected",
          description: `YAML calendar is "${doc.calendar}", but you selected "${expectedCalendar}".`,
          variant: "destructive",
        });
        return;
      }

      if (!isSignedIn) {
        const current = loadGuestNotes();
        const byId = new Map(current.map((n) => [n.id, n]));
        const next: StickyNote[] = effectiveReplace ? [] : [...current];

        for (const note of doc.notes) {
          const id = note.id ?? makeGuestId();
          const existing = byId.get(id);
          const updated: StickyNote = {
            id,
            user_id: GUEST_USER_ID,
            calendar_id: GUEST_CALENDAR_ID,
            date: note.date ?? null,
            text: note.text,
            color: coerceStickyColor(note.color, "yellow"),
            pos_x: note.date ? null : note.float?.x ?? null,
            pos_y: note.date ? null : note.float?.y ?? null,
          };
          if (existing && !effectiveReplace) {
            const idx = next.findIndex((n) => n.id === id);
            if (idx >= 0) next[idx] = updated;
            else next.push(updated);
          } else {
            next.push(updated);
          }
        }

        saveGuestNotes(next);
        onImported();
        toast({ title: "Imported YAML", description: `${doc.notes.length} note(s) saved locally.` });
        return;
      }

      if (!userId) return;
      const calId = selectedCalendarId;
      const isWritable = writableCalendars.some((c) => c.id === calId);
      if (!isWritable) {
        toast({ title: "No write access", description: "You can only import into calendars you can edit.", variant: "destructive" });
        return;
      }

      const existingNotesRes = await supabase.from("sticky_notes").select("*").eq("calendar_id", calId);
      if (existingNotesRes.error) throw existingNotesRes.error;
      const existingNotes = (existingNotesRes.data ?? []) as StickyNote[];
      const existingByText = new Map<string, StickyNote[]>();
      for (const n of existingNotes) {
        const bucket = existingByText.get(n.text) ?? [];
        bucket.push(n);
        existingByText.set(n.text, bucket);
      }

      const existingConnectionsRes = await supabase.from("note_connections").select("*").eq("calendar_id", calId);
      const existingConnections =
        existingConnectionsRes.error
          ? []
          : ((existingConnectionsRes.data ?? []) as NoteConnection[]);
      const existingPairKeys = new Set(
        existingConnections.map((c) => [c.source_note_id, c.target_note_id].sort().join("|")),
      );

      if (effectiveReplace) {
        await supabase.from("note_connections").delete().eq("calendar_id", calId);
        await supabase.from("sticky_notes").delete().eq("calendar_id", calId);
      }

      const importedTextToId = new Map<string, string>();
      const importedIds: string[] = [];
      const notesToConnect: Array<{ id: string; connectsTo: string[] }> = [];

      for (const note of doc.notes) {
        const date = note.date ?? null;
        const base = {
          user_id: userId,
          calendar_id: calId,
          date,
          text: note.text,
          color: coerceStickyColor(note.color, "yellow"),
          pos_x: date ? null : note.float?.x ?? null,
          pos_y: date ? null : note.float?.y ?? null,
        };

        const withId = note.id ? { ...base, id: note.id } : base;

        let savedId: string | null = null;

        if (note.id && !effectiveReplace) {
          const updated = await supabase
            .from("sticky_notes")
            .update(withId)
            .eq("id", note.id)
            .eq("calendar_id", calId)
            .select("id")
            .maybeSingle();
          if (!updated.error && updated.data?.id) {
            savedId = updated.data.id;
          }
        }

        if (!savedId) {
          const inserted = await supabase.from("sticky_notes").insert(withId).select("id").single();
          if (inserted.error && (isMissingColumn(inserted.error, "pos_x") || isMissingColumn(inserted.error, "pos_y"))) {
            const retryBase = { ...withId };
            delete (retryBase as Record<string, unknown>).pos_x;
            delete (retryBase as Record<string, unknown>).pos_y;
            const retried = await supabase.from("sticky_notes").insert(retryBase).select("id").single();
            if (retried.error) throw retried.error;
            savedId = retried.data.id;
          } else {
            if (inserted.error) throw inserted.error;
            savedId = inserted.data.id;
          }
        }

        importedIds.push(savedId);
        if (!importedTextToId.has(note.text)) importedTextToId.set(note.text, savedId);
        if (note.connection && note.connection.length > 0) notesToConnect.push({ id: savedId, connectsTo: note.connection });
      }

      let createdConnections = 0;
      let skippedConnections = 0;

      for (const entry of notesToConnect) {
        for (const targetText of entry.connectsTo) {
          const targetId =
            importedTextToId.get(targetText) ??
            existingByText.get(targetText)?.[0]?.id ??
            null;
          if (!targetId || targetId === entry.id) {
            skippedConnections += 1;
            continue;
          }
          const pairKey = [entry.id, targetId].sort().join("|");
          if (existingPairKeys.has(pairKey)) continue;
          existingPairKeys.add(pairKey);

          const base = { user_id: userId, source_note_id: entry.id, target_note_id: targetId };
          const primary = await supabase
            .from("note_connections")
            .insert({ ...base, calendar_id: calId })
            .select("id")
            .single();
          if (primary.error && isMissingCalendarIdColumn(primary.error)) {
            const legacy = await supabase.from("note_connections").insert(base).select("id").single();
            if (legacy.error) throw legacy.error;
          } else if (primary.error) {
            throw primary.error;
          }
          createdConnections += 1;
        }
      }

      onImported();
      toast({
        title: "Imported YAML",
        description: `${importedIds.length} note(s), ${createdConnections} connection(s) (${skippedConnections} skipped).`,
      });
      setImportYaml("");
      await refreshExport();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn’t import YAML";
      toast({ title: "YAML import failed", description: message, variant: "destructive" });
    } finally {
      setImportLoading(false);
    }
  }, [
    importLoading,
    importYaml,
    isSignedIn,
    onImported,
    refreshExport,
    replaceExisting,
    selectedCalendarId,
    selectedCalendarName,
    toast,
    userId,
    writableCalendars,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>YAML import/export</DialogTitle>
          <DialogDescription>Copy/paste your notes as YAML into any chat (YAML 1.2).</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[220px]">
            <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId} disabled={!isSignedIn}>
              <SelectTrigger>
                <SelectValue placeholder="Select calendar" />
              </SelectTrigger>
              <SelectContent>
                {isSignedIn ? (
                  calendars.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.role === "viewer" ? " (read-only)" : ""}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="__guest__">Local (guest)</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={handleFillExample}>
            Insert commented example
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void refreshExport();
              setTab("export");
            }}
            disabled={exportLoading}
          >
            Refresh export
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "export" | "import")} className="min-h-0 flex flex-col">
          <TabsList className="w-fit">
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="min-h-0 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={() => void copyToClipboard(exportYaml)} disabled={!exportYaml}>
                Copy
              </Button>
              <Button type="button" variant="outline" onClick={() => setExportYaml("")} disabled={!exportYaml}>
                Clear
              </Button>
              <div className="text-sm text-muted-foreground">{selectedCalendarName}</div>
            </div>
            <Textarea
              value={exportYaml}
              readOnly
              className="min-h-[360px] font-mono text-xs"
              placeholder={exportLoading ? "Exporting…" : "No data."}
            />
          </TabsContent>

          <TabsContent value="import" className="min-h-0 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="replace-existing"
                  checked={replaceExisting}
                  onCheckedChange={(v) => setReplaceExisting(v === true)}
                />
                <Label htmlFor="replace-existing" className="text-sm">
                  Replace existing notes in this calendar
                </Label>
              </div>
              <Button type="button" onClick={() => void handleImport()} disabled={importLoading}>
                {importLoading ? "Importing…" : "Import YAML"}
              </Button>
            </div>

            <Textarea
              value={importYaml}
              onChange={(e) => setImportYaml(e.target.value)}
              className="min-h-[360px] font-mono text-xs"
              placeholder="Paste YAML here…"
              spellCheck={false}
            />

            {importYaml.trim().length > 0 && (
              <div className="text-xs text-muted-foreground">
                Tip: keep the exported <code>id</code> to update notes instead of creating duplicates.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
