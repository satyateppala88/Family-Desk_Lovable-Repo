ALTER TABLE public.household_invitations
  ADD COLUMN IF NOT EXISTS household_name text;

UPDATE public.household_invitations hi
SET household_name = h.name
FROM public.households h
WHERE hi.household_id = h.id
  AND (hi.household_name IS NULL OR hi.household_name = '');

CREATE OR REPLACE FUNCTION public.set_household_invitation_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.household_id IS NOT NULL
     AND (NEW.household_name IS NULL OR NEW.household_name = '' OR
          (TG_OP = 'UPDATE' AND NEW.household_id IS DISTINCT FROM OLD.household_id))
  THEN
    SELECT name INTO NEW.household_name
    FROM public.households
    WHERE id = NEW.household_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_household_invitation_name ON public.household_invitations;
CREATE TRIGGER trg_set_household_invitation_name
  BEFORE INSERT OR UPDATE OF household_id, household_name
  ON public.household_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_household_invitation_name();