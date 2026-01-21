-- Add assignment type column to habits table
ALTER TABLE habits 
ADD COLUMN IF NOT EXISTS assignment_type text NOT NULL DEFAULT 'personal' 
CHECK (assignment_type IN ('personal', 'multiple', 'household'));

-- Create habit_assignees table for habits assigned to multiple individuals
CREATE TABLE IF NOT EXISTS habit_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(habit_id, user_id)
);

-- Enable RLS on habit_assignees
ALTER TABLE habit_assignees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for habit_assignees
CREATE POLICY "Members can view habit assignees" ON habit_assignees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM habits h
      JOIN household_members hm ON hm.household_id = h.household_id
      WHERE h.id = habit_assignees.habit_id AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert assignees for their habits" ON habit_assignees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM habits h
      WHERE h.id = habit_assignees.habit_id AND h.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete assignees for their habits" ON habit_assignees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM habits h
      WHERE h.id = habit_assignees.habit_id AND h.user_id = auth.uid()
    )
  );

-- Create habit_scores table for gamification
CREATE TABLE IF NOT EXISTS habit_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  score_date date NOT NULL DEFAULT CURRENT_DATE,
  daily_score integer NOT NULL DEFAULT 0,
  streak_bonus integer NOT NULL DEFAULT 0,
  total_score integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(household_id, user_id, score_date)
);

-- Enable RLS on habit_scores
ALTER TABLE habit_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for habit_scores
CREATE POLICY "Members can view household scores" ON habit_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = habit_scores.household_id AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own scores" ON habit_scores
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own scores" ON habit_scores
  FOR UPDATE USING (user_id = auth.uid());

-- Create trigger for updating updated_at on habit_scores
CREATE TRIGGER update_habit_scores_updated_at
  BEFORE UPDATE ON habit_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();