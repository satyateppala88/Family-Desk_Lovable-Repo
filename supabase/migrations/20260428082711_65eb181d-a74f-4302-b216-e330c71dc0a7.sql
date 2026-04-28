-- =====================================================================
-- 1. Add deny-all-but-service-role policies to internal tables that have
--    RLS enabled but no policies.
-- =====================================================================

-- calendar_connections holds OAuth tokens; only the service role (used by
-- edge functions) should be able to read/write directly. Members read via
-- the public.calendar_connections_safe view.
DROP POLICY IF EXISTS "Service role can manage calendar connections"
  ON public.calendar_connections;
CREATE POLICY "Service role can manage calendar connections"
  ON public.calendar_connections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- push_dispatch_config is a single-row config table read only by the
-- dispatch_push() SECURITY DEFINER function. Lock it to service role.
DROP POLICY IF EXISTS "Service role can manage push dispatch config"
  ON public.push_dispatch_config;
CREATE POLICY "Service role can manage push dispatch config"
  ON public.push_dispatch_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================================
-- 2. Tighten the anonymous access-request insert policy so the row being
--    inserted must at least carry an email (prevents empty/garbage rows).
-- =====================================================================
DROP POLICY IF EXISTS "Allow anonymous to submit access request"
  ON public.access_requests;
CREATE POLICY "Allow anonymous to submit access request"
  ON public.access_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(trim(email)) > 0
    AND status = 'pending'
  );

-- =====================================================================
-- 3. Revoke EXECUTE on internal SECURITY DEFINER functions from anon and
--    authenticated. These are only invoked by triggers, edge functions,
--    or RLS evaluation under the postgres role.
-- =====================================================================

-- Trigger / notification helpers (no client should call these)
REVOKE EXECUTE ON FUNCTION public.dispatch_push(uuid[], text, text, text, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_invite_code()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_invite_code()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_ai_suggestion_created()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_invitation_accepted()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_savings_goal_milestone()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_task_completed()
  FROM PUBLIC, anon, authenticated;

-- Approval check is only consulted server-side / from edge functions
REVOKE EXECUTE ON FUNCTION public.is_email_approved(text)
  FROM PUBLIC, anon, authenticated;

-- Updated-at helpers are called only by triggers
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_household_preferences_updated_at()
  FROM PUBLIC, anon, authenticated;

-- =====================================================================
-- 4. RLS helpers MUST stay callable by signed-in users because PostgreSQL
--    evaluates RLS USING/WITH CHECK clauses under the calling role. Make
--    sure they're granted only to authenticated (not anon).
-- =====================================================================
REVOKE EXECUTE ON FUNCTION public.is_household_member(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_household_member(uuid, uuid)
  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_household_role(uuid, uuid, public.app_role)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_household_role(uuid, uuid, public.app_role)
  TO authenticated;

-- update_completed_tour is invoked from the client (RPC) by signed-in users
REVOKE EXECUTE ON FUNCTION public.update_completed_tour(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_completed_tour(text)
  TO authenticated;