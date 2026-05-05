ALTER TABLE public.household_preferences
ADD COLUMN IF NOT EXISTS completed_module_setups jsonb NOT NULL DEFAULT '{}'::jsonb;