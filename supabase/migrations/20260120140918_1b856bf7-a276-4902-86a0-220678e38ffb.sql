-- Fix: Google OAuth Tokens Exposed to Household Members
-- Create a safe view that excludes sensitive token columns

-- Step 1: Create a view excluding access_token and refresh_token
CREATE VIEW public.calendar_connections_safe
WITH (security_invoker=on) AS
  SELECT 
    id, 
    user_id, 
    household_id, 
    google_account_email, 
    display_name, 
    color, 
    is_visible, 
    created_at, 
    updated_at,
    token_expires_at
  FROM public.calendar_connections;

-- Step 2: Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Household members can view calendars" ON public.calendar_connections;

-- Step 3: Create policy for users to SELECT only their OWN calendar connections (full access including tokens for refresh purposes)
CREATE POLICY "Users can view own calendar connections" 
ON public.calendar_connections FOR SELECT 
USING (user_id = auth.uid());

-- Step 4: Grant SELECT on the safe view so household members can see non-sensitive data
-- The view uses security_invoker, so RLS on base table applies
-- We need a policy for the view access pattern
GRANT SELECT ON public.calendar_connections_safe TO authenticated;

-- Note: The existing INSERT, UPDATE, DELETE policies remain unchanged as they already properly restrict to connection owners