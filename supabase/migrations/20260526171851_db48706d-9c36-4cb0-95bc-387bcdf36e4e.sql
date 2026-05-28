WITH ranked AS (
  SELECT id,
         household_id,
         key,
         row_number() OVER (PARTITION BY household_id, key ORDER BY created_at, id) AS rn
  FROM public.finance_custom_categories
)
UPDATE public.finance_custom_categories c
SET key = c.key || '_' || r.rn,
    updated_at = now()
FROM ranked r
WHERE r.id = c.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS finance_custom_categories_household_key_unique
  ON public.finance_custom_categories (household_id, key);