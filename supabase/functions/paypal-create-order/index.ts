import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { paypalFetch } from "../_shared/paypal.ts";
import { json } from "../_shared/cors.ts";

type CreateOrderResponse = { id: string };

function parseAmountCents(input: unknown) {
  const n = typeof input === "number" ? input : Number.NaN;
  if (!Number.isFinite(n)) return null;
  const cents = Math.trunc(n);
  if (cents < 1) return null; // PayPal checkout must be > $0.00; $0 is handled separately in-app.
  if (cents > 100_000) return null; // $1000 cap to prevent abuse.
  return cents;
}

function toUsdValue(cents: number) {
  return (cents / 100).toFixed(2);
}

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

    let payload: { amountCents?: number } | null = null;
    try {
      payload = (await req.json()) as { amountCents?: number };
    } catch {
      payload = null;
    }

    const amountCents = parseAmountCents(payload?.amountCents);
    if (!amountCents) return json(400, { error: "Invalid amount" });

    const order = await paypalFetch<CreateOrderResponse>("/v2/checkout/orders", {
      method: "POST",
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: "USD", value: toUsdValue(amountCents) },
            custom_id: userId,
            description: "Calendar365 lifetime access",
          },
        ],
      }),
    });

    const { error: insertError } = await service.from("paypal_orders").insert({
      order_id: order.id,
      user_id: userId,
      amount_cents: amountCents,
      currency: "USD",
    });
    if (insertError) return json(500, { error: "Failed to persist order" });

    return json(200, { orderId: order.id });
  } catch (err) {
    console.error(err);
    const message = (err as { message?: unknown } | null | undefined)?.message;
    return json(500, { error: typeof message === "string" ? message : "Unknown error" });
  }
});
