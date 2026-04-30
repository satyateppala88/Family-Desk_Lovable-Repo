
DROP POLICY "Users can view invitations by email" ON household_invitations;

CREATE POLICY "Users can view invitations by email"
  ON household_invitations
  FOR SELECT
  USING (
    invitee_email = (auth.jwt() ->> 'email')::text
  );
