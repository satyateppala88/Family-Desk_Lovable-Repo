-- Modify pantry_items table to add smart features
ALTER TABLE public.pantry_items 
ADD COLUMN IF NOT EXISTS minimum_quantity NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_staple BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_purchased_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS average_usage_days INTEGER;

-- Create pantry_categories table
CREATE TABLE IF NOT EXISTS public.pantry_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(household_id, name)
);

-- Enable RLS on pantry_categories
ALTER TABLE public.pantry_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pantry_categories
CREATE POLICY "Members can view household categories"
ON public.pantry_categories
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = pantry_categories.household_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Members can create categories"
ON public.pantry_categories
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = pantry_categories.household_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Members can update categories"
ON public.pantry_categories
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = pantry_categories.household_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Members can delete categories"
ON public.pantry_categories
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = pantry_categories.household_id
    AND user_id = auth.uid()
  )
);

-- Create shopping_lists table
CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  auto_generated BOOLEAN DEFAULT false,
  meal_plan_id UUID REFERENCES public.meal_plans(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS on shopping_lists
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shopping_lists
CREATE POLICY "Members can view shopping lists"
ON public.shopping_lists
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = shopping_lists.household_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Members can create shopping lists"
ON public.shopping_lists
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = shopping_lists.household_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Members can update shopping lists"
ON public.shopping_lists
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = shopping_lists.household_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Members can delete shopping lists"
ON public.shopping_lists
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = shopping_lists.household_id
    AND user_id = auth.uid()
  )
);

-- Create shopping_list_items table
CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  category TEXT,
  is_checked BOOLEAN DEFAULT false,
  checked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  checked_at TIMESTAMPTZ,
  pantry_item_id UUID REFERENCES public.pantry_items(id) ON DELETE SET NULL,
  recipe_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on shopping_list_items
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shopping_list_items
CREATE POLICY "Members can view shopping list items"
ON public.shopping_list_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shopping_lists sl
    JOIN public.household_members hm ON hm.household_id = sl.household_id
    WHERE sl.id = shopping_list_items.list_id
    AND hm.user_id = auth.uid()
  )
);

CREATE POLICY "Members can create shopping list items"
ON public.shopping_list_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shopping_lists sl
    JOIN public.household_members hm ON hm.household_id = sl.household_id
    WHERE sl.id = shopping_list_items.list_id
    AND hm.user_id = auth.uid()
  )
);

CREATE POLICY "Members can update shopping list items"
ON public.shopping_list_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shopping_lists sl
    JOIN public.household_members hm ON hm.household_id = sl.household_id
    WHERE sl.id = shopping_list_items.list_id
    AND hm.user_id = auth.uid()
  )
);

CREATE POLICY "Members can delete shopping list items"
ON public.shopping_list_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shopping_lists sl
    JOIN public.household_members hm ON hm.household_id = sl.household_id
    WHERE sl.id = shopping_list_items.list_id
    AND hm.user_id = auth.uid()
  )
);

-- Create pantry_item_usage table for tracking meal-based consumption
CREATE TABLE IF NOT EXISTS public.pantry_item_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pantry_item_id UUID NOT NULL REFERENCES public.pantry_items(id) ON DELETE CASCADE,
  meal_plan_item_id UUID REFERENCES public.meal_plan_items(id) ON DELETE SET NULL,
  quantity_used NUMERIC NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on pantry_item_usage
ALTER TABLE public.pantry_item_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pantry_item_usage
CREATE POLICY "Members can view usage"
ON public.pantry_item_usage
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pantry_items pi
    JOIN public.household_members hm ON hm.household_id = pi.household_id
    WHERE pi.id = pantry_item_usage.pantry_item_id
    AND hm.user_id = auth.uid()
  )
);

CREATE POLICY "Members can create usage records"
ON public.pantry_item_usage
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pantry_items pi
    JOIN public.household_members hm ON hm.household_id = pi.household_id
    WHERE pi.id = pantry_item_usage.pantry_item_id
    AND hm.user_id = auth.uid()
  )
);