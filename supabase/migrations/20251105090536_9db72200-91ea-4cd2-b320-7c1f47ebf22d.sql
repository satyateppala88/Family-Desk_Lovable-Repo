-- Add unique 6-digit invite code to households
ALTER TABLE households ADD COLUMN IF NOT EXISTS invite_code VARCHAR(6) UNIQUE;

-- Generate unique 6-digit code function
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  code VARCHAR(6);
  exists BOOLEAN;
BEGIN
  LOOP
    code := LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM households WHERE invite_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate code on household creation
CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_household_invite_code ON households;
CREATE TRIGGER set_household_invite_code
  BEFORE INSERT ON households
  FOR EACH ROW
  EXECUTE FUNCTION set_invite_code();

-- Backfill existing households with invite codes
UPDATE households SET invite_code = generate_invite_code() WHERE invite_code IS NULL;

-- Create household invitations table
CREATE TABLE IF NOT EXISTS household_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  invitee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invitee_name TEXT,
  requested_role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(household_id, invitee_user_id)
);

-- Enable RLS
ALTER TABLE household_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view household invitations"
ON household_invitations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = household_invitations.household_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can request to join households"
ON household_invitations FOR INSERT
WITH CHECK (invitee_user_id = auth.uid());

CREATE POLICY "Admins can update invitations"
ON household_invitations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = household_invitations.household_id
    AND user_id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "Users can view their own invitation requests"
ON household_invitations FOR SELECT
USING (invitee_user_id = auth.uid());