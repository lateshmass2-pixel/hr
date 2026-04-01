-- =============================================================================
-- CLEANUP: Drop old schema to prepare for complete_schema.sql deployment
-- =============================================================================
-- Run this BEFORE complete_schema.sql to remove conflicting old tables & enums
-- All data will be deleted - backup first if needed!
-- =============================================================================

-- Drop old tables in reverse dependency order
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS org_candidates CASCADE;
DROP TABLE IF EXISTS org_announcements CASCADE;
DROP TABLE IF EXISTS org_performance_reviews CASCADE;
DROP TABLE IF EXISTS org_leave_requests CASCADE;
DROP TABLE IF EXISTS org_tasks CASCADE;
DROP TABLE IF EXISTS org_projects CASCADE;
DROP TABLE IF EXISTS org_employees CASCADE;
DROP TABLE IF EXISTS organization_invitations CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

DROP TABLE IF EXISTS work_logs CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS job_postings CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop old triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop old helper functions
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS get_user_org_ids() CASCADE;
DROP FUNCTION IF EXISTS is_org_member(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_org_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS has_org_role(UUID, org_role) CASCADE;
DROP FUNCTION IF EXISTS accept_invitation(TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_organization(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS match_documents(vector, int, float) CASCADE;

-- CRITICAL: Drop old conflicting enums that have wrong values
-- These MUST be dropped before creating new ones with different values
DROP TYPE IF EXISTS application_status CASCADE;
DROP TYPE IF EXISTS org_role CASCADE;
DROP TYPE IF EXISTS profile_role CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS subscription_plan CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS invite_status CASCADE;

-- =============================================================================
-- WARNING: All tables, functions, and enums are now gone!
-- Run complete_schema.sql next to rebuild with correct schema.
-- =============================================================================
