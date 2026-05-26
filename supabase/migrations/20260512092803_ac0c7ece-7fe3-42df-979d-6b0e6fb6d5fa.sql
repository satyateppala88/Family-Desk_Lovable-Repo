
-- Create a fresh test user in the Test environment
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Remove any prior copy
  DELETE FROM auth.users WHERE email = 'tester@familydesk.in';

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'tester@familydesk.in',
    crypt('TestPass123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Test User"}'::jsonb,
    now(), now(), '', '', '', ''
  );

  -- Approve email so app gates allow login
  INSERT INTO public.access_requests (email, status, full_name)
  VALUES ('tester@familydesk.in', 'approved', 'Test User')
  ON CONFLICT (email) DO UPDATE SET status = 'approved';
END $$;
