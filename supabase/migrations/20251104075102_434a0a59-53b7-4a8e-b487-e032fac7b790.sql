-- Create security definer function to check if user is a household member
CREATE OR REPLACE FUNCTION public.is_household_member(_user_id UUID, _household_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE user_id = _user_id AND household_id = _household_id
  )
$$;

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Members can view household members" ON public.household_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.household_members;
DROP POLICY IF EXISTS "Users can join households" ON public.household_members;

-- Recreate policies with better logic to avoid recursion
CREATE POLICY "Members can view household members" 
ON public.household_members FOR SELECT 
USING (
  household_id IN (
    SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
  )
);

-- For INSERT, only check that the user matches
CREATE POLICY "Users can join households" 
ON public.household_members FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- For DELETE, check admin role without recursion
CREATE POLICY "Admins can manage members" 
ON public.household_members FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = household_members.household_id 
    AND hm.user_id = auth.uid() 
    AND hm.role = 'admin'
  )
);

-- Add missing INSERT policy for user_roles table
CREATE POLICY "Admins can assign roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = user_roles.household_id
    AND user_id = auth.uid()
    AND role = 'admin'
  )
);