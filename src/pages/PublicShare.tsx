import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ReadOnlyYearCalendar } from "@/components/calendar/ReadOnlyYearCalendar";
import { YearCalendar } from "@/components/calendar/YearCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { StickyNote, NoteConnection, StickyColor } from "@/types/calendar";
import { Eye, Edit3, Lock, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Helper to call RPC functions that aren't in the generated types yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc.bind(supabase) as (name: string, params?: Record<string, unknown>) => Promise<{ data: any; error: any }>;

type SharePermission = "viewer" | "editor";

interface ShareCalendar {
  id: string;
  name: string;
}

interface ShareInfo {
  slug: string;
  permission: SharePermission;
  requires_password: boolean;
  calendars: ShareCalendar[];
}

interface Snapshot {
  permission: SharePermission;
  calendars: ShareCalendar[];
  notes: StickyNote[];
  connections: NoteConnection[];
}

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
  const [storedPassword, setStoredPassword] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [activeCalendarId, setActiveCalendarId] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const hasLoadedRef = useRef(false);

  const isEditor = snapshot?.permission === "editor";
  const notes = snapshot?.notes ?? [];
  const connections = snapshot?.connections ?? [];

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const set = new Set<number>([current, current + 1]);
    for (const note of notes) {
      if (!note.date) continue;
      const year = Number.parseInt(note.date.slice(0, 4), 10);
      if (Number.isFinite(year)) set.add(year);
    }
    return [...set].sort((a, b) => a - b);
  }, [notes]);

  const calendars = useMemo(() => snapshot?.calendars ?? [], [snapshot]);

  // Calendar options for note dropdown
  const calendarOptions = useMemo(
    () => calendars.map((c) => ({ id: c.id, name: c.name })),
    [calendars]
  );

  // Default note color by calendar (simple default)
  const calendarDefaultNoteColorById = useMemo(() => {
    const colors: StickyColor[] = ["yellow", "pink", "green", "blue", "orange", "purple"];
    const map: Record<string, StickyColor> = {};
    calendars.forEach((c, i) => {
      map[c.id] = colors[i % colors.length];
    });
    return map;
  }, [calendars]);

  // Visible calendar IDs - all calendars in the link
  const visibleCalendarIds = useMemo(() => calendars.map((c) => c.id), [calendars]);

  // Effective active calendar ID
  const effectiveActiveCalendarId = activeCalendarId ?? calendars[0]?.id ?? null;

  const loadSnapshot = useCallback(
    async (pw: string | null) => {
      if (!slug) return false;
      setIsLoading(true);
      setPasswordError(null);

      const { data, error } = await rpc("get_public_share_link_snapshot", {
        p_slug: slug,
        p_password: pw,
        p_calendar_ids: null,
      });

      setIsLoading(false);
      setIsSubmittingPassword(false);

      if (error) {
        const message = error.message?.toLowerCase?.() ?? "";
        if (message.includes("invalid password")) {
          setPasswordError("Incorrect password.");
          return false;
        }
        if (message.includes("too many attempts")) {
          setPasswordError("Too many attempts. Please try again later.");
          return false;
        }
        toast({ title: "Couldn't load calendar", description: error.message, variant: "destructive" });
        return false;
      }

      const snap = data as unknown as {
        permission: SharePermission;
        calendars: ShareCalendar[];
        notes?: Array<{
          id: string;
          calendar_id: string;
          user_id: string;
          date: string | null;
          text: string;
          color: StickyColor;
          is_struck?: boolean;
          pos_x: number | null;
          pos_y: number | null;
          sort_order?: number | null;
          created_at?: string;
        }>;
        connections?: Array<{
          id: string;
          calendar_id: string;
          user_id: string;
          source_note_id: string;
          target_note_id: string;
        }>;
      };

      const parsedNotes: StickyNote[] = (snap.notes ?? []).map((n) => ({
        id: n.id,
        calendar_id: n.calendar_id,
        user_id: n.user_id,
        date: n.date,
        text: n.text,
        color: n.color,
        is_struck: typeof n.is_struck === "boolean" ? n.is_struck : false,
        pos_x: n.pos_x,
        pos_y: n.pos_y,
        sort_order: n.sort_order ?? null,
        created_at: n.created_at,
      }));

      const parsedConnections: NoteConnection[] = (snap.connections ?? []).map((c) => ({
        id: c.id,
        calendar_id: c.calendar_id,
        user_id: c.user_id,
        source_note_id: c.source_note_id,
        target_note_id: c.target_note_id,
      }));

      setSnapshot({
        permission: snap.permission,
        calendars: snap.calendars ?? [],
        notes: parsedNotes,
        connections: parsedConnections,
      });
      setStoredPassword(pw);

      // Set first calendar as active if not set
      if (snap.calendars && snap.calendars.length > 0) {
        setActiveCalendarId((prev) => prev ?? snap.calendars[0].id);
      }

      if (window.location.hash.includes("pw=")) {
        window.history.replaceState(null, "", window.location.pathname);
      }

      return true;
    },
    [slug, toast]
  );

  // Initial load - only run once
  useEffect(() => {
    if (!slug) return;
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const run = async () => {
      setIsLoading(true);

      const { data, error } = await rpc("get_public_share_link_info", { p_slug: slug });

      if (error) {
        setIsLoading(false);
        toast({ title: "Couldn't load link", description: error.message, variant: "destructive" });
        return;
      }

      const row = data as unknown as ShareInfo | null;
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
  }, [slug, loadSnapshot, toast]);

  // Handler for password form submission
  const handlePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password || isSubmittingPassword) return;
      setIsSubmittingPassword(true);
      await loadSnapshot(password);
    },
    [password, isSubmittingPassword, loadSnapshot]
  );

  // Handler for refreshing data
  const handleRefresh = useCallback(() => {
    loadSnapshot(storedPassword);
  }, [loadSnapshot, storedPassword]);

  if (!slug) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Invalid link.</div>;
  }

  if (!isLoading && !info) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Calendar className="h-16 w-16 text-muted-foreground opacity-40" />
        <h1 className="text-xl font-semibold">Link not found</h1>
        <p className="text-muted-foreground text-sm">This share link doesn't exist or has been disabled.</p>
      </div>
    );
  }

  if (info?.requires_password && !snapshot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <form className="w-full max-w-sm space-y-4" onSubmit={handlePasswordSubmit}>
          <div className="text-center">
            <Lock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Protected Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {info.calendars.length === 1
                ? info.calendars[0].name
                : `${info.calendars.length} calendars`}
            </p>
            <Badge
              variant={info.permission === "editor" ? "default" : "secondary"}
              className="mt-2"
            >
              {info.permission === "editor" ? (
                <><Edit3 className="h-3 w-3 mr-1" /> Can edit</>
              ) : (
                <><Eye className="h-3 w-3 mr-1" /> View only</>
              )}
            </Badge>
          </div>

          <div className="grid gap-2">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              disabled={isSubmittingPassword}
            />
            {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmittingPassword || !password}>
            {isSubmittingPassword ? "Loading…" : "Open"}
          </Button>
        </form>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  // Editor mode - show full interactive calendar
  if (isEditor) {
    return (
      <div className="min-h-screen bg-background relative">
        {/* Header bar with info */}
        <div className="fixed top-4 left-4 z-50 flex flex-wrap gap-2 items-center">
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
            <Edit3 className="h-3 w-3 mr-1" /> Edit Mode
          </Badge>
          
          {calendars.length > 1 && (
            <Select
              value={effectiveActiveCalendarId ?? ""}
              onValueChange={setActiveCalendarId}
            >
              <SelectTrigger className="w-[180px] bg-background/80 backdrop-blur-sm">
                <SelectValue placeholder="Select calendar" />
              </SelectTrigger>
              <SelectContent>
                {calendars.map((cal) => (
                  <SelectItem key={cal.id} value={cal.id}>
                    {cal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {calendars.length === 1 && (
            <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
              {calendars[0].name}
            </Badge>
          )}
        </div>

        <YearCalendar
          years={years}
          userId={null}
          visibleCalendarIds={visibleCalendarIds}
          activeCalendarId={effectiveActiveCalendarId}
          refreshToken={refreshToken}
          onAuthRequired={() => {}}
          textOverflowMode="expand"
          calendarOptions={calendarOptions}
          calendarDefaultNoteColorById={calendarDefaultNoteColorById}
          // Public share editing props
          publicShareSlug={slug}
          publicSharePassword={storedPassword}
          publicShareNotes={notes}
          publicShareConnections={connections}
          onPublicShareRefresh={handleRefresh}
        />
      </div>
    );
  }

  // Viewer mode - read only
  return (
    <div className="min-h-screen bg-background relative">
      {/* Header bar with info */}
      <div className="fixed top-4 left-4 z-50 flex flex-wrap gap-2 items-center">
        <Badge variant="secondary">
          <Eye className="h-3 w-3 mr-1" /> View Only
        </Badge>
        
        {calendars.length > 1 && (
          <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
            {calendars.length} calendars
          </Badge>
        )}

        {calendars.length === 1 && (
          <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
            {calendars[0].name}
          </Badge>
        )}
      </div>

      <ReadOnlyYearCalendar
        years={years}
        notes={notes}
        connections={connections}
        textOverflowMode="expand"
      />
    </div>
  );
}
