ALTER TABLE public.meal_plans
  DROP CONSTRAINT IF EXISTS meal_plans_household_week_unique;

ALTER TABLE public.meal_plans
  DROP CONSTRAINT IF EXISTS meal_plans_household_id_week_start_date_key;

DROP INDEX IF EXISTS public.meal_plans_household_week_uniq;

CREATE INDEX IF NOT EXISTS idx_meal_plans_household_week_start
  ON public.meal_plans (household_id, week_start_date);