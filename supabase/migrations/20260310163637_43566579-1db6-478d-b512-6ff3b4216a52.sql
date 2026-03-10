
-- Finance Accounts
CREATE TABLE public.finance_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'bank',
  balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view finance accounts" ON public.finance_accounts
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_accounts.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "Members can create finance accounts" ON public.finance_accounts
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_accounts.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "Members can update finance accounts" ON public.finance_accounts
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_accounts.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "Members can delete finance accounts" ON public.finance_accounts
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_accounts.household_id AND user_id = auth.uid()
  ));

-- Finance Transactions
CREATE TABLE public.finance_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.finance_accounts(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_pattern JSONB,
  tagged_member UUID,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view finance transactions" ON public.finance_transactions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_transactions.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "Members can create finance transactions" ON public.finance_transactions
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_transactions.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "Members can update finance transactions" ON public.finance_transactions
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_transactions.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "Members can delete finance transactions" ON public.finance_transactions
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_transactions.household_id AND user_id = auth.uid()
  ));

-- Finance Budgets
CREATE TABLE public.finance_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  category TEXT NOT NULL,
  planned_amount NUMERIC NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(household_id, month, category)
);

ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view finance budgets" ON public.finance_budgets
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_budgets.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "Members can create finance budgets" ON public.finance_budgets
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_budgets.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "Members can update finance budgets" ON public.finance_budgets
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_budgets.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "Members can delete finance budgets" ON public.finance_budgets
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_budgets.household_id AND user_id = auth.uid()
  ));

-- Finance Savings Goals
CREATE TABLE public.finance_savings_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view savings goals" ON public.finance_savings_goals
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_savings_goals.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "Members can create savings goals" ON public.finance_savings_goals
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_savings_goals.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "Members can update savings goals" ON public.finance_savings_goals
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_savings_goals.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "Members can delete savings goals" ON public.finance_savings_goals
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_savings_goals.household_id AND user_id = auth.uid()
  ));

-- Finance Monthly Snapshots
CREATE TABLE public.finance_monthly_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  total_income NUMERIC NOT NULL DEFAULT 0,
  total_spend NUMERIC NOT NULL DEFAULT 0,
  savings_actual NUMERIC NOT NULL DEFAULT 0,
  budget_health_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(household_id, month)
);

ALTER TABLE public.finance_monthly_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view monthly snapshots" ON public.finance_monthly_snapshots
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_monthly_snapshots.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "Members can create monthly snapshots" ON public.finance_monthly_snapshots
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_monthly_snapshots.household_id AND user_id = auth.uid()
  ));
CREATE POLICY "Members can update monthly snapshots" ON public.finance_monthly_snapshots
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.household_members WHERE household_id = finance_monthly_snapshots.household_id AND user_id = auth.uid()
  ));

-- Finance Chat Sessions
CREATE TABLE public.finance_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their finance chat sessions" ON public.finance_chat_sessions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create finance chat sessions" ON public.finance_chat_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their finance chat sessions" ON public.finance_chat_sessions
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their finance chat sessions" ON public.finance_chat_sessions
  FOR DELETE USING (user_id = auth.uid());

-- Finance Chat Messages
CREATE TABLE public.finance_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.finance_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their finance chat messages" ON public.finance_chat_messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.finance_chat_sessions WHERE id = finance_chat_messages.session_id AND user_id = auth.uid()
  ));
CREATE POLICY "Users can create finance chat messages" ON public.finance_chat_messages
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.finance_chat_sessions WHERE id = finance_chat_messages.session_id AND user_id = auth.uid()
  ));
