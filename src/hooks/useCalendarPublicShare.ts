import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CalendarPublicShareSettings {
  slug: string;
  hasPassword: boolean;
  isEnabled: boolean;
}

export function useCalendarPublicShare(calendarId: string | null) {
  const [settings, setSettings] = useState<CalendarPublicShareSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!calendarId) {
      setSettings(null);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase.rpc("get_calendar_public_share_settings", { p_calendar_id: calendarId });
    setIsLoading(false);
    if (error) {
      console.error("Error fetching public share settings:", error);
      setSettings(null);
      return;
    }
    const row = data?.[0];
    if (!row) {
      setSettings(null);
      return;
    }
    setSettings({
      slug: row.slug,
      hasPassword: row.has_password,
      isEnabled: row.is_enabled,
    });
  }, [calendarId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setPublicShare = useCallback(
    async (opts: { slug: string; password?: string | null; removePassword?: boolean }) => {
      if (!calendarId) return { ok: false as const, error: "No calendar selected" };
      const { data, error } = await supabase.rpc("set_calendar_public_share", {
        p_calendar_id: calendarId,
        p_slug: opts.slug,
        p_password: opts.password ?? null,
        p_remove_password: opts.removePassword ?? false,
      });
      if (error) {
        console.error("Error setting public share:", error);
        return { ok: false as const, error: error.message ?? "Failed to update public share" };
      }
      const row = data?.[0];
      if (row) {
        setSettings({ slug: row.slug, hasPassword: row.has_password, isEnabled: true });
      } else {
        await refresh();
      }
      return { ok: true as const };
    },
    [calendarId, refresh]
  );

  const revokePublicShare = useCallback(async () => {
    if (!calendarId) return { ok: false as const, error: "No calendar selected" };
    const { data, error } = await supabase.rpc("revoke_calendar_public_share", { p_calendar_id: calendarId });
    if (error) {
      console.error("Error revoking public share:", error);
      return { ok: false as const, error: error.message ?? "Failed to revoke public share" };
    }
    if (data) setSettings(null);
    return { ok: true as const };
  }, [calendarId]);

  return { settings, isLoading, refresh, setPublicShare, revokePublicShare };
}

