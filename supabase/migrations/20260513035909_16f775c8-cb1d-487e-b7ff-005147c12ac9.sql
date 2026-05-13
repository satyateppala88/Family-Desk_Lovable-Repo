ALTER TABLE public.habit_logs DROP CONSTRAINT IF EXISTS habit_logs_habit_id_log_date_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.habit_logs'::regclass
      AND conname = 'habit_logs_habit_id_log_date_user_id_key'
  ) THEN
    ALTER TABLE public.habit_logs
      ADD CONSTRAINT habit_logs_habit_id_log_date_user_id_key
      UNIQUE (habit_id, log_date, user_id);
  END IF;
END $$;

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