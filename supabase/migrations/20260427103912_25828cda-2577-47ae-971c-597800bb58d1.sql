-- 1. Make calendar_connections_safe view a SECURITY INVOKER view so it
-- enforces the querying user's RLS instead of the view owner's.
ALTER VIEW public.calendar_connections_safe SET (security_invoker = true);

-- 2. Lock down SECURITY DEFINER helper functions: they are only meant to
-- be called by RLS policies, triggers, or service-role code paths.
-- Revoke EXECUTE from anon and authenticated so they cannot be invoked
-- directly through PostgREST.
REVOKE EXECUTE ON FUNCTION public.is_household_member(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_household_role(uuid, uuid, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_email_approved(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generate_invite_code() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_invite_code() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;