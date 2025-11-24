-- Add UPDATE policy for household_enabled_products
CREATE POLICY "Admins can update products"
ON public.household_enabled_products
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_members.household_id = household_enabled_products.household_id
    AND household_members.user_id = auth.uid()
    AND household_members.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_members.household_id = household_enabled_products.household_id
    AND household_members.user_id = auth.uid()
    AND household_members.role = 'admin'
  )
);