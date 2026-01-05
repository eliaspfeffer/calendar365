-- Paywall: free up to 25 notes, then require lifetime purchase.
-- Payments: PayPal capture via Supabase Edge Functions (service_role writes entitlement).

-- Track who has lifetime access. Not user-writable.
CREATE TABLE IF NOT EXISTS public.user_entitlements (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  paid_lifetime BOOLEAN NOT NULL DEFAULT false,
  paypal_order_id TEXT NULL,
  paypal_capture_id TEXT NULL,
  amount_cents INTEGER NULL,
  currency TEXT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_entitlements_paypal_order_id_unique
ON public.user_entitlements(paypal_order_id)
WHERE paypal_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_entitlements_paypal_capture_id_unique
ON public.user_entitlements(paypal_capture_id)
WHERE paypal_capture_id IS NOT NULL;

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_user_entitlements_updated_at'
  ) THEN
    CREATE TRIGGER update_user_entitlements_updated_at
    BEFORE UPDATE ON public.user_entitlements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own entitlements" ON public.user_entitlements;
CREATE POLICY "Users can view their own entitlements"
ON public.user_entitlements
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage entitlements" ON public.user_entitlements;
CREATE POLICY "Service role can manage entitlements"
ON public.user_entitlements
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Helpers used by the client and by RLS policies.
CREATE OR REPLACE FUNCTION public.current_user_has_lifetime_access()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (
      SELECT ue.paid_lifetime
      FROM public.user_entitlements ue
      WHERE ue.user_id = auth.uid()
      LIMIT 1
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_has_lifetime_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_has_lifetime_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.current_user_note_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COUNT(*)::int
  FROM public.sticky_notes sn
  WHERE sn.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_note_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_note_count() TO authenticated;

-- Enforce the free limit at the DB level (prevents bypassing the UI).
DROP POLICY IF EXISTS "Editors can create notes" ON public.sticky_notes;
CREATE POLICY "Editors can create notes"
ON public.sticky_notes
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.current_user_has_lifetime_access()
    OR public.current_user_note_count() < 25
  )
  AND EXISTS (
    SELECT 1
    FROM public.calendar_members m
    WHERE m.calendar_id = sticky_notes.calendar_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'editor')
  )
);

