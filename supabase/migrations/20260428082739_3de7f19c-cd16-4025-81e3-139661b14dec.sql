-- update_completed_tour writes only to the caller's own profile row, which
-- is already permitted by the "Users can update their own profile" RLS
-- policy on public.profiles. Run it as SECURITY INVOKER so the linter no
-- longer flags it as an elevated-privilege surface.
CREATE OR REPLACE FUNCTION public.update_completed_tour(_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
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

REVOKE ALL ON FUNCTION public.update_completed_tour(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_completed_tour(text) TO authenticated;