ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS challenge_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS habits_challenge_user_unique
  ON public.habits (challenge_id, user_id)
  WHERE challenge_id IS NOT NULL;