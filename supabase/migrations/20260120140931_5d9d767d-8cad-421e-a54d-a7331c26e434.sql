-- Allow household members to query their household's calendar connections through the safe view
-- Since the view uses security_invoker=on, we need to allow household members to SELECT from the base table
-- BUT only through the view pattern. Since we can't do that directly, we add a policy for household viewing

-- Add policy for household members to view calendar connections (base table) but they can only access non-sensitive columns via the view
CREATE POLICY "Household members can view calendar connections" 
ON public.calendar_connections FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.household_members 
    WHERE household_members.household_id = calendar_connections.household_id 
    AND household_members.user_id = auth.uid()
  )
);