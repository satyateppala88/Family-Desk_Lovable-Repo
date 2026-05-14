
-- households.created_by: cannot be null, but we want delete to cascade household removal
ALTER TABLE public.households DROP CONSTRAINT IF EXISTS households_created_by_fkey;
ALTER TABLE public.households
  ADD CONSTRAINT households_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.households DROP CONSTRAINT IF EXISTS households_onboarding_completed_by_fkey;
ALTER TABLE public.households
  ADD CONSTRAINT households_onboarding_completed_by_fkey
  FOREIGN KEY (onboarding_completed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Tasks created_by
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Task comments
ALTER TABLE public.task_comments DROP CONSTRAINT IF EXISTS task_comments_user_id_fkey;
ALTER TABLE public.task_comments
  ADD CONSTRAINT task_comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Recipes
ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_created_by_fkey;
ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Meal plans
ALTER TABLE public.meal_plans DROP CONSTRAINT IF EXISTS meal_plans_created_by_fkey;
ALTER TABLE public.meal_plans
  ADD CONSTRAINT meal_plans_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Pantry items
ALTER TABLE public.pantry_items DROP CONSTRAINT IF EXISTS pantry_items_added_by_fkey;
ALTER TABLE public.pantry_items
  ADD CONSTRAINT pantry_items_added_by_fkey
  FOREIGN KEY (added_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Household enabled products
ALTER TABLE public.household_enabled_products DROP CONSTRAINT IF EXISTS household_enabled_products_enabled_by_fkey;
ALTER TABLE public.household_enabled_products
  ADD CONSTRAINT household_enabled_products_enabled_by_fkey
  FOREIGN KEY (enabled_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Invitations reviewed_by
ALTER TABLE public.household_invitations DROP CONSTRAINT IF EXISTS household_invitations_reviewed_by_fkey;
ALTER TABLE public.household_invitations
  ADD CONSTRAINT household_invitations_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Access requests reviewed_by
ALTER TABLE public.access_requests DROP CONSTRAINT IF EXISTS access_requests_reviewed_by_fkey;
ALTER TABLE public.access_requests
  ADD CONSTRAINT access_requests_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
