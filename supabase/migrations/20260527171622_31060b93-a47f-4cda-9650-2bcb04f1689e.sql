CREATE TABLE public.user_finance_pin (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_salt TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_finance_pin TO authenticated;
GRANT ALL ON public.user_finance_pin TO service_role;

ALTER TABLE public.user_finance_pin ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own finance pin"
  ON public.user_finance_pin FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own finance pin"
  ON public.user_finance_pin FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own finance pin"
  ON public.user_finance_pin FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own finance pin"
  ON public.user_finance_pin FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_finance_pin_updated_at
  BEFORE UPDATE ON public.user_finance_pin
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();