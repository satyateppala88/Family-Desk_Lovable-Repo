-- Fix households RLS policy for robustness
DROP POLICY IF EXISTS "Users can create households" ON public.households;

CREATE POLICY "Users can create households" 
ON public.households 
FOR INSERT 
TO authenticated
WITH CHECK (
  created_by IS NOT NULL 
  AND auth.uid() = created_by
);

-- Fix user_roles RLS policies to allow bootstrap (CRITICAL FIX)
DROP POLICY IF EXISTS "Admins can assign roles" ON public.user_roles;

-- Allow users to assign roles to themselves (fixes bootstrap problem)
CREATE POLICY "Users can assign roles to themselves"
ON public.user_roles 
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- Allow existing admins to assign roles to others
CREATE POLICY "Admins can assign roles to others"
ON public.user_roles 
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() != user_id
  AND EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = user_roles.household_id
    AND hm.user_id = auth.uid()
    AND hm.role = 'admin'
  )
);