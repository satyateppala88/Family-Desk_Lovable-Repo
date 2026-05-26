CREATE TABLE public.manual_calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_manual_calendar_events_household_start
  ON public.manual_calendar_events (household_id, start_at);

ALTER TABLE public.manual_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view household manual events"
  ON public.manual_calendar_events
  FOR SELECT
  TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can insert household manual events"
  ON public.manual_calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_household_member(auth.uid(), household_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "Members can update household manual events"
  ON public.manual_calendar_events
  FOR UPDATE
  TO authenticated
  USING (public.is_household_member(auth.uid(), household_id))
  WITH CHECK (public.is_household_member(auth.uid(), household_id));

CREATE POLICY "Members can delete household manual events"
  ON public.manual_calendar_events
  FOR DELETE
  TO authenticated
  USING (public.is_household_member(auth.uid(), household_id));

CREATE TRIGGER update_manual_calendar_events_updated_at
  BEFORE UPDATE ON public.manual_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();