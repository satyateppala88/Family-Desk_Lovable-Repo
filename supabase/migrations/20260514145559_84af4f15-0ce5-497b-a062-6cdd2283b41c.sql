-- F-12: Add paid_by to track who actually spent/earned the money
ALTER TABLE public.finance_transactions
  ADD COLUMN IF NOT EXISTS paid_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.finance_transactions
  SET paid_by = created_by
  WHERE paid_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_finance_transactions_household_paid_by
  ON public.finance_transactions (household_id, paid_by);

-- F-13: Link transactions to savings goals
ALTER TABLE public.finance_transactions
  ADD COLUMN IF NOT EXISTS savings_goal_id uuid
  REFERENCES public.finance_savings_goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_finance_transactions_savings_goal
  ON public.finance_transactions (savings_goal_id);