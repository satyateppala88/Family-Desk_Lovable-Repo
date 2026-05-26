CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (user_id, function_name, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_log_lookup
  ON public.rate_limit_log (user_id, function_name, window_start);

ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.rate_limit_log
  USING (false);

CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_user_id UUID,
  p_function_name TEXT,
  p_window_start TIMESTAMPTZ,
  p_max_requests INTEGER
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.rate_limit_log (user_id, function_name, window_start, request_count)
  VALUES (p_user_id, p_function_name, p_window_start, 1)
  ON CONFLICT (user_id, function_name, window_start)
  DO UPDATE SET request_count = public.rate_limit_log.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN json_build_object(
    'allowed', v_count <= p_max_requests,
    'remaining', GREATEST(0, p_max_requests - v_count)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_rate_limit(UUID, TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon, authenticated;