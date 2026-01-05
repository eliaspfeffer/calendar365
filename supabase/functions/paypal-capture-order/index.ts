import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { paypalFetch } from "../_shared/paypal.ts";
import { json } from "../_shared/cors.ts";

type CaptureResponse = {
  status?: string;
  id?: string;
  purchase_units?: Array<{
    custom_id?: string;
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: { currency_code?: string; value?: string };
      }>;
    };
  }>;
};

function parseAmountCents(value: string | undefined, currency: string | undefined) {
  if (currency !== "USD") return null;
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  // PayPal values are 2 decimals; round defensively.
  return Math.round(parsed * 100);
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

    let payload: { orderId?: string } | null = null;
    try {
      payload = (await req.json()) as { orderId?: string };
    } catch {
      payload = null;
    }

    const orderId = payload?.orderId?.trim();
    if (!orderId) return json(400, { error: "Missing orderId" });

    const pending = await service.from("paypal_orders").select("*").eq("order_id", orderId).maybeSingle();
    if (pending.error) return json(500, { error: "Failed to load order" });
    if (!pending.data) return json(404, { error: "Unknown order" });
    if (pending.data.user_id !== userId) return json(403, { error: "Order does not belong to this user" });

    const capture = await paypalFetch<CaptureResponse>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    const captureStatus = capture.status ?? "";
    const unit = capture.purchase_units?.[0];
    const captureItem = unit?.payments?.captures?.[0] ?? null;
    const captureId = captureItem?.id ?? null;

    if (captureStatus !== "COMPLETED") return json(400, { error: "Payment not completed" });
    if (!captureItem || captureItem.status !== "COMPLETED") return json(400, { error: "Capture not completed" });
    const amountCents = parseAmountCents(captureItem.amount?.value, captureItem.amount?.currency_code);
    if (amountCents === null) return json(400, { error: "Invalid amount/currency" });
    if (pending.data.currency !== "USD") return json(400, { error: "Unsupported currency" });
    if (amountCents !== pending.data.amount_cents) return json(400, { error: "Amount mismatch" });

    const now = new Date().toISOString();
    const { error: upsertError } = await service
      .from("user_entitlements")
      .upsert(
        {
          user_id: userId,
          paid_lifetime: true,
          paypal_order_id: orderId,
          paypal_capture_id: captureId,
          amount_cents: amountCents,
          currency: "USD",
          purchased_at: now,
        },
        { onConflict: "user_id" },
      );

    if (upsertError) return json(500, { error: "Failed to persist entitlement" });

    await service.from("paypal_orders").delete().eq("order_id", orderId);

    return json(200, { ok: true });
  } catch (err) {
    console.error(err);
    const message = (err as { message?: unknown } | null | undefined)?.message;
    return json(500, { error: typeof message === "string" ? message : "Unknown error" });
  }
});
