DELETE FROM public.household_enabled_products a
USING public.household_enabled_products b
WHERE a.ctid < b.ctid
  AND a.household_id = b.household_id
  AND a.product_name = b.product_name;

ALTER TABLE public.household_enabled_products
  ADD CONSTRAINT household_enabled_products_household_product_unique
  UNIQUE (household_id, product_name);