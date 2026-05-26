CREATE TABLE IF NOT EXISTS public.user_ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('goal', 'preference', 'context')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ai_memory TO authenticated;
GRANT ALL ON public.user_ai_memory TO service_role;

ALTER TABLE public.user_ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own memories"
  ON public.user_ai_memory FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_ai_memory_user
  ON public.user_ai_memory(user_id, household_id);