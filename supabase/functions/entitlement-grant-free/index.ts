import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { json } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return json(200, {});
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) return json(500, { error: "Supabase env missing" });

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const service = createClient(supabaseUrl, supabaseServiceKey);

    const { data: userResult, error: userError } = await supabase.auth.getUser();
    const userId = userResult?.user?.id ?? null;
    if (userError || !userId) return json(401, { error: "Not authenticated" });

    const now = new Date().toISOString();
    const { error: upsertError } = await service
      .from("user_entitlements")
      .upsert(
        {
          user_id: userId,
          paid_lifetime: true,
          paypal_order_id: null,
          paypal_capture_id: null,
          amount_cents: 0,
          currency: "USD",
          purchased_at: now,
        },
        { onConflict: "user_id" },
      );

    if (upsertError) return json(500, { error: "Failed to persist entitlement" });

    return json(200, { ok: true });
  } catch (err) {
    console.error(err);
    const message = (err as { message?: unknown } | null | undefined)?.message;
    return json(500, { error: typeof message === "string" ? message : "Unknown error" });
  }
});
