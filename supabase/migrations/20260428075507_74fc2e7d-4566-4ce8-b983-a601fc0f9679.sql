DELETE FROM public.household_enabled_products a
USING public.household_enabled_products b
WHERE a.ctid < b.ctid
  AND a.household_id = b.household_id
  AND a.product_name = b.product_name;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'household_enabled_products_household_product_unique'
      AND conrelid = 'public.household_enabled_products'::regclass
  ) THEN
    ALTER TABLE public.household_enabled_products
      ADD CONSTRAINT household_enabled_products_household_product_unique
      UNIQUE (household_id, product_name);
  END IF;
END $$;
