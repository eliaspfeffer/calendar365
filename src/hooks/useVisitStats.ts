import { useCallback, useEffect, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

type VisitStats = {
  uniqueVisitors: number | null;
  liveVisitors: number | null;
};

export function useVisitStats(options?: { intervalMs?: number }) {
  const intervalMs = options?.intervalMs ?? 30_000;
  const [stats, setStats] = useState<VisitStats>({ uniqueVisitors: null, liveVisitors: null });
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const { data } = await supabase.functions.invoke("visit-stats", { body: {} });
      const next = data as Partial<VisitStats> | null | undefined;
      setStats({
        uniqueVisitors: typeof next?.uniqueVisitors === "number" ? next.uniqueVisitors : null,
        liveVisitors: typeof next?.liveVisitors === "number" ? next.liveVisitors : null,
      });
    } catch (err) {
      console.warn("visit-stats failed", err);
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refresh();
    }, intervalMs);

    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intervalMs, refresh]);

  return { stats, refresh, isConfigured: isSupabaseConfigured };
}

