WITH ranked_preferences AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY household_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS row_rank
  FROM public.household_preferences
)
DELETE FROM public.household_preferences hp
USING ranked_preferences rp
WHERE hp.ctid = rp.ctid
  AND rp.row_rank > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'household_preferences_household_id_unique'
      AND conrelid = 'public.household_preferences'::regclass
  ) THEN
    ALTER TABLE public.household_preferences
      ADD CONSTRAINT household_preferences_household_id_unique
      UNIQUE (household_id);
  END IF;
END $$;
