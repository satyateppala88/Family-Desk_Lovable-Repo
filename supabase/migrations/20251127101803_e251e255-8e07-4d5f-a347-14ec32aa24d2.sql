-- Drop existing policies to recreate them correctly
DROP POLICY IF EXISTS "Anyone can submit access request" ON public.access_requests;
DROP POLICY IF EXISTS "Platform admins can view all requests" ON public.access_requests;
DROP POLICY IF EXISTS "Platform admins can update requests" ON public.access_requests;
DROP POLICY IF EXISTS "Users can view their own request" ON public.access_requests;

-- Recreate the INSERT policy for anonymous users with proper configuration
CREATE POLICY "Allow anonymous to submit access request"
ON public.access_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy: Platform admins can view all requests
CREATE POLICY "Platform admins can view all requests"
ON public.access_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'platform_admin'
  )
);

-- Policy: Platform admins can update requests
CREATE POLICY "Platform admins can update requests"
ON public.access_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'platform_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'platform_admin'
  )
);

-- Policy: Users can view their own request by email
CREATE POLICY "Users can view their own request"
ON public.access_requests
FOR SELECT
TO anon, authenticated
USING (
  email = current_setting('request.jwt.claims', true)::json->>'email'
  OR (auth.uid() IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);