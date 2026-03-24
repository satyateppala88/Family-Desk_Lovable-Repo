CREATE TABLE public.finance_user_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  card_catalog_id TEXT NOT NULL,
  nickname TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  added_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_user_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view user cards" ON public.finance_user_cards
  FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = finance_user_cards.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Members can create user cards" ON public.finance_user_cards
  FOR INSERT TO public
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = finance_user_cards.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Members can update user cards" ON public.finance_user_cards
  FOR UPDATE TO public
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = finance_user_cards.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Members can delete user cards" ON public.finance_user_cards
  FOR DELETE TO public
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = finance_user_cards.household_id AND household_members.user_id = auth.uid()));