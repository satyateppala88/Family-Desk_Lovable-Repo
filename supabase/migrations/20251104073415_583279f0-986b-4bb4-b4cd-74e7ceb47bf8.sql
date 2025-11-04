-- Fix search_path for the update_household_preferences_updated_at function
CREATE OR REPLACE FUNCTION update_household_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path TO 'public';