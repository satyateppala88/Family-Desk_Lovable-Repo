-- Enable realtime for shared family data so all household members see live updates

-- Taskmaster
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_plan_items;

-- Meals & grocery
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_plan_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_list_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pantry_items;

-- Finance
ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_savings_goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_budgets;

-- Habits
ALTER PUBLICATION supabase_realtime ADD TABLE public.habits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.habit_logs;

-- Ensure REPLICA IDENTITY FULL for accurate change payloads
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.task_assignees REPLICA IDENTITY FULL;
ALTER TABLE public.task_comments REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.daily_plans REPLICA IDENTITY FULL;
ALTER TABLE public.daily_plan_items REPLICA IDENTITY FULL;
ALTER TABLE public.meal_plans REPLICA IDENTITY FULL;
ALTER TABLE public.meal_plan_items REPLICA IDENTITY FULL;
ALTER TABLE public.shopping_lists REPLICA IDENTITY FULL;
ALTER TABLE public.shopping_list_items REPLICA IDENTITY FULL;
ALTER TABLE public.pantry_items REPLICA IDENTITY FULL;
ALTER TABLE public.finance_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.finance_subscriptions REPLICA IDENTITY FULL;
ALTER TABLE public.finance_savings_goals REPLICA IDENTITY FULL;
ALTER TABLE public.finance_budgets REPLICA IDENTITY FULL;
ALTER TABLE public.habits REPLICA IDENTITY FULL;
ALTER TABLE public.habit_logs REPLICA IDENTITY FULL;