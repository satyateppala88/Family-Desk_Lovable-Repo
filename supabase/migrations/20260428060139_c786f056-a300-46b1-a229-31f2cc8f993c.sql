CREATE OR REPLACE FUNCTION public.update_completed_tour(_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.profiles
  SET completed_tours = COALESCE(completed_tours, '{}'::jsonb)
                        || jsonb_build_object(_key, to_jsonb(now()))
  WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.update_completed_tour(text) FROM public;
GRANT EXECUTE ON FUNCTION public.update_completed_tour(text) TO authenticated;