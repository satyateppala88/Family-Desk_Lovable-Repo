
CREATE TABLE public.finance_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  category TEXT NOT NULL DEFAULT 'other',
  next_due_date DATE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view subscriptions"
  ON public.finance_subscriptions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM household_members
    WHERE household_members.household_id = finance_subscriptions.household_id
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can create subscriptions"
  ON public.finance_subscriptions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM household_members
    WHERE household_members.household_id = finance_subscriptions.household_id
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can update subscriptions"
  ON public.finance_subscriptions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM household_members
    WHERE household_members.household_id = finance_subscriptions.household_id
    AND household_members.user_id = auth.uid()
  ));

CREATE POLICY "Members can delete subscriptions"
  ON public.finance_subscriptions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM household_members
    WHERE household_members.household_id = finance_subscriptions.household_id
    AND household_members.user_id = auth.uid()
  ));
