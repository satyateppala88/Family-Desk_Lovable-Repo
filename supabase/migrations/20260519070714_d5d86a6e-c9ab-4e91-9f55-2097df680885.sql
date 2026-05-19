DELETE FROM public.meal_plans a
USING public.meal_plans b
WHERE a.household_id = b.household_id
  AND a.week_start_date = b.week_start_date
  AND a.ctid > b.ctid;

ALTER TABLE public.meal_plans
  ADD CONSTRAINT meal_plans_household_week_unique
  UNIQUE (household_id, week_start_date);