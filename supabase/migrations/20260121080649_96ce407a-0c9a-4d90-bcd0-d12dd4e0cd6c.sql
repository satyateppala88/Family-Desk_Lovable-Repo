-- Create habits table
CREATE TABLE public.habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'check',
  color TEXT DEFAULT '#47CC7B',
  frequency_type TEXT NOT NULL DEFAULT 'daily' CHECK (frequency_type IN ('daily', 'weekly', 'specific_days')),
  frequency_days INTEGER[] DEFAULT '{}',
  reminder_time TIME,
  target_value NUMERIC,
  target_unit TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create habit_logs table
CREATE TABLE public.habit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  log_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  actual_value NUMERIC,
  notes TEXT,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(habit_id, log_date)
);

-- Create habit_streaks table (cached for performance)
CREATE TABLE public.habit_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(habit_id, user_id)
);

-- Create household_habit_goals table
CREATE TABLE public.household_habit_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  metric_type TEXT NOT NULL DEFAULT 'total_completions' CHECK (metric_type IN ('total_completions', 'total_value', 'streak_days', 'completion_rate')),
  target_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create habit_coach_recommendations table
CREATE TABLE public.habit_coach_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID,
  recommendation_type TEXT NOT NULL DEFAULT 'personal' CHECK (recommendation_type IN ('personal', 'household')),
  content TEXT NOT NULL,
  context JSONB,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create habit_badges table
CREATE TABLE public.habit_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  criteria_type TEXT NOT NULL CHECK (criteria_type IN ('streak', 'total_completions', 'weekly_rate', 'first_habit')),
  criteria_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_habit_badges table
CREATE TABLE public.user_habit_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.habit_badges(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id, habit_id)
);

-- Enable RLS on all tables
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_habit_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_coach_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_habit_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for habits
CREATE POLICY "Members can view household habits"
  ON public.habits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_members.household_id = habits.household_id
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can create habits"
  ON public.habits FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = habits.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own habits"
  ON public.habits FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own habits"
  ON public.habits FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for habit_logs
CREATE POLICY "Members can view household habit logs"
  ON public.habit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.habits h
    JOIN public.household_members hm ON hm.household_id = h.household_id
    WHERE h.id = habit_logs.habit_id
    AND hm.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own habit logs"
  ON public.habit_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own habit logs"
  ON public.habit_logs FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own habit logs"
  ON public.habit_logs FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for habit_streaks
CREATE POLICY "Members can view household habit streaks"
  ON public.habit_streaks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.habits h
    JOIN public.household_members hm ON hm.household_id = h.household_id
    WHERE h.id = habit_streaks.habit_id
    AND hm.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their own streaks"
  ON public.habit_streaks FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for household_habit_goals
CREATE POLICY "Members can view household goals"
  ON public.household_habit_goals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_members.household_id = household_habit_goals.household_id
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage household goals"
  ON public.household_habit_goals FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_members.household_id = household_habit_goals.household_id
    AND household_members.user_id = auth.uid()
    AND household_members.role = 'admin'
  ));

-- RLS Policies for habit_coach_recommendations
CREATE POLICY "Users can view their recommendations"
  ON public.habit_coach_recommendations FOR SELECT
  USING (
    user_id = auth.uid() OR
    (user_id IS NULL AND EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = habit_coach_recommendations.household_id
      AND household_members.user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can dismiss their recommendations"
  ON public.habit_coach_recommendations FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (user_id IS NULL AND EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_members.household_id = habit_coach_recommendations.household_id
      AND household_members.user_id = auth.uid()
    ))
  );

-- RLS Policies for habit_badges (public read)
CREATE POLICY "Anyone can view badges"
  ON public.habit_badges FOR SELECT
  USING (true);

-- RLS Policies for user_habit_badges
CREATE POLICY "Members can view household member badges"
  ON public.user_habit_badges FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.habits h
    JOIN public.household_members hm ON hm.household_id = h.household_id
    WHERE h.id = user_habit_badges.habit_id
    AND hm.user_id = auth.uid()
  ) OR user_id = auth.uid());

CREATE POLICY "Users can earn badges"
  ON public.user_habit_badges FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create trigger for updated_at on habits
CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default badges
INSERT INTO public.habit_badges (name, description, icon, criteria_type, criteria_value) VALUES
  ('First Step', 'Complete your first habit', 'sprout', 'first_habit', 1),
  ('Week Warrior', 'Maintain a 7-day streak', 'flame', 'streak', 7),
  ('Fortnight Fighter', 'Maintain a 14-day streak', 'zap', 'streak', 14),
  ('Month Master', 'Maintain a 30-day streak', 'trophy', 'streak', 30),
  ('Century Champion', 'Maintain a 100-day streak', 'crown', 'streak', 100),
  ('Starter Pack', 'Complete 10 habits total', 'package', 'total_completions', 10),
  ('Habit Builder', 'Complete 50 habits total', 'hammer', 'total_completions', 50),
  ('Consistency King', 'Complete 100 habits total', 'medal', 'total_completions', 100);