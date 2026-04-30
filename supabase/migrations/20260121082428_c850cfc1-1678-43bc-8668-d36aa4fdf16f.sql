-- Security Fix: Remove overly permissive SELECT policy that exposes OAuth tokens to all household members
-- The base table calendar_connections contains sensitive access_token and refresh_token columns
-- Household members should use the calendar_connections_safe view (which excludes tokens) via security_invoker

-- Drop the overly permissive policy that allows all household members to see tokens
DROP POLICY IF EXISTS "Household members can view calendar connections" ON public.calendar_connections;

-- Add a new policy for household members to view ONLY via the safe view
-- Since the safe view uses security_invoker=on, we need to allow household member access
-- But we'll create a function-based policy that only works through the view

-- Actually, for household members to see other members' calendar connections (without tokens),
-- they should query the calendar_connections_safe view. The view uses security_invoker=on,
-- so it inherits the base table's RLS. We need a policy that allows household members to SELECT
-- but we need to ensure this only works for non-sensitive data.

-- The safest approach: Only allow users to SELECT their OWN connections from the base table
-- Household members get access through the safe view, which doesn't include tokens

-- Create a policy that allows household members to see non-sensitive fields
-- This requires a more complex approach - we'll use a function to check if the request
-- is coming from the safe view context. However, PostgreSQL doesn't easily support this.

-- Best solution: Restrict base table SELECT to owner only (already have "Users can view own calendar connections")
-- The view calendar_connections_safe with security_invoker=on will allow household members
-- to see non-sensitive data because the view's owner (typically postgres/supabase_admin) 
-- can access the data and the view excludes sensitive columns.

-- Wait - security_invoker=on means the view runs with the INVOKER's permissions, not the owner's.
-- This means household members can't see other members' connections through the view either.

-- For household members to see each other's calendar connections (without tokens), we need:
-- Option A: Keep a household-level SELECT policy on base table (but then tokens are exposed)
-- Option B: Create a SECURITY DEFINER function that returns safe data
-- Option C: Grant household members SELECT on base table but use column-level security (not supported well)

-- The correct approach is to add a SELECT policy that allows household members to see
-- the base table, but the application should ONLY query through the safe view.
-- To enforce this, we can create a helper RLS policy that's only effective for the view.

-- Actually, the simplest and most secure solution is:
-- 1. Keep owner-only access on the base table
-- 2. Create the view with SECURITY DEFINER (not invoker) to allow household access
-- This way, household members can see the safe view data, but not the tokens.

-- Let's recreate the view with SECURITY DEFINER
DROP VIEW IF EXISTS public.calendar_connections_safe;

CREATE VIEW public.calendar_connections_safe
WITH (security_barrier=true) AS
  SELECT 
    cc.id, 
    cc.user_id, 
    cc.household_id, 
    cc.google_account_email, 
    cc.display_name, 
    cc.color, 
    cc.is_visible, 
    cc.created_at, 
    cc.updated_at,
    cc.token_expires_at
  FROM public.calendar_connections cc
  WHERE EXISTS (
    SELECT 1 FROM public.household_members hm 
    WHERE hm.household_id = cc.household_id 
    AND hm.user_id = auth.uid()
  );

-- Grant SELECT on the safe view to authenticated users
GRANT SELECT ON public.calendar_connections_safe TO authenticated;

-- Now the view itself enforces household membership and never exposes tokens
-- The base table only allows owner access for full token data (needed for token refresh in edge functions)