GRANT EXECUTE ON FUNCTION public.is_household_member(uuid, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.has_household_role(uuid, uuid, public.app_role) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_email_approved(text) TO authenticated, anon, service_role;