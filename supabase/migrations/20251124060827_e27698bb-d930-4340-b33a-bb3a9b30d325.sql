-- Phase 2A: Create household_enabled_products table
CREATE TABLE public.household_enabled_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  product_name text NOT NULL CHECK (product_name IN ('tasks', 'meals', 'calendar', 'grocery')),
  enabled_at timestamptz DEFAULT now() NOT NULL,
  enabled_by uuid REFERENCES auth.users(id),
  UNIQUE(household_id, product_name)
);

-- Enable RLS
ALTER TABLE public.household_enabled_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view enabled products"
ON public.household_enabled_products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_members.household_id = household_enabled_products.household_id
    AND household_members.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can insert products"
ON public.household_enabled_products
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_members.household_id = household_enabled_products.household_id
    AND household_members.user_id = auth.uid()
    AND household_members.role = 'admin'
  )
);

CREATE POLICY "Admins can delete products"
ON public.household_enabled_products
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_members.household_id = household_enabled_products.household_id
    AND household_members.user_id = auth.uid()
    AND household_members.role = 'admin'
  )
);

-- Phase 2B: Add onboarding columns to households table
ALTER TABLE public.households 
ADD COLUMN onboarding_completed boolean DEFAULT false,
ADD COLUMN onboarding_completed_by uuid REFERENCES auth.users(id),
ADD COLUMN onboarding_completed_at timestamptz;

-- Create index for faster queries
CREATE INDEX idx_household_enabled_products_household ON public.household_enabled_products(household_id);
CREATE INDEX idx_households_onboarding_completed ON public.households(onboarding_completed);

-- Insert all products as enabled for existing households (backward compatibility)
INSERT INTO public.household_enabled_products (household_id, product_name, enabled_by)
SELECT 
  h.id,
  p.product_name,
  h.created_by
FROM public.households h
CROSS JOIN (
  SELECT 'tasks' AS product_name
  UNION ALL SELECT 'meals'
  UNION ALL SELECT 'calendar'
  UNION ALL SELECT 'grocery'
) p
ON CONFLICT (household_id, product_name) DO NOTHING;

-- Mark existing households as onboarding completed
UPDATE public.households
SET 
  onboarding_completed = true,
  onboarding_completed_by = created_by,
  onboarding_completed_at = created_at
WHERE onboarding_completed IS NULL OR onboarding_completed = false;