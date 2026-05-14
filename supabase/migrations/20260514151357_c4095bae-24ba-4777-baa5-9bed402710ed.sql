ALTER TABLE public.finance_transactions
  DROP CONSTRAINT IF EXISTS finance_transactions_paid_by_fkey;

CREATE INDEX IF NOT EXISTS idx_finance_transactions_household_paid_by
  ON public.finance_transactions (household_id, paid_by);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_savings_goal
  ON public.finance_transactions (savings_goal_id);

COMMENT ON COLUMN public.finance_transactions.paid_by IS 'Household member user id who actually paid, earned, or saved this money. Kept without a direct auth foreign key for safer environment sync.';