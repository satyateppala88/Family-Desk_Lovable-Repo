-- Add invitation_type column to distinguish join requests from admin invites
ALTER TABLE household_invitations 
ADD COLUMN IF NOT EXISTS invitation_type text NOT NULL DEFAULT 'join_request' 
CHECK (invitation_type IN ('join_request', 'admin_invite'));

-- Add invited_by column for tracking who sent admin invites
ALTER TABLE household_invitations 
ADD COLUMN IF NOT EXISTS invited_by uuid;

-- Make invitee_user_id nullable for email-only invites (when user hasn't signed up yet)
ALTER TABLE household_invitations 
ALTER COLUMN invitee_user_id DROP NOT NULL;

-- Add RLS policy for admins to insert invitations
CREATE POLICY "Admins can create invitations" ON household_invitations
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM household_members
    WHERE household_members.household_id = household_invitations.household_id
    AND household_members.user_id = auth.uid()
    AND household_members.role = 'admin'
  )
);

-- Update existing SELECT policy to also allow users to see invitations sent to their email
CREATE POLICY "Users can view invitations by email" ON household_invitations
FOR SELECT USING (
  invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);