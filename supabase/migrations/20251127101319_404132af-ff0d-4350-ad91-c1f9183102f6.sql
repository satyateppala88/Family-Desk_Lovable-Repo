-- Create access_requests table for waitlist
CREATE TABLE public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT
);

-- Enable RLS on access_requests
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can submit access request (anonymous users)
CREATE POLICY "Anyone can submit access request"
ON public.access_requests
FOR INSERT
TO anon
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
);

-- Policy: Users can view their own request by email
CREATE POLICY "Users can view their own request"
ON public.access_requests
FOR SELECT
USING (
  email = current_setting('request.jwt.claims', true)::json->>'email'
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Create function to check if email is approved
CREATE OR REPLACE FUNCTION public.is_email_approved(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.access_requests
    WHERE email = user_email AND status = 'approved'
  )
$$;

-- Add trigger to update updated_at
CREATE TRIGGER update_access_requests_updated_at
BEFORE UPDATE ON public.access_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();