import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CalendarMemberRole = "owner" | "editor" | "viewer";
export type CalendarsSchemaStatus = "unknown" | "ready" | "missing" | "error";

export interface CalendarSummary {
  id: string;
  name: string;
  owner_id: string;
  role: CalendarMemberRole;
  default_note_color?: string | null;
}

export interface CreateCalendarResult {
  id: string | null;
  error?: string;
}

function isCalendarsSchemaMissingError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string; details?: string; hint?: string } | null)?.message;
  const details = (error as { message?: string; details?: string; hint?: string } | null)?.details;
  const hint = (error as { message?: string; details?: string; hint?: string } | null)?.hint;

  if (code === "PGRST202" || code === "42P01") return true;

  const haystack = `${message ?? ""} ${details ?? ""} ${hint ?? ""}`.toLowerCase();
  if (haystack.includes("schema cache")) return true;
  if (haystack.includes("could not find the function")) return true;
  if (haystack.includes("relation") && haystack.includes("does not exist")) return true;
  if (haystack.includes("function") && haystack.includes("does not exist")) return true;
  return false;
}

export function useCalendars(userId: string | null) {
  const [calendars, setCalendars] = useState<CalendarSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultCalendarId, setDefaultCalendarId] = useState<string | null>(null);
  const [schemaStatus, setSchemaStatus] = useState<CalendarsSchemaStatus>("unknown");
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCalendars([]);
      setDefaultCalendarId(null);
      setSchemaStatus("unknown");
      setSchemaError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setSchemaStatus("unknown");
    setSchemaError(null);

    const ensured = await supabase.rpc("ensure_default_calendar");
    if (ensured.error) {
      console.error("Error ensuring default calendar:", ensured.error);
      if (isCalendarsSchemaMissingError(ensured.error)) {
        const errCode = (ensured.error as { code?: string } | null)?.code;
        setCalendars([]);
        setDefaultCalendarId(null);
        setSchemaStatus("missing");
        setSchemaError(
          errCode === "PGRST202"
            ? "Supabase API Schema-Cache ist noch nicht aktualisiert. Im Supabase Dashboard: Settings → API → Reload schema, dann Seite neu laden."
            : "Supabase-Kalenderschema fehlt. Bitte die neuesten Migrationen anwenden (shared calendars)."
        );
        setIsLoading(false);
        return;
      }
      setSchemaStatus("error");
    } else {
      setDefaultCalendarId(ensured.data);
    }

    const { data, error } = await supabase
      .from("calendar_members")
      .select("role, calendars ( id, name, owner_id, default_note_color )")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching calendars:", error);
      setCalendars([]);
      if (isCalendarsSchemaMissingError(error)) {
        const errCode = (error as { code?: string } | null)?.code;
        setDefaultCalendarId(null);
        setSchemaStatus("missing");
        setSchemaError(
          errCode === "PGRST202"
            ? "Supabase API Schema-Cache ist noch nicht aktualisiert. Im Supabase Dashboard: Settings → API → Reload schema, dann Seite neu laden."
            : "Supabase-Kalenderschema fehlt. Bitte die neuesten Migrationen anwenden (shared calendars)."
        );
      } else {
        setSchemaStatus("error");
      }
      setIsLoading(false);
      return;
    }

    const rows =
      (data as unknown as Array<{
        role: CalendarMemberRole;
        calendars: { id: string; name: string; owner_id: string; default_note_color?: string | null } | null;
      }>) || [];
    const mapped: CalendarSummary[] = rows
      .map((row) => {
        const cal = row.calendars;
        if (!cal) return null;
        return {
          id: cal.id,
          name: cal.name,
          owner_id: cal.owner_id,
          role: row.role as CalendarMemberRole,
          default_note_color: cal.default_note_color ?? null,
        };
      })
      .filter((x): x is CalendarSummary => Boolean(x))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));

    setCalendars(mapped);
    setSchemaStatus("ready");
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createCalendar = useCallback(
    async (name: string, defaultNoteColor?: string): Promise<CreateCalendarResult> => {
      if (!userId) return { id: null, error: "Nicht angemeldet." };
      const attemptWithColor = await supabase.rpc("create_calendar", {
        p_name: name,
        ...(defaultNoteColor ? { p_default_note_color: defaultNoteColor } : {}),
      });
      let data = attemptWithColor.data;
      let error = attemptWithColor.error;

      // Back-compat: older DB function signature may not support p_default_note_color.
      if (error && `${error.message ?? ""}`.toLowerCase().includes("p_default_note_color")) {
        const retry = await supabase.rpc("create_calendar", { p_name: name });
        data = retry.data;
        error = retry.error;
      }
      if (error) {
        console.error("Error creating calendar:", error);
        if (isCalendarsSchemaMissingError(error)) {
          const errCode = (error as { code?: string } | null)?.code;
          setSchemaStatus("missing");
          setSchemaError(
            errCode === "PGRST202"
              ? "Supabase API Schema-Cache ist noch nicht aktualisiert. Im Supabase Dashboard: Settings → API → Reload schema, dann Seite neu laden."
              : "Supabase-Kalenderschema fehlt. Bitte die neuesten Migrationen anwenden (shared calendars)."
          );
          return {
            id: null,
            error:
              errCode === "PGRST202"
                ? "Supabase API Schema-Cache ist noch nicht aktualisiert. Bitte Schema neu laden und erneut versuchen."
                : "Kalender-Funktion nicht verfügbar. Bitte Supabase-Migrationen anwenden.",
          };
        }
        return { id: null, error: error.message || "Unbekannter Fehler." };
      }
      await refresh();
      return { id: data, error: undefined };
    },
    [userId, refresh]
  );

  const createInvite = useCallback(
    async (calendarId: string, role: CalendarMemberRole = "editor", expiresInDays = 14) => {
      if (!userId) return null;
      const { data, error } = await supabase.rpc("create_calendar_invite", {
        p_calendar_id: calendarId,
        p_role: role,
        p_expires_in_days: expiresInDays,
      });
      if (error) {
        console.error("Error creating invite:", error);
        return null;
      }
      return data;
    },
    [userId]
  );

  const acceptInvite = useCallback(
    async (token: string) => {
      if (!userId) return null;
      const { data, error } = await supabase.rpc("accept_calendar_invite", { p_token: token });
      if (error) {
        console.error("Error accepting invite:", error);
        return null;
      }
      await refresh();
      return data;
    },
    [userId, refresh]
  );

  const byId = useMemo(() => new Map(calendars.map((c) => [c.id, c])), [calendars]);

  return { calendars, byId, isLoading, defaultCalendarId, schemaStatus, schemaError, refresh, createCalendar, createInvite, acceptInvite };
}
