CREATE TABLE public.finance_custom_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'all',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT finance_custom_categories_scope_check CHECK (scope IN ('transaction', 'subscription', 'all')),
  CONSTRAINT finance_custom_categories_unique UNIQUE (household_id, key, scope)
);

ALTER TABLE public.finance_custom_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view household custom categories"
ON public.finance_custom_categories FOR SELECT
USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert household custom categories"
ON public.finance_custom_categories FOR INSERT
WITH CHECK (public.is_household_member(auth.uid(), household_id) AND created_by = auth.uid());

CREATE POLICY "Members can update household custom categories"
ON public.finance_custom_categories FOR UPDATE
USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete household custom categories"
ON public.finance_custom_categories FOR DELETE
USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER update_finance_custom_categories_updated_at
BEFORE UPDATE ON public.finance_custom_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_finance_custom_categories_household ON public.finance_custom_categories(household_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_custom_categories;