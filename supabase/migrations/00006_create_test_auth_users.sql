-- ==============================================================================
-- JobPilot Phase 2C-2 Migration 00006: Seed Integration Test Auth Users
-- ==============================================================================

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'test_user_a@jobpilot.internal',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(), NOW(), '', '', '', ''
), (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-2222-2222-222222222222',
  'authenticated',
  'authenticated',
  'test_user_b@jobpilot.internal',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(), NOW(), '', '', '', ''
) ON CONFLICT (id) DO NOTHING;
