-- Add columns for children ages and senior citizens to household_preferences
ALTER TABLE public.household_preferences
ADD COLUMN IF NOT EXISTS children_ages integer[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS family_size_seniors integer DEFAULT 0;

COMMENT ON COLUMN public.household_preferences.children_ages IS 'Array of ages for children in the household';
COMMENT ON COLUMN public.household_preferences.family_size_seniors IS 'Number of senior citizens (age 60+) in the household';