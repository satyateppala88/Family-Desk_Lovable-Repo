-- Create dietary preferences table
CREATE TABLE IF NOT EXISTS public.dietary_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{}',
  cuisine_preferences TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id)
);

-- Create recipes table
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  prep_time INTEGER,
  cook_time INTEGER,
  servings INTEGER DEFAULT 4,
  difficulty TEXT DEFAULT 'medium',
  cuisine_type TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]',
  instructions JSONB NOT NULL DEFAULT '[]',
  nutritional_info JSONB,
  tags TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'user_created',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create meal plans table
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  week_start_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create meal plan items table
CREATE TABLE IF NOT EXISTS public.meal_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID REFERENCES public.meal_plans(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  day_of_week INTEGER NOT NULL,
  meal_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create pantry items table
CREATE TABLE IF NOT EXISTS public.pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  quantity DECIMAL,
  unit TEXT,
  expiry_date DATE,
  location TEXT,
  added_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.dietary_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dietary_preferences
CREATE POLICY "Members can view household preferences" ON public.dietary_preferences FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = dietary_preferences.household_id AND user_id = auth.uid())
);
CREATE POLICY "Members can insert preferences" ON public.dietary_preferences FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = dietary_preferences.household_id AND user_id = auth.uid())
);
CREATE POLICY "Members can update preferences" ON public.dietary_preferences FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = dietary_preferences.household_id AND user_id = auth.uid())
);

-- RLS Policies for recipes
CREATE POLICY "Members can view household recipes" ON public.recipes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = recipes.household_id AND user_id = auth.uid())
);
CREATE POLICY "Members can create recipes" ON public.recipes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = recipes.household_id AND user_id = auth.uid())
);
CREATE POLICY "Members can update recipes" ON public.recipes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = recipes.household_id AND user_id = auth.uid())
);
CREATE POLICY "Members can delete recipes" ON public.recipes FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = recipes.household_id AND user_id = auth.uid())
);

-- RLS Policies for meal_plans
CREATE POLICY "Members can view meal plans" ON public.meal_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = meal_plans.household_id AND user_id = auth.uid())
);
CREATE POLICY "Members can create meal plans" ON public.meal_plans FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = meal_plans.household_id AND user_id = auth.uid())
);
CREATE POLICY "Members can update meal plans" ON public.meal_plans FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = meal_plans.household_id AND user_id = auth.uid())
);
CREATE POLICY "Members can delete meal plans" ON public.meal_plans FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = meal_plans.household_id AND user_id = auth.uid())
);

-- RLS Policies for meal_plan_items
CREATE POLICY "Members can view meal plan items" ON public.meal_plan_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.meal_plans mp
    JOIN public.household_members hm ON hm.household_id = mp.household_id
    WHERE mp.id = meal_plan_items.meal_plan_id AND hm.user_id = auth.uid()
  )
);
CREATE POLICY "Members can create meal plan items" ON public.meal_plan_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meal_plans mp
    JOIN public.household_members hm ON hm.household_id = mp.household_id
    WHERE mp.id = meal_plan_items.meal_plan_id AND hm.user_id = auth.uid()
  )
);
CREATE POLICY "Members can update meal plan items" ON public.meal_plan_items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.meal_plans mp
    JOIN public.household_members hm ON hm.household_id = mp.household_id
    WHERE mp.id = meal_plan_items.meal_plan_id AND hm.user_id = auth.uid()
  )
);
CREATE POLICY "Members can delete meal plan items" ON public.meal_plan_items FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.meal_plans mp
    JOIN public.household_members hm ON hm.household_id = mp.household_id
    WHERE mp.id = meal_plan_items.meal_plan_id AND hm.user_id = auth.uid()
  )
);

-- RLS Policies for pantry_items
CREATE POLICY "Members can view pantry items" ON public.pantry_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = pantry_items.household_id AND user_id = auth.uid())
);
CREATE POLICY "Members can create pantry items" ON public.pantry_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = pantry_items.household_id AND user_id = auth.uid())
);
CREATE POLICY "Members can update pantry items" ON public.pantry_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = pantry_items.household_id AND user_id = auth.uid())
);
CREATE POLICY "Members can delete pantry items" ON public.pantry_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.household_members WHERE household_id = pantry_items.household_id AND user_id = auth.uid())
);

-- Triggers
CREATE TRIGGER update_dietary_preferences_updated_at BEFORE UPDATE ON public.dietary_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON public.meal_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pantry_items_updated_at BEFORE UPDATE ON public.pantry_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_recipes_household_id ON public.recipes(household_id);
CREATE INDEX idx_recipes_is_favorite ON public.recipes(is_favorite);
CREATE INDEX idx_meal_plans_household_id ON public.meal_plans(household_id);
CREATE INDEX idx_meal_plans_week_start ON public.meal_plans(week_start_date);
CREATE INDEX idx_meal_plan_items_meal_plan_id ON public.meal_plan_items(meal_plan_id);
CREATE INDEX idx_pantry_items_household_id ON public.pantry_items(household_id);
CREATE INDEX idx_pantry_items_expiry ON public.pantry_items(expiry_date);