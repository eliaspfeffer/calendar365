import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { json } from "../_shared/cors.ts";

function getClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return null;
}

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashIp(ip: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return json(200, {});
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) return json(500, { error: "Supabase env missing" });

    const salt = Deno.env.get("VISITOR_HASH_SALT") ?? "visitor-hash-default-salt";
    const ip = getClientIp(req);
    if (!ip) return json(200, { uniqueVisitors: null, liveVisitors: null });

    const ipHash = await hashIp(ip, salt);
    const service = createClient(supabaseUrl, supabaseServiceKey);

    // Persist unique visitors.
    const { error: uniqueInsertError } = await service.from("visitor_ips").insert({ ip_hash: ipHash });
    if (uniqueInsertError && uniqueInsertError.code !== "23505") {
      return json(500, { error: "Failed to record visitor" });
    }

    // Track "live" users by last_seen. Prune old entries opportunistically.
    const now = new Date();
    const liveWindowMs = 90_000;
    const pruneAfterMs = 10 * 60_000;
    const windowStart = new Date(now.getTime() - liveWindowMs).toISOString();
    const pruneBefore = new Date(now.getTime() - pruneAfterMs).toISOString();

    const { error: upsertError } = await service
      .from("live_visitors")
      .upsert({ ip_hash: ipHash, last_seen: now.toISOString() }, { onConflict: "ip_hash" });
    if (upsertError) return json(500, { error: "Failed to update live visitor" });

    await service.from("live_visitors").delete().lt("last_seen", pruneBefore);

    const { count: uniqueVisitors, error: uniqueCountError } = await service
      .from("visitor_ips")
      .select("ip_hash", { count: "exact", head: true });
    if (uniqueCountError) return json(500, { error: "Failed to count visitors" });

    const { count: liveVisitors, error: liveCountError } = await service
      .from("live_visitors")
      .select("ip_hash", { count: "exact", head: true })
      .gte("last_seen", windowStart);
    if (liveCountError) return json(500, { error: "Failed to count live visitors" });

    return json(200, { uniqueVisitors: uniqueVisitors ?? 0, liveVisitors: liveVisitors ?? 0 });
  } catch (err) {
    console.error(err);
    const message = (err as { message?: unknown } | null | undefined)?.message;
    return json(500, { error: typeof message === "string" ? message : "Unknown error" });
  }
});

