-- ==========================================================
-- VAPT FIX 1: CRITICAL - Remove privilege escalation in user_roles
-- Any authenticated user can currently assign ANY role to themselves
-- ==========================================================
DROP POLICY IF EXISTS "Users can assign roles to themselves" ON public.user_roles;

-- ==========================================================
-- VAPT FIX 2: Restrict profiles SELECT to own profile + household members
-- Currently profiles has own-profile-only SELECT which is already correct.
-- But we also need household members to see each other's display_name/avatar.
-- We'll add a second SELECT policy for household co-members.
-- ==========================================================
CREATE POLICY "Household members can view co-member profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm1
      JOIN public.household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.user_id = auth.uid() AND hm2.user_id = profiles.id
    )
  );

-- ==========================================================
-- VAPT FIX 3: Restrict phone_verification_tokens to authenticated only
-- Currently uses 'public' role which includes anon
-- ==========================================================
DROP POLICY IF EXISTS "Users can view their own phone tokens" ON public.phone_verification_tokens;
CREATE POLICY "Users can view their own phone tokens"
  ON public.phone_verification_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ==========================================================
-- VAPT FIX 4: Add RLS to calendar_connections_safe view
-- The view has no RLS; we need to ensure it's protected.
-- Since it's a SECURITY DEFINER view with security_barrier,
-- we drop and recreate it with proper RLS-like WHERE clause.
-- First check if it exists as a view and handle accordingly.
-- ==========================================================
-- The view already has a WHERE clause filtering by household membership,
-- but lacks explicit RLS. We'll ensure it's properly restricted by
-- revoking public access and granting only to authenticated.
REVOKE ALL ON public.calendar_connections_safe FROM anon;
GRANT SELECT ON public.calendar_connections_safe TO authenticated;