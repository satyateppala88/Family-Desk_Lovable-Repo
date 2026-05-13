-- Habit Challenges
CREATE TABLE public.household_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  template_id text NOT NULL,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🏆',
  description text,
  duration_days integer NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  started_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_household_challenges_household ON public.household_challenges(household_id, status);
ALTER TABLE public.household_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view household challenges" ON public.household_challenges
  FOR SELECT USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members start household challenges" ON public.household_challenges
  FOR INSERT WITH CHECK (public.is_household_member(auth.uid(), household_id) AND started_by = auth.uid());
CREATE POLICY "Members update household challenges" ON public.household_challenges
  FOR UPDATE USING (public.is_household_member(auth.uid(), household_id));
CREATE POLICY "Members delete household challenges" ON public.household_challenges
  FOR DELETE USING (public.is_household_member(auth.uid(), household_id));

CREATE TABLE public.challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.household_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);
CREATE INDEX idx_challenge_participants_challenge ON public.challenge_participants(challenge_id);
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view participants" ON public.challenge_participants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.household_challenges hc
            WHERE hc.id = challenge_id AND public.is_household_member(auth.uid(), hc.household_id))
  );
CREATE POLICY "Users join challenges" ON public.challenge_participants
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.household_challenges hc
            WHERE hc.id = challenge_id AND public.is_household_member(auth.uid(), hc.household_id))
  );
CREATE POLICY "Users leave challenges" ON public.challenge_participants
  FOR DELETE USING (user_id = auth.uid());

CREATE TABLE public.challenge_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.household_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  completed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id, log_date)
);
CREATE INDEX idx_challenge_logs_challenge_date ON public.challenge_logs(challenge_id, log_date);
ALTER TABLE public.challenge_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view challenge logs" ON public.challenge_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.household_challenges hc
            WHERE hc.id = challenge_id AND public.is_household_member(auth.uid(), hc.household_id))
  );
CREATE POLICY "Users insert own challenge logs" ON public.challenge_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own challenge logs" ON public.challenge_logs
  FOR DELETE USING (user_id = auth.uid());

-- Streak freeze on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS streak_freezes_remaining integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS streak_freeze_period text,
  ADD COLUMN IF NOT EXISTS last_freeze_used_at timestamptz;

-- Mark synthetic freeze logs
ALTER TABLE public.habit_logs
  ADD COLUMN IF NOT EXISTS is_freeze boolean NOT NULL DEFAULT false;