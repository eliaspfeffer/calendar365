import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { paypalFetch } from "../_shared/paypal.ts";

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

const EXPECTED = { currency: "USD", value: "4.00", cents: 400 } as const;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isExpectedAmount(value: string | undefined, currency: string | undefined) {
  return currency === EXPECTED.currency && value === EXPECTED.value;
}

serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

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

  const capture = await paypalFetch<CaptureResponse>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  const captureStatus = capture.status ?? "";
  const unit = capture.purchase_units?.[0];
  const customId = unit?.custom_id ?? "";
  const captureItem = unit?.payments?.captures?.[0] ?? null;
  const captureId = captureItem?.id ?? null;

  if (!customId || customId !== userId) return json(403, { error: "Order does not belong to this user" });
  if (captureStatus !== "COMPLETED") return json(400, { error: "Payment not completed" });
  if (!captureItem || captureItem.status !== "COMPLETED") return json(400, { error: "Capture not completed" });
  if (!isExpectedAmount(captureItem.amount?.value, captureItem.amount?.currency_code)) {
    return json(400, { error: "Incorrect amount" });
  }

  const now = new Date().toISOString();
  const { error: upsertError } = await service
    .from("user_entitlements")
    .upsert(
      {
        user_id: userId,
        paid_lifetime: true,
        paypal_order_id: orderId,
        paypal_capture_id: captureId,
        amount_cents: EXPECTED.cents,
        currency: EXPECTED.currency,
        purchased_at: now,
      },
      { onConflict: "user_id" },
    );

  if (upsertError) return json(500, { error: "Failed to persist entitlement" });

  return json(200, { ok: true });
});

