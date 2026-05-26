
DO $$
DECLARE
  uids uuid[] := ARRAY['ed0972a7-b7b1-42ef-b3a0-889432e6ff27'::uuid, '013a8a7c-8bf1-4198-90bb-ffa9fbb0ad1c'::uuid];
BEGIN
  -- Delete households they created (cascades all household-scoped data)
  DELETE FROM public.households WHERE created_by = ANY(uids) OR onboarding_completed_by = ANY(uids);

  -- Null out any remaining no-action FK references
  UPDATE public.access_requests SET reviewed_by = NULL WHERE reviewed_by = ANY(uids);
  UPDATE public.household_invitations SET reviewed_by = NULL WHERE reviewed_by = ANY(uids);

  -- Delete auth users (cascades profiles, household_members, user_roles, sessions, identities, etc.)
  DELETE FROM auth.users WHERE id = ANY(uids);
END $$;
