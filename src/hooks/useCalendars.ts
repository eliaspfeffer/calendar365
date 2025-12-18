import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isShareRole, type CalendarAccessRole } from "@/lib/calendarSharing";

export interface CalendarListItem {
  ownerId: string;
  role: CalendarAccessRole;
  label: string;
}

function defaultSharedLabel(ownerId: string) {
  return `Shared (${ownerId.slice(0, 8)})`;
}

export function useCalendars(authUserId: string | null) {
  const [sharedCalendars, setSharedCalendars] = useState<CalendarListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authUserId) {
      setSharedCalendars([]);
      setIsLoading(false);
      return;
    }

    const fetchShared = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("calendar_members")
        .select("owner_id, role, label")
        .eq("member_id", authUserId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching shared calendars:", error);
        setSharedCalendars([]);
        setIsLoading(false);
        return;
      }

      setSharedCalendars(
        (data ?? []).map((row) => ({
          ownerId: row.owner_id,
          role: isShareRole(row.role) ? row.role : "viewer",
          label: row.label?.trim() || defaultSharedLabel(row.owner_id),
        }))
      );
      setIsLoading(false);
    };

    fetchShared();
  }, [authUserId]);

  const calendars = useMemo<CalendarListItem[]>(() => {
    if (!authUserId) return [];
    return [
      { ownerId: authUserId, role: "owner", label: "My calendar" },
      ...sharedCalendars,
    ];
  }, [authUserId, sharedCalendars]);

  const updateCalendarLabel = async (ownerId: string, label: string) => {
    if (!authUserId) return { error: new Error("Not authenticated") };
    return supabase
      .from("calendar_members")
      .update({ label })
      .eq("owner_id", ownerId)
      .eq("member_id", authUserId);
  };

  return { calendars, isLoading, updateCalendarLabel };
}

