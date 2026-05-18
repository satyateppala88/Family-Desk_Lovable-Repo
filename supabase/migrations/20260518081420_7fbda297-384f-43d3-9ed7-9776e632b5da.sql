ALTER TABLE public.finance_budgets
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS budget_type text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS annual_amount numeric NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'finance_budgets_budget_type_check'
  ) THEN
    ALTER TABLE public.finance_budgets
      ADD CONSTRAINT finance_budgets_budget_type_check
      CHECK (budget_type IN ('monthly', 'annual'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_finance_budgets_recurring
  ON public.finance_budgets (household_id, category, month)
  WHERE is_recurring = true;