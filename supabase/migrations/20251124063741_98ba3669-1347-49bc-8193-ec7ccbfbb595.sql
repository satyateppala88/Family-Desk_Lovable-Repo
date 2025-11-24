-- Add DELETE policy for households table to allow admins to delete their household
CREATE POLICY "Admins can delete households"
ON public.households
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_members.household_id = households.id
    AND household_members.user_id = auth.uid()
    AND household_members.role = 'admin'
  )
);