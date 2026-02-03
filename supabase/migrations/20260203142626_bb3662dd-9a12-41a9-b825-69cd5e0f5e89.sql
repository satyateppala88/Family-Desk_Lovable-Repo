-- Add completed_tours column for per-feature tour tracking
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS completed_tours JSONB DEFAULT '{}'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN profiles.completed_tours IS 
  'Tracks which feature tours the user has completed. Keys: dashboard, tasks, meals, grocery, habits, calendar, taskmaster';