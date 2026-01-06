-- Track unique visitors (by hashed IP) and "live" users (recent activity).
-- Data is only writable/readable by service_role via Edge Functions.

CREATE TABLE IF NOT EXISTS public.visitor_ips (
  ip_hash TEXT NOT NULL PRIMARY KEY,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.live_visitors (
  ip_hash TEXT NOT NULL PRIMARY KEY,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_visitors_last_seen_idx ON public.live_visitors(last_seen);

ALTER TABLE public.visitor_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_visitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage visitor_ips" ON public.visitor_ips;
CREATE POLICY "Service role can manage visitor_ips"
ON public.visitor_ips
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage live_visitors" ON public.live_visitors;
CREATE POLICY "Service role can manage live_visitors"
ON public.live_visitors
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

