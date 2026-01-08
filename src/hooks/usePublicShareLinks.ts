import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CalendarMemberRole } from "@/hooks/useCalendars";

// Helper to call RPC functions that aren't in the generated types yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc.bind(supabase) as (
  name: string,
  params?: Record<string, unknown>
) => Promise<{ data: any; error: any }>;

export type ShareLinkPermission = "viewer" | "editor";

export interface SharedCalendar {
  id: string;
  name: string;
}

export interface PublicShareLink {
  id: string;
  slug: string;
  permission: ShareLinkPermission;
  hasPassword: boolean;
  createdAt: string;
  revokedAt: string | null;
  calendars: SharedCalendar[];
}

export interface CreatePublicShareLinkParams {
  slug: string;
  permission: ShareLinkPermission;
  calendarIds: string[];
  password?: string | null;
}

export interface UpdatePublicShareLinkParams {
  shareLinkId: string;
  slug?: string;
  permission?: ShareLinkPermission;
  calendarIds?: string[];
  password?: string | null;
  removePassword?: boolean;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export function usePublicShareLinks() {
  const [links, setLinks] = useState<PublicShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(
    async (includeRevoked = false): Promise<Result<PublicShareLink[]>> => {
      setIsLoading(true);
      const { data, error } = await rpc("list_public_share_links", {
        p_include_revoked: includeRevoked,
      });
      setIsLoading(false);

      if (error) {
        console.error("Error fetching public share links:", error);
        return { ok: false, error: error.message ?? "Failed to fetch links" };
      }

      const rows = (data ?? []) as Array<{
        id: string;
        slug: string;
        permission: CalendarMemberRole;
        has_password: boolean;
        created_at: string;
        revoked_at: string | null;
        calendars: Array<{ id: string; name: string }> | null;
      }>;

      const mapped: PublicShareLink[] = rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        permission: row.permission as ShareLinkPermission,
        hasPassword: row.has_password,
        createdAt: row.created_at,
        revokedAt: row.revoked_at,
        calendars: (row.calendars ?? []).map((c) => ({
          id: c.id,
          name: c.name,
        })),
      }));

      setLinks(mapped);
      return { ok: true, data: mapped };
    },
    []
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createLink = useCallback(
    async (
      params: CreatePublicShareLinkParams
    ): Promise<Result<PublicShareLink>> => {
      const { data, error } = await rpc("create_public_share_link", {
        p_slug: params.slug,
        p_permission: params.permission,
        p_calendar_ids: params.calendarIds,
        p_password: params.password ?? null,
      });

      if (error) {
        console.error("Error creating public share link:", error);
        const msg = error.message?.toLowerCase?.() ?? "";
        if (msg.includes("slug already in use")) {
          return { ok: false, error: "This link name is already taken" };
        }
        if (msg.includes("invalid slug")) {
          return { ok: false, error: "Invalid link name format" };
        }
        if (msg.includes("no calendars selected")) {
          return { ok: false, error: "Please select at least one calendar" };
        }
        if (msg.includes("not allowed")) {
          return {
            ok: false,
            error:
              "You don't have permission to share one or more selected calendars",
          };
        }
        return { ok: false, error: error.message ?? "Failed to create link" };
      }

      const row = data as {
        id: string;
        slug: string;
        permission: CalendarMemberRole;
        has_password: boolean;
      } | null;

      if (!row) {
        return { ok: false, error: "No data returned" };
      }

      // Refresh to get full data including calendars
      await refresh();

      const newLink: PublicShareLink = {
        id: row.id,
        slug: row.slug,
        permission: row.permission as ShareLinkPermission,
        hasPassword: row.has_password,
        createdAt: new Date().toISOString(),
        revokedAt: null,
        calendars: params.calendarIds.map((id) => ({ id, name: "" })), // Will be filled by refresh
      };

      return { ok: true, data: newLink };
    },
    [refresh]
  );

  const updateLink = useCallback(
    async (
      params: UpdatePublicShareLinkParams
    ): Promise<Result<PublicShareLink>> => {
      const { data, error } = await rpc("update_public_share_link", {
        p_share_link_id: params.shareLinkId,
        p_slug: params.slug ?? null,
        p_permission: params.permission ?? null,
        p_calendar_ids: params.calendarIds ?? null,
        p_password: params.password ?? null,
        p_remove_password: params.removePassword ?? false,
      });

      if (error) {
        console.error("Error updating public share link:", error);
        const msg = error.message?.toLowerCase?.() ?? "";
        if (msg.includes("slug already in use")) {
          return { ok: false, error: "This link name is already taken" };
        }
        if (msg.includes("invalid slug")) {
          return { ok: false, error: "Invalid link name format" };
        }
        if (msg.includes("no calendars selected")) {
          return { ok: false, error: "Please select at least one calendar" };
        }
        if (msg.includes("not found")) {
          return { ok: false, error: "Link not found" };
        }
        return { ok: false, error: error.message ?? "Failed to update link" };
      }

      const row = data as {
        id: string;
        slug: string;
        permission: CalendarMemberRole;
        has_password: boolean;
        revoked_at: string | null;
      } | null;

      if (!row) {
        return { ok: false, error: "No data returned" };
      }

      await refresh();

      const updatedLink: PublicShareLink = {
        id: row.id,
        slug: row.slug,
        permission: row.permission as ShareLinkPermission,
        hasPassword: row.has_password,
        createdAt: "", // Will be filled by refresh
        revokedAt: row.revoked_at,
        calendars: [],
      };

      return { ok: true, data: updatedLink };
    },
    [refresh]
  );

  const revokeLink = useCallback(
    async (shareLinkId: string): Promise<Result<boolean>> => {
      const { data, error } = await rpc("revoke_public_share_link", {
        p_share_link_id: shareLinkId,
      });

      if (error) {
        console.error("Error revoking public share link:", error);
        return { ok: false, error: error.message ?? "Failed to revoke link" };
      }

      if (data) {
        await refresh();
      }

      return { ok: true, data: Boolean(data) };
    },
    [refresh]
  );

  const activeLinks = links.filter((l) => !l.revokedAt);
  const revokedLinks = links.filter((l) => l.revokedAt);

  return {
    links,
    activeLinks,
    revokedLinks,
    isLoading,
    refresh,
    createLink,
    updateLink,
    revokeLink,
  };
}
