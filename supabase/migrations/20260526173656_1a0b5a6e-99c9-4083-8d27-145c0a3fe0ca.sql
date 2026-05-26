CREATE TABLE IF NOT EXISTS public.household_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  insight_text TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  week_start DATE NOT NULL
);

GRANT SELECT ON public.household_ai_insights TO authenticated;
GRANT ALL ON public.household_ai_insights TO service_role;

ALTER TABLE public.household_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their household insights"
  ON public.household_ai_insights FOR SELECT
  TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE INDEX IF NOT EXISTS idx_ai_insights_household
  ON public.household_ai_insights(household_id, week_start DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_ai_insights_household_week
  ON public.household_ai_insights(household_id, week_start);