
-- Revoke EXECUTE on internal helper functions from anon/authenticated/public
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_household_member_emails(uuid) FROM PUBLIC, anon;

-- Add restrictive deny policies so anon/authenticated can NEVER read verification tokens,
-- even if a future permissive policy is accidentally added.
CREATE POLICY "Deny all anon access to email tokens"
  ON public.email_verification_tokens
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny all anon access to phone tokens"
  ON public.phone_verification_tokens
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
