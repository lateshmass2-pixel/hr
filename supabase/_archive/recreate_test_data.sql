-- =============================================================================
-- RECREATE TEST PROFILES & ORGANIZATION DATA
-- =============================================================================
-- Run this after complete_schema.sql to restore test data
-- =============================================================================

-- 1. Create default organization
INSERT INTO organizations (id, name, slug, subscription_status, plan, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Company', 'test-company', 'active', 'ai_pro', NOW())
ON CONFLICT DO NOTHING;

-- 2. Create test profiles for existing auth users
-- These match the test employees we created before
INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', 'Test User'),
  (CASE 
    WHEN email = 'sarah@hems.com' THEN 'HR_ADMIN'
    ELSE 'STANDARD_USER'
  END)::profile_role as role,
  NOW(),
  NOW()
FROM auth.users
WHERE email IN ('sarah@hems.com', 'mike@hems.com', 'emma@hems.com', 'david@hems.com')
ON CONFLICT (id) DO NOTHING;

-- 3. Add auth users to organization with appropriate roles
INSERT INTO organization_members (organization_id, user_id, role, is_active, joined_at)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  id,
  CASE 
    WHEN email = 'sarah@hems.com' THEN 'hr'::org_role
    ELSE 'employee'::org_role
  END as role,
  true,
  NOW()
FROM auth.users
WHERE email IN ('sarah@hems.com', 'mike@hems.com', 'emma@hems.com', 'david@hems.com')
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- 4. Create org_employees records
INSERT INTO org_employees (organization_id, user_id, full_name, email, position, department, status, created_at, updated_at)
SELECT
  '00000000-0000-0000-0000-000000000001',
  id,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  email,
  CASE 
    WHEN email = 'sarah@hems.com' THEN 'HR Manager'
    WHEN email = 'mike@hems.com' THEN 'Developer'
    WHEN email = 'emma@hems.com' THEN 'Designer'
    WHEN email = 'david@hems.com' THEN 'Product Manager'
  END as position,
  'Engineering',
  'Active',
  NOW(),
  NOW()
FROM auth.users
WHERE email IN ('sarah@hems.com', 'mike@hems.com', 'emma@hems.com', 'david@hems.com')
ON CONFLICT (organization_id, email) DO NOTHING;

-- 5. Create a test project
INSERT INTO projects (id, title, description, status, created_by, created_at, due_date, team_lead_id, member_ids, progress)
SELECT
  gen_random_uuid(),
  'Marketing Campaign',
  'Q2 marketing campaign for brand awareness',
  'ACTIVE',
  (SELECT id FROM auth.users WHERE email = 'sarah@hems.com' LIMIT 1),
  NOW(),
  NOW() + INTERVAL '30 days',
  (SELECT id FROM auth.users WHERE email = 'sarah@hems.com' LIMIT 1),
  ARRAY(SELECT id FROM auth.users WHERE email IN ('sarah@hems.com', 'mike@hems.com', 'emma@hems.com', 'david@hems.com') ORDER BY email),
  0
ON CONFLICT DO NOTHING;

-- =============================================================================
-- VERIFICATION QUERIES (uncomment to check results)
-- =============================================================================

-- SELECT 'Total Profiles:' as check_type, COUNT(*) as count FROM profiles UNION ALL
-- SELECT 'Total Users in Org:', COUNT(*) FROM organization_members WHERE organization_id = '00000000-0000-0000-0000-000000000001' UNION ALL
-- SELECT 'Total Org Employees:', COUNT(*) FROM org_employees WHERE organization_id = '00000000-0000-0000-0000-000000000001' UNION ALL
-- SELECT 'Total Projects:', COUNT(*) FROM projects;

-- SELECT 'Auth Users:', COUNT(*) FROM auth.users WHERE email IN ('sarah@hems.com', 'mike@hems.com', 'emma@hems.com', 'david@hems.com');

COMMIT;

-- =============================================================================
-- SUCCESS: Test data restored
-- Test credentials:
-- - sarah@hems.com (HR_ADMIN, password123)
-- - mike@hems.com (EMPLOYEE, password123)
-- - emma@hems.com (EMPLOYEE, password123)
-- - david@hems.com (EMPLOYEE, password123)
-- =============================================================================
