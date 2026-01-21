-- Drop the existing check constraint
ALTER TABLE household_enabled_products 
DROP CONSTRAINT IF EXISTS household_enabled_products_product_name_check;

-- Add updated check constraint with "habits" included
ALTER TABLE household_enabled_products 
ADD CONSTRAINT household_enabled_products_product_name_check 
CHECK (product_name = ANY (ARRAY['tasks'::text, 'meals'::text, 'calendar'::text, 'grocery'::text, 'habits'::text]));