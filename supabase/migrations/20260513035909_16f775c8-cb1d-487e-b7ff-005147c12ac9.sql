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
    -- Existing data can contain multiple generated plans for the same
    -- household/week. Keep the newest plan so the unique rule can be added
    -- safely during publish; meal_plan_items cascade with the older plans.
    WITH ranked_meal_plans AS (
      SELECT
        id,
        row_number() OVER (
          PARTITION BY household_id, week_start_date
          ORDER BY created_at DESC, id DESC
        ) AS row_rank
      FROM public.meal_plans
    )
    DELETE FROM public.meal_plans mp
    USING ranked_meal_plans ranked
    WHERE mp.id = ranked.id
      AND ranked.row_rank > 1;

    ALTER TABLE public.meal_plans
      ADD CONSTRAINT meal_plans_household_id_week_start_date_key
      UNIQUE (household_id, week_start_date);
  END IF;
END $$;