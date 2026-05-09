DO $$
DECLARE
  t text;
  shared_tables text[] := ARRAY[
    'household_members',
    'household_enabled_products',
    'household_family_members',
    'projects',
    'tasks',
    'task_assignees',
    'task_comments',
    'daily_plans',
    'daily_plan_items',
    'meal_plans',
    'meal_plan_items',
    'shopping_lists',
    'shopping_list_items',
    'pantry_items',
    'finance_accounts',
    'finance_transactions',
    'finance_budgets',
    'finance_savings_goals',
    'finance_subscriptions',
    'finance_user_cards',
    'finance_custom_cards',
    'finance_custom_categories',
    'finance_monthly_snapshots',
    'habits',
    'habit_assignees',
    'habit_logs',
    'habit_scores',
    'habit_streaks',
    'household_habit_goals',
    'ai_suggestions',
    'calendar_settings'
  ];
BEGIN
  FOREACH t IN ARRAY shared_tables LOOP
    -- Skip if table doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t
    ) THEN
      CONTINUE;
    END IF;

    -- Ensure full row payloads
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);

    -- Add to publication only if missing
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;