
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id, 'authenticated', 'authenticated',
    'tester2@familydesk.in',
    crypt('TestPass123!', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Tester Two"}'::jsonb,
    false, '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', 'tester2@familydesk.in'),
    'email', new_user_id::text, now(), now(), now()
  );

  INSERT INTO public.access_requests (email, full_name, status)
  VALUES ('tester2@familydesk.in', 'Tester Two', 'approved')
  ON CONFLICT (email) DO UPDATE SET status = 'approved';
END $$;
