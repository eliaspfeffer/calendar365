import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { paypalFetch } from "../_shared/paypal.ts";

type CreateOrderResponse = { id: string };

const PRICE = { currency: "USD", value: "4.00" } as const;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !supabaseAnonKey) return json(500, { error: "Supabase env missing" });

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  const userId = userResult?.user?.id ?? null;
  if (userError || !userId) return json(401, { error: "Not authenticated" });

  const order = await paypalFetch<CreateOrderResponse>("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: PRICE,
          custom_id: userId,
          description: "Calendar365 lifetime access",
        },
      ],
    }),
  });

  return json(200, { orderId: order.id });
});

