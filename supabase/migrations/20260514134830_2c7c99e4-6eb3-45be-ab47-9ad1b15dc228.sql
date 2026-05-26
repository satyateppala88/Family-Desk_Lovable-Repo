DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.meal_plans'::regclass
      AND conname = 'meal_plans_household_id_week_start_date_key'
  ) THEN
    ALTER TABLE public.meal_plans
      ADD CONSTRAINT meal_plans_household_id_week_start_date_key
      UNIQUE (household_id, week_start_date);
  END IF;
END $$;