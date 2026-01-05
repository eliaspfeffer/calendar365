-- PayPal: persist (order_id -> user_id) so capture can verify ownership even when PayPal omits custom_id.

CREATE TABLE IF NOT EXISTS public.paypal_orders (
  order_id TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS paypal_orders_user_id_idx ON public.paypal_orders(user_id);

ALTER TABLE public.paypal_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own PayPal orders" ON public.paypal_orders;
CREATE POLICY "Users can create their own PayPal orders"
ON public.paypal_orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own PayPal orders" ON public.paypal_orders;
CREATE POLICY "Users can view their own PayPal orders"
ON public.paypal_orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage PayPal orders" ON public.paypal_orders;
CREATE POLICY "Service role can manage PayPal orders"
ON public.paypal_orders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

