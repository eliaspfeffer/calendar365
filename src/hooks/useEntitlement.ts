import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

type EntitlementState = {
  isLoading: boolean;
  hasLifetimeAccess: boolean;
  noteCount: number | null;
};

export function useEntitlement(userId: string | null) {
  const [state, setState] = useState<EntitlementState>({
    isLoading: false,
    hasLifetimeAccess: false,
    noteCount: null,
  });

  const refresh = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setState({ isLoading: false, hasLifetimeAccess: false, noteCount: null });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    const [access, count] = await Promise.all([
      supabase.rpc("current_user_has_lifetime_access"),
      supabase.rpc("current_user_note_count"),
    ]);

    const hasLifetimeAccess = Boolean(access.data) && !access.error;
    const noteCount = !count.error && typeof count.data === "number" ? count.data : null;

    setState({ isLoading: false, hasLifetimeAccess, noteCount });
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const bumpNoteCount = useCallback((delta: number) => {
    setState((prev) => {
      if (prev.noteCount == null) return prev;
      return { ...prev, noteCount: Math.max(0, prev.noteCount + delta) };
    });
  }, []);

  return { ...state, refresh, bumpNoteCount };
}

