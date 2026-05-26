ALTER TABLE public.household_preferences
  ADD COLUMN IF NOT EXISTS finance_setup_complete  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grocery_setup_complete  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meals_setup_complete    boolean NOT NULL DEFAULT false;

UPDATE public.household_preferences
SET finance_setup_complete = COALESCE((completed_module_setups->>'finance_setup')::boolean, false),
    grocery_setup_complete = COALESCE((completed_module_setups->>'grocery_setup')::boolean, false),
    meals_setup_complete   = COALESCE((completed_module_setups->>'meals_setup')::boolean, false);