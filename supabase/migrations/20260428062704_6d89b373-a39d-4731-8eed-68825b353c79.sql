
-- =========================================================
-- 1. Calendar connections: remove direct client access
-- =========================================================
DROP POLICY IF EXISTS "Users can manage own calendar connections" ON public.calendar_connections;
DROP POLICY IF EXISTS "Users can view own calendar connections" ON public.calendar_connections;

-- Service role bypasses RLS, so no policy needed for it.
-- Leave RLS enabled with no policies => no client (anon/authenticated) access.

-- =========================================================
-- 2. Email & phone verification tokens: server-only reads
-- =========================================================
DROP POLICY IF EXISTS "Users can view their own tokens" ON public.email_verification_tokens;
DROP POLICY IF EXISTS "Users can view their own phone tokens" ON public.phone_verification_tokens;

-- =========================================================
-- 3. user_roles: restrict role values household admins can assign
-- =========================================================
DROP POLICY IF EXISTS "Admins can assign roles to others" ON public.user_roles;

CREATE POLICY "Admins can assign non-platform roles to others"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() <> user_id
  AND role IN ('member'::app_role, 'household_admin'::app_role)
  AND household_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = user_roles.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
  )
);

-- =========================================================
-- 4. access_requests: stop anon enumeration via email param
-- =========================================================
DROP POLICY IF EXISTS "Users can view their own request" ON public.access_requests;

CREATE POLICY "Authenticated users can view their own request"
ON public.access_requests
FOR SELECT
TO authenticated
USING (
  email = (auth.jwt() ->> 'email')
  AND (auth.jwt() ->> 'email') IS NOT NULL
);

-- =========================================================
-- 5. household_invitations: hide invitee details from non-admins
-- =========================================================
DROP POLICY IF EXISTS "Members can view household invitations" ON public.household_invitations;

CREATE POLICY "Admins can view household invitations"
ON public.household_invitations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = household_invitations.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
  )
);
-- The existing policies "Users can view invitations by email" and
-- "Users can view their own invitation requests" still let the actual
-- invitee see their own row.

-- =========================================================
-- 6. SECURITY DEFINER functions: revoke client EXECUTE
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.dispatch_push(uuid[], text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_invite_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_household_role(uuid, uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_email_approved(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_household_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_ai_suggestion_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_invitation_accepted() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_savings_goal_milestone() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_task_completed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_invite_code() FROM PUBLIC, anon, authenticated;
-- update_completed_tour is intentionally callable by authenticated users.

-- =========================================================
-- 7. Avatars storage: prevent listing all files
-- =========================================================
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- Public reads of individual avatar objects still work via the bucket's
-- public URL endpoint; this only blocks `list` calls on the bucket.
CREATE POLICY "Avatar images readable by anyone via direct path"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'avatars'
  AND (
    -- own avatars
    (storage.foldername(name))[1] = COALESCE((auth.uid())::text, '')
    -- household/family avatars: any household member
    OR (
      (storage.foldername(name))[1] = ANY (ARRAY['household'::text, 'family'::text])
      AND auth.uid() IS NOT NULL
      AND public.is_household_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
    )
  )
);
