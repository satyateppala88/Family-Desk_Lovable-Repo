CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID NOT NULL,
  module TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT ON public.ai_feedback TO authenticated;
GRANT ALL ON public.ai_feedback TO service_role;

-- Enable RLS
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users submit their own feedback"
  ON public.ai_feedback FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view their own feedback"
  ON public.ai_feedback FOR SELECT USING (user_id = auth.uid());

-- Index for analytics queries
CREATE INDEX idx_ai_feedback_household_module ON public.ai_feedback(household_id, module);