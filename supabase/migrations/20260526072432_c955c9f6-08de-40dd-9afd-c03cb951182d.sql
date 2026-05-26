-- habit_logs: user + date filter runs on every Habits page load
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date
  ON public.habit_logs (user_id, log_date);

-- habit_scores: leaderboard and stats queries
CREATE INDEX IF NOT EXISTS idx_habit_scores_household_date
  ON public.habit_scores (household_id, score_date);

-- finance_transactions: household + date filter (Finance dashboard)
CREATE INDEX IF NOT EXISTS idx_finance_tx_household_date
  ON public.finance_transactions (household_id, transaction_date DESC);

-- finance_transactions: category filter
CREATE INDEX IF NOT EXISTS idx_finance_tx_category
  ON public.finance_transactions (household_id, category);

-- shopping_list_items: every shopping list detail view
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list
  ON public.shopping_list_items (list_id);

-- task_assignees: every taskmaster query joins this
CREATE INDEX IF NOT EXISTS idx_task_assignees_task
  ON public.task_assignees (task_id);

-- household_members: every page load hits this
CREATE INDEX IF NOT EXISTS idx_household_members_household
  ON public.household_members (household_id);