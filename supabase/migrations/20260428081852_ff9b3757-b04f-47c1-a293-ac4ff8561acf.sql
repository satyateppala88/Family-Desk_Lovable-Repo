-- Remove duplicate household_preferences rows, keeping the most recently updated one per household
DELETE FROM public.household_preferences a
USING public.household_preferences b
WHERE a.household_id = b.household_id
  AND (a.updated_at < b.updated_at
       OR (a.updated_at = b.updated_at AND a.ctid < b.ctid));

-- Add the missing unique constraint so upsert(onConflict: "household_id") works
ALTER TABLE public.household_preferences
  ADD CONSTRAINT household_preferences_household_id_unique
  UNIQUE (household_id);