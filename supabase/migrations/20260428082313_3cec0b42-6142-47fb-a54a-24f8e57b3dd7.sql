-- 1. Dedupe household_members (keep the earliest joined row per (household_id, user_id))
DELETE FROM public.household_members a
USING public.household_members b
WHERE a.household_id = b.household_id
  AND a.user_id = b.user_id
  AND (a.joined_at > b.joined_at
       OR (a.joined_at = b.joined_at AND a.ctid > b.ctid));

-- 2. Prevent a user from being added to the same household twice
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'household_members_household_user_unique'
      AND conrelid = 'public.household_members'::regclass
  ) THEN
    ALTER TABLE public.household_members
      ADD CONSTRAINT household_members_household_user_unique
      UNIQUE (household_id, user_id);
  END IF;
END $$;

-- 3. Clean up the orphaned pending invitation
DELETE FROM public.household_invitations
WHERE id = '39a71d12-42a9-42b5-8b78-77a93d3fe368'
  AND status = 'pending';

-- 4. Update the invitee-email RLS policy to use case-insensitive, trim-safe matching
DROP POLICY IF EXISTS "Authenticated users can view invitations matching their email"
  ON public.household_invitations;

CREATE POLICY "Authenticated users can view invitations matching their email"
  ON public.household_invitations
  FOR SELECT
  TO authenticated
  USING (
    lower(trim(invitee_email)) = lower(trim(auth.jwt() ->> 'email'))
    AND (auth.jwt() ->> 'email') IS NOT NULL
  );