CREATE TABLE public.finance_custom_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  name TEXT NOT NULL,
  bank TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'Visa',
  annual_fee NUMERIC NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#1a3a5c',
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  perks JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT,
  added_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_custom_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view household custom cards"
ON public.finance_custom_cards FOR SELECT
USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert household custom cards"
ON public.finance_custom_cards FOR INSERT
WITH CHECK (public.is_household_member(auth.uid(), household_id) AND added_by = auth.uid());

CREATE POLICY "Members can update household custom cards"
ON public.finance_custom_cards FOR UPDATE
USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete household custom cards"
ON public.finance_custom_cards FOR DELETE
USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER update_finance_custom_cards_updated_at
BEFORE UPDATE ON public.finance_custom_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_finance_custom_cards_household ON public.finance_custom_cards(household_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_custom_cards;