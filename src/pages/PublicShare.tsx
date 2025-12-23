import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ReadOnlyYearCalendar } from "@/components/calendar/ReadOnlyYearCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { StickyNote, NoteConnection, StickyColor } from "@/types/calendar";

type ShareInfo = { calendar_name: string; requires_password: boolean };

function readPasswordFromUrl(): { password: string | null; cleaned: boolean } {
  let cleaned = false;
  const url = new URL(window.location.href);

  const queryPw = url.searchParams.get("pw");
  if (queryPw) {
    url.searchParams.delete("pw");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    cleaned = true;
    return { password: queryPw, cleaned };
  }

  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (hash.startsWith("pw=")) {
    const pw = decodeURIComponent(hash.slice("pw=".length));
    return { password: pw, cleaned };
  }

  const params = new URLSearchParams(hash);
  const pw = params.get("pw");
  if (pw) return { password: pw, cleaned };

  return { password: null, cleaned };
}

export default function PublicShare() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();

  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<StickyNote[] | null>(null);
  const [connections, setConnections] = useState<NoteConnection[] | null>(null);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const set = new Set<number>([current, current + 1]);
    for (const note of notes ?? []) {
      if (!note.date) continue;
      const year = Number.parseInt(note.date.slice(0, 4), 10);
      if (Number.isFinite(year)) set.add(year);
    }
    return [...set].sort((a, b) => a - b);
  }, [notes]);

  const loadSnapshot = useCallback(
    async (pw: string | null) => {
      if (!slug) return;
      setIsLoading(true);
      setPasswordError(null);
      const { data, error } = await supabase.rpc("get_public_calendar_share_snapshot", {
        p_slug: slug,
        p_password: pw,
      });
      setIsLoading(false);
      if (error) {
        const message = error.message?.toLowerCase?.() ?? "";
        if (message.includes("invalid password")) {
          setPasswordError("Falsches Passwort.");
          return;
        }
        if (message.includes("too many attempts")) {
          setPasswordError("Zu viele Versuche. Bitte später erneut versuchen.");
          return;
        }
        toast({ title: "Konnte Kalender nicht laden", description: error.message, variant: "destructive" });
        return;
      }

      const snapshot = data as unknown as {
        notes?: Array<{
          id: string;
          calendar_id: string;
          user_id: string;
          date: string | null;
          text: string;
          color: StickyColor;
          pos_x: number | null;
          pos_y: number | null;
        }>;
        connections?: Array<{
          id: string;
          calendar_id: string;
          user_id: string;
          source_note_id: string;
          target_note_id: string;
        }>;
      };

      setNotes(
        (snapshot.notes ?? []).map((n) => ({
          id: n.id,
          calendar_id: n.calendar_id,
          user_id: n.user_id,
          date: n.date,
          text: n.text,
          color: n.color,
          pos_x: n.pos_x,
          pos_y: n.pos_y,
        }))
      );
      setConnections(
        (snapshot.connections ?? []).map((c) => ({
          id: c.id,
          calendar_id: c.calendar_id,
          user_id: c.user_id,
          source_note_id: c.source_note_id,
          target_note_id: c.target_note_id,
        }))
      );

      if (window.location.hash.includes("pw=")) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    },
    [slug, toast]
  );

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setNotes(null);
      setConnections(null);
      setInfo(null);
      setPasswordError(null);

      const { data, error } = await supabase.rpc("get_public_calendar_share_info", { p_slug: slug });
      if (cancelled) return;
      if (error) {
        setIsLoading(false);
        toast({ title: "Konnte Link nicht laden", description: error.message, variant: "destructive" });
        return;
      }
      const row = data?.[0] ?? null;
      if (!row) {
        setIsLoading(false);
        setInfo(null);
        return;
      }
      setInfo(row);

      const { password: pw } = readPasswordFromUrl();
      if (!row.requires_password) {
        await loadSnapshot(null);
        return;
      }
      if (pw) {
        setPassword(pw);
        await loadSnapshot(pw);
        return;
      }
      setIsLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [slug, loadSnapshot, toast]);

  if (!slug) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Ungültiger Link.</div>;
  }

  if (!isLoading && !info) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Link nicht gefunden.</div>;
  }

  if (info?.requires_password && notes === null && connections === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          <div>
            <h1 className="text-xl font-semibold">{info.calendar_name}</h1>
            <p className="text-sm text-muted-foreground">Dieser Kalender ist passwortgeschützt.</p>
          </div>

          <div className="grid gap-2">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort"
              autoFocus
            />
            {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
          </div>

          <Button onClick={() => loadSnapshot(password || null)} disabled={isLoading || !password}>
            {isLoading ? "Lade…" : "Öffnen"}
          </Button>
        </div>
      </div>
    );
  }

  if (!notes || !connections) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Lade…</div>;
  }

  return <ReadOnlyYearCalendar years={years} notes={notes} connections={connections} textOverflowMode="expand" />;
}

