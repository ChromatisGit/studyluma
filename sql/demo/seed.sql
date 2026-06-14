-- Demo seed data for the studyluma.org demo deployment.
-- Add INSERT statements here to showcase additional features.

-- Demo users (PIN hash unused — demo login bypasses PIN verification)
INSERT INTO users (id, role, group_key, username, pin_hash, enabled)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', NULL,    'demo-teacher', 'demo-no-auth', TRUE),
  ('00000000-0000-0000-0000-000000000002', 'user',  'demo',  'demo-student', 'demo-no-auth', TRUE)
ON CONFLICT (username) DO UPDATE SET
  role      = EXCLUDED.role,
  group_key = EXCLUDED.group_key,
  enabled   = EXCLUDED.enabled;

-- Enroll demo-student in demo-math
SELECT enroll_user_in_course('00000000-0000-0000-0000-000000000002', 'demo-math');
