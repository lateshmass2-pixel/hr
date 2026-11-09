-- =============================================================================
-- AGGRESSIVE CLEANUP: Force drop all enums with CASCADE
-- =============================================================================
-- Run this if the standard cleanup didn't work
-- This uses more aggressive CASCADE and forces enum recreation
-- =============================================================================

-- First, disable any constraints that might prevent drops
ALTER TABLE IF EXISTS org_candidates DROP CONSTRAINT IF EXISTS org_candidates_application_status_check CASCADE;
ALTER TABLE IF EXISTS applications DROP CONSTRAINT IF EXISTS applications_application_status_check CASCADE;

-- Force drop tables using the problematic enums
DROP TABLE IF EXISTS org_candidates CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS org_tasks CASCADE;
DROP TABLE IF EXISTS org_leave_requests CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS work_logs CASCADE;
-- ... rest of cascade cleanup ...
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS org_announcements CASCADE;
DROP TABLE IF EXISTS org_performance_reviews CASCADE;
DROP TABLE IF EXISTS org_projects CASCADE;
DROP TABLE IF EXISTS org_employees CASCADE;
DROP TABLE IF EXISTS organization_invitations CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS job_postings CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS work_logs CASCADE;

-- Drop BOTH old and new functions to ensure no dependencies
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS get_user_org_ids() CASCADE;
DROP FUNCTION IF EXISTS is_org_member(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_org_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS has_org_role(UUID, org_role) CASCADE;
DROP FUNCTION IF EXISTS accept_invitation(TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_organization(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS match_documents(vector, int, float) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- CRITICAL: Force drop ALL enums - be aggressive here
DROP TYPE IF EXISTS application_status CASCADE;
DROP TYPE IF EXISTS org_role CASCADE;
DROP TYPE IF EXISTS profile_role CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS subscription_plan CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS invite_status CASCADE;

-- Alternative: If DROP TYPE still fails, try ALTER TYPE to add missing values
-- Uncomment if needed:
-- DO $$ BEGIN
--   ALTER TYPE application_status ADD VALUE 'APPLIED' BEFORE 'SCREENING';
-- EXCEPTION WHEN OTHERS THEN
--   RAISE NOTICE 'Could not alter application_status: %', SQLERRM;
-- END $$;

COMMIT;

-- =============================================================================
-- SUCCESS: All problematic objects removed
-- Now run complete_schema.sql which will create everything fresh
-- =============================================================================
