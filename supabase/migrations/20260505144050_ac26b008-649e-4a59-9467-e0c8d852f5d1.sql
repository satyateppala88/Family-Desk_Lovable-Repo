CREATE OR REPLACE FUNCTION public.get_household_member_emails(_household_id uuid)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hm.user_id, u.email::text
  FROM public.household_members hm
  JOIN auth.users u ON u.id = hm.user_id
  WHERE hm.household_id = _household_id
    AND public.is_household_member(auth.uid(), _household_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_household_member_emails(uuid) TO authenticated;