-- Permission analytics table
CREATE TABLE public.permission_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  capability TEXT NOT NULL CHECK (capability IN ('microphone','camera','photos','notifications')),
  outcome TEXT NOT NULL CHECK (outcome IN ('granted','denied','dismissed','blocked','prompted')),
  surface TEXT NOT NULL DEFAULT 'unknown',
  platform TEXT NOT NULL DEFAULT 'web' CHECK (platform IN ('web','native','unknown')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_permission_events_user ON public.permission_events(user_id, created_at DESC);
CREATE INDEX idx_permission_events_cap_outcome ON public.permission_events(capability, outcome, created_at DESC);
CREATE INDEX idx_permission_events_created ON public.permission_events(created_at DESC);

ALTER TABLE public.permission_events ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can log their own events
CREATE POLICY "Users can log their own permission events"
ON public.permission_events
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can read their own events
CREATE POLICY "Users can view their own permission events"
ON public.permission_events
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Platform admins can read all events
CREATE POLICY "Platform admins can view all permission events"
ON public.permission_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'platform_admin'::app_role
  )
);

-- No UPDATE / DELETE policies on purpose — events are immutable.

-- Daily rollup view, restricted to platform admins via SECURITY INVOKER + RLS on base table
CREATE OR REPLACE VIEW public.permission_events_daily
WITH (security_invoker = true)
AS
SELECT
  date_trunc('day', created_at)::date AS day,
  capability,
  outcome,
  surface,
  platform,
  count(*)::bigint AS event_count,
  count(DISTINCT user_id)::bigint AS unique_users
FROM public.permission_events
GROUP BY 1, 2, 3, 4, 5;

COMMENT ON TABLE public.permission_events IS 'Immutable analytics log of permission prompt outcomes. Read access for self + platform admins.';
COMMENT ON VIEW public.permission_events_daily IS 'Daily aggregate of permission events for admin analytics. Inherits RLS from base table.';