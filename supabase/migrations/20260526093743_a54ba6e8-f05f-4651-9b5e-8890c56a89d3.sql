REVOKE EXECUTE ON FUNCTION public.is_email_approved(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_household_role(uuid,uuid,app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_household_member(uuid,uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_household_habit(uuid,boolean,numeric) FROM anon;