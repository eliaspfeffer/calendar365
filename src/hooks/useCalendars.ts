import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CalendarMemberRole = "owner" | "editor" | "viewer";

export interface CalendarSummary {
  id: string;
  name: string;
  owner_id: string;
  role: CalendarMemberRole;
}

export function useCalendars(userId: string | null) {
  const [calendars, setCalendars] = useState<CalendarSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultCalendarId, setDefaultCalendarId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCalendars([]);
      setDefaultCalendarId(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const ensured = await supabase.rpc("ensure_default_calendar");
    if (ensured.error) {
      console.error("Error ensuring default calendar:", ensured.error);
    } else {
      setDefaultCalendarId(ensured.data);
    }

    const { data, error } = await supabase
      .from("calendar_members")
      .select("role, calendars ( id, name, owner_id )")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching calendars:", error);
      setCalendars([]);
      setIsLoading(false);
      return;
    }

    const rows = (data as unknown as Array<{ role: CalendarMemberRole; calendars: { id: string; name: string; owner_id: string } | null }>) || [];
    const mapped: CalendarSummary[] = rows
      .map((row) => {
        const cal = row.calendars;
        if (!cal) return null;
        return {
          id: cal.id,
          name: cal.name,
          owner_id: cal.owner_id,
          role: row.role as CalendarMemberRole,
        };
      })
      .filter((x): x is CalendarSummary => Boolean(x))
      .sort((a, b) => a.name.localeCompare(b.name, "de"));

    setCalendars(mapped);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createCalendar = useCallback(
    async (name: string) => {
      if (!userId) return null;
      const { data, error } = await supabase.rpc("create_calendar", { p_name: name });
      if (error) {
        console.error("Error creating calendar:", error);
        return null;
      }
      await refresh();
      return data;
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

  return { calendars, byId, isLoading, defaultCalendarId, refresh, createCalendar, createInvite, acceptInvite };
}
