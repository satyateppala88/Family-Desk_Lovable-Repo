-- Drop the problematic policy that references auth.users directly
DROP POLICY IF EXISTS "Users can view their own request" ON access_requests;

-- Recreate with proper JWT-based email check only
CREATE POLICY "Users can view their own request"
ON access_requests
FOR SELECT
TO anon, authenticated
USING (
  email = coalesce(
    current_setting('request.jwt.claims', true)::json->>'email',
    ''
  )
);

-- Add platform_admin role to your user so you can access the admin page
INSERT INTO user_roles (user_id, role, household_id)
VALUES (
  '9e4a5289-346c-4d5d-9d81-92850160a9ef',
  'platform_admin',
  'e59af5ec-b2bf-445b-8674-b94d70eb83be'
)
ON CONFLICT (user_id, household_id, role) DO NOTHING;