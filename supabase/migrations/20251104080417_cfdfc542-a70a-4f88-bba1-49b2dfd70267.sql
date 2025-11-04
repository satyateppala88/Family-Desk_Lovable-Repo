-- Drop all existing policies on household_members to start fresh
DROP POLICY IF EXISTS "Members can view household members" ON public.household_members;
DROP POLICY IF EXISTS "Users can join households" ON public.household_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.household_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.household_members;

-- Phase 1: Simple policy for viewing own membership (prevents recursion during bootstrap)
CREATE POLICY "Users can view their own membership"
ON public.household_members FOR SELECT
USING (user_id = auth.uid());

-- Phase 2: Policy for viewing all household members using security definer function
CREATE POLICY "Members can view household members"
ON public.household_members FOR SELECT
USING (public.is_household_member(auth.uid(), household_id));

-- INSERT policy: Users can join households
CREATE POLICY "Users can join households"
ON public.household_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE policy: Only admins can update member roles
CREATE POLICY "Admins can update member roles"
ON public.household_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = household_members.household_id
    AND hm.user_id = auth.uid()
    AND hm.role = 'admin'
  )
);

-- DELETE policy: Only admins can remove members
CREATE POLICY "Admins can remove members"
ON public.household_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = household_members.household_id
    AND hm.user_id = auth.uid()
    AND hm.role = 'admin'
  )
);