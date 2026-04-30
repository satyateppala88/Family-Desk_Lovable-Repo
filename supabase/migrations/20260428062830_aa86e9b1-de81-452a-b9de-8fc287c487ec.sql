
-- =========================================================
-- 1. user_roles: allow household admins to revoke non-platform roles
-- =========================================================
CREATE POLICY "Admins can revoke non-platform roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  role IN ('member'::app_role, 'household_admin'::app_role)
  AND household_id IS NOT NULL
  AND auth.uid() <> user_id
  AND EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = user_roles.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
  )
);

-- =========================================================
-- 2. household_invitations: lock email-match SELECT to authenticated
-- =========================================================
DROP POLICY IF EXISTS "Users can view invitations by email" ON public.household_invitations;

CREATE POLICY "Authenticated users can view invitations matching their email"
ON public.household_invitations
FOR SELECT
TO authenticated
USING (
  invitee_email = (auth.jwt() ->> 'email')
  AND (auth.jwt() ->> 'email') IS NOT NULL
);

-- Same for the other invitation request SELECT (was on public role)
DROP POLICY IF EXISTS "Users can view their own invitation requests" ON public.household_invitations;

CREATE POLICY "Authenticated users can view their own invitation requests"
ON public.household_invitations
FOR SELECT
TO authenticated
USING (invitee_user_id = auth.uid());

-- =========================================================
-- 3. finance_chat_messages: allow users to delete their own
-- =========================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='finance_chat_messages') THEN
    EXECUTE $sql$
      CREATE POLICY "Users can delete their own finance chat messages"
      ON public.finance_chat_messages
      FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.finance_chat_sessions s
          WHERE s.id = finance_chat_messages.session_id
            AND s.user_id = auth.uid()
        )
      )
    $sql$;
  END IF;
END $$;
