CREATE UNIQUE INDEX IF NOT EXISTS meal_plans_household_week_uniq
  ON public.meal_plans (household_id, week_start_date);