-- Create household_preferences table
CREATE TABLE IF NOT EXISTS household_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  
  -- Household basics
  family_size_adults INTEGER DEFAULT 2,
  family_size_children INTEGER DEFAULT 0,
  household_type VARCHAR(50),
  
  -- Dietary preferences
  diet_type VARCHAR(50),
  food_allergies TEXT[],
  religious_restrictions VARCHAR(50),
  spice_level VARCHAR(20),
  regional_cuisines TEXT[],
  
  -- Cooking preferences
  cooking_skill_level VARCHAR(20),
  weekday_cooking_time VARCHAR(20),
  preferred_meal_types TEXT[],
  pantry_size VARCHAR(20),
  shopping_frequency VARCHAR(20),
  
  -- Household priorities
  household_concerns TEXT[],
  work_schedule VARCHAR(50),
  preferred_task_time VARCHAR(20),
  festival_importance VARCHAR(20),
  
  -- Budget preferences
  monthly_grocery_budget VARCHAR(20),
  shopping_locations TEXT[],
  organic_preference VARCHAR(20),
  budget_consciousness VARCHAR(20),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for household_preferences
ALTER TABLE household_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their household preferences"
  ON household_preferences FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = household_preferences.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their household preferences"
  ON household_preferences FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = household_preferences.household_id 
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their household preferences"
  ON household_preferences FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM household_members 
    WHERE household_members.household_id = household_preferences.household_id 
    AND household_members.user_id = auth.uid()
  ));

-- Create user_onboarding_progress table
CREATE TABLE IF NOT EXISTS user_onboarding_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  current_step INTEGER DEFAULT 1,
  completed_steps TEXT[] DEFAULT ARRAY[]::TEXT[],
  preferences_completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own onboarding progress"
  ON user_onboarding_progress FOR ALL
  USING (user_id = auth.uid());

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_household_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER household_preferences_updated_at
  BEFORE UPDATE ON household_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_household_preferences_updated_at();