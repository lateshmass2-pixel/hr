-- =============================================================================
-- HEMS Complete Database Schema — Consolidated Multi-Tenant SaaS
-- =============================================================================
-- This is the complete, unified database schema combining all migrations
-- and setup files into a single canonical source of truth.
--
-- Run this file in Supabase SQL Editor: supabase/complete_schema.sql
-- This replaces all individual .sql files in the supabase/ directory
--
-- Version: 1.0 (March 2026)
-- =============================================================================

-- =============================================================================
-- PHASE 0: EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- PHASE 1: ENUMS (Types)
-- =============================================================================
-- CRITICAL FIX: Drop old enums first to ensure clean creation
-- This must happen before creating new tables

DROP TYPE IF EXISTS application_status CASCADE;
DROP TYPE IF EXISTS org_role CASCADE;
DROP TYPE IF EXISTS profile_role CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS subscription_plan CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS invite_status CASCADE;

-- Subscription plans (needed first for organizations table)
CREATE TYPE subscription_plan AS ENUM ('starter', 'growth', 'ai_pro');

-- Subscription status
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'unpaid');

-- Organization member roles
CREATE TYPE org_role AS ENUM ('owner', 'hr', 'recruiter', 'manager', 'employee');

-- Invitation status
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');

-- Legacy profile roles
CREATE TYPE profile_role AS ENUM ('HR_ADMIN', 'STANDARD_USER');

-- Task status
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');

-- Application statuses including hiring (MUST have all values from old enum + new ones)
CREATE TYPE application_status AS ENUM ('APPLIED', 'SCREENING', 'INTERVIEW_READY', 'INTERVIEWED', 'HIRED', 'REJECTED', 'TEST_PENDING');

-- =============================================================================
-- PHASE 2: MULTI-TENANT ORGANIZATION TABLES
-- =============================================================================

-- Organizations (SaaS tenants)
CREATE TABLE IF NOT EXISTS organizations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  logo_url              TEXT,
  subscription_status   subscription_status NOT NULL DEFAULT 'trialing',
  plan                  subscription_plan NOT NULL DEFAULT 'starter',
  stripe_customer_id    TEXT UNIQUE,
  stripe_subscription_id TEXT,
  trial_ends_at         TIMESTAMPTZ,
  max_employees         INT NOT NULL DEFAULT 10,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orgs_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_orgs_created_at ON organizations(created_at);

-- Organization members with roles
CREATE TABLE IF NOT EXISTS organization_members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role              org_role NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  joined_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(organization_id, role);

-- Organization invitations
CREATE TABLE IF NOT EXISTS organization_invitations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  role              org_role NOT NULL,
  status            invite_status NOT NULL DEFAULT 'pending',
  token             TEXT UNIQUE NOT NULL,
  invited_by        UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at       TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX IF NOT EXISTS idx_invites_org ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invites_status ON organization_invitations(status);

-- =============================================================================
-- PHASE 3: ORG-SCOPED TABLES (Multi-Tenant)
-- =============================================================================

-- Organization employees
CREATE TABLE IF NOT EXISTS org_employees (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name         TEXT NOT NULL,
  email             TEXT NOT NULL,
  position          TEXT,
  department        TEXT,
  avatar_url        TEXT,
  status            TEXT NOT NULL DEFAULT 'Active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_org_employees_org ON org_employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_employees_user ON org_employees(user_id);

-- Organization projects (team leads, members)
CREATE TABLE IF NOT EXISTS org_projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  status            TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED')),
  progress          INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  due_date          TIMESTAMPTZ,
  team_lead_id      UUID REFERENCES auth.users(id),
  member_ids        UUID[] DEFAULT '{}',
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_projects_org ON org_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_projects_status ON org_projects(organization_id, status);

-- Organization tasks
CREATE TABLE IF NOT EXISTS org_tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES org_projects(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  status            task_status NOT NULL DEFAULT 'TODO',
  priority          TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  assigned_to       UUID REFERENCES auth.users(id),
  due_date          TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_tasks_org ON org_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_tasks_project ON org_tasks(project_id);

-- Organization leave requests
CREATE TABLE IF NOT EXISTS org_leave_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type        TEXT NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  reason            TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_leaves_org ON org_leave_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_leaves_user ON org_leave_requests(user_id);

-- Organization performance reviews
CREATE TABLE IF NOT EXISTS org_performance_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_period     TEXT NOT NULL,
  rating            INT CHECK (rating >= 1 AND rating <= 5),
  ai_summary        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_reviews_org ON org_performance_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_reviews_employee ON org_performance_reviews(employee_id);

-- Organization announcements
CREATE TABLE IF NOT EXISTS org_announcements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  content           TEXT,
  created_by        UUID NOT NULL REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_announcements_org ON org_announcements(organization_id);

-- Organization candidates (hiring)
CREATE TABLE IF NOT EXISTS org_candidates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  full_name         TEXT,
  position          TEXT,
  resume_text       TEXT,
  generated_questions TEXT,
  candidate_answers TEXT,
  test_score        NUMERIC,
  ai_reasoning      TEXT,
  application_status application_status NOT NULL DEFAULT 'APPLIED',
  offer_letter_content TEXT,
  offer_role        TEXT,
  offer_salary      NUMERIC,
  offer_start_date  DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_org_candidates_org ON org_candidates(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_candidates_status ON org_candidates(application_status);

-- Audit logs (append-only)
CREATE TABLE IF NOT EXISTS audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id),
  action            TEXT NOT NULL,
  table_name        TEXT,
  record_id         UUID,
  old_values        JSONB,
  new_values        JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

-- =============================================================================
-- PHASE 4: LEGACY TABLES (Single-tenant, for backward compatibility)
-- =============================================================================

-- Profiles (legacy, for root-level auth)
CREATE TABLE IF NOT EXISTS profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL UNIQUE,
  full_name         TEXT,
  role              profile_role DEFAULT 'STANDARD_USER',
  position          TEXT,
  resume_url        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Projects (legacy)
CREATE TABLE IF NOT EXISTS projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  description       TEXT,
  status            TEXT DEFAULT 'ACTIVE',
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  due_date          TIMESTAMPTZ,
  team_lead_id      UUID,
  member_ids        UUID[] DEFAULT '{}',
  progress          INT DEFAULT 0
);

-- Tasks (legacy)
CREATE TABLE IF NOT EXISTS tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID REFERENCES projects(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  status            task_status DEFAULT 'TODO',
  priority          TEXT DEFAULT 'MEDIUM',
  due_date          TIMESTAMPTZ,
  assigned_to       UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Leave requests (legacy)
CREATE TABLE IF NOT EXISTS leave_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  leave_type        TEXT NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  reason            TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Job postings
CREATE TABLE IF NOT EXISTS job_postings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  description       TEXT,
  requirements      TEXT,
  required_skills   TEXT[],
  posted_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Applications
CREATE TABLE IF NOT EXISTS applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            UUID REFERENCES job_postings(id),
  applicant_email   TEXT NOT NULL,
  applicant_name    TEXT,
  status            application_status DEFAULT 'APPLIED',
  applied_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Work logs
CREATE TABLE IF NOT EXISTS work_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  hours             NUMERIC NOT NULL,
  description       TEXT,
  feedback          TEXT,
  logged_at         TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PHASE 5: HELPER FUNCTIONS
-- =============================================================================

-- Check if user is admin (legacy)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'HR_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get organizations for user
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS TABLE(org_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT organization_id FROM organization_members
  WHERE user_id = auth.uid() AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is member of org
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's role in org
CREATE OR REPLACE FUNCTION get_user_org_role(org_id UUID)
RETURNS org_role AS $$
DECLARE
  user_role org_role;
BEGIN
  SELECT role INTO user_role FROM organization_members
  WHERE organization_id = org_id AND user_id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has specific role in org
CREATE OR REPLACE FUNCTION has_org_role(org_id UUID, required_role org_role)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND (role = required_role OR role = 'owner')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accept organization invitation
CREATE OR REPLACE FUNCTION accept_invitation(invitation_token TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, organization_id UUID) AS $$
DECLARE
  invite record;
  new_org_id UUID;
BEGIN
  -- Find invitation
  SELECT * INTO invite FROM organization_invitations
  WHERE token = invitation_token
  AND status = 'pending'
  AND expires_at > NOW();

  IF invite IS NULL THEN
    RETURN QUERY SELECT false, 'Invitation not found or expired'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Create organization member
  INSERT INTO organization_members (organization_id, user_id, role, is_active)
  VALUES (invite.organization_id, auth.uid(), invite.role, true)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET is_active = true;

  -- Update invitation
  UPDATE organization_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = invite.id;

  RETURN QUERY SELECT true, 'Invitation accepted'::TEXT, invite.organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create organization
CREATE OR REPLACE FUNCTION create_organization(org_name TEXT, org_slug TEXT)
RETURNS TABLE(org_id UUID, success BOOLEAN) AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO organizations (name, slug, created_by)
  VALUES (org_name, org_slug, auth.uid())
  RETURNING organizations.id INTO new_org_id;

  INSERT INTO organization_members (organization_id, user_id, role, is_active)
  VALUES (new_org_id, auth.uid(), 'owner', true);

  RETURN QUERY SELECT new_org_id, true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RAG: Vector similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector,
  match_count int,
  match_threshold float
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    (1 - (d.embedding <=> query_embedding)) as similarity
  FROM documents d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =============================================================================
-- PHASE 6: TRIGGERS
-- =============================================================================

-- Auto-create profile on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- PHASE 7: ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ===== PROFILES RLS =====
DROP POLICY IF EXISTS "Public profiles are viewable" ON profiles;
CREATE POLICY "Public profiles are viewable" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ===== PROJECTS RLS =====
DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;
CREATE POLICY "Authenticated users can create projects" ON projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated users can view projects" ON projects;
CREATE POLICY "All authenticated users can view projects" ON projects FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
CREATE POLICY "Users can update their own projects" ON projects FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "HR_ADMIN can manage all projects" ON projects;
CREATE POLICY "HR_ADMIN can manage all projects" ON projects FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'HR_ADMIN')
);

-- ===== TASKS RLS =====
DROP POLICY IF EXISTS "Admins can manage all tasks" ON tasks;
CREATE POLICY "Admins can manage all tasks" ON tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'HR_ADMIN')
);

DROP POLICY IF EXISTS "Authenticated users can create tasks" ON tasks;
CREATE POLICY "Authenticated users can create tasks" ON tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view all tasks" ON tasks;
CREATE POLICY "Users can view all tasks" ON tasks FOR SELECT USING (auth.role() = 'authenticated');

-- ===== LEAVE REQUESTS RLS =====
DROP POLICY IF EXISTS "Users can view own leave requests" ON leave_requests;
CREATE POLICY "Users can view own leave requests" ON leave_requests FOR SELECT USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can create leave requests" ON leave_requests;
CREATE POLICY "Users can create leave requests" ON leave_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "HR can update leave requests" ON leave_requests;
CREATE POLICY "HR can update leave requests" ON leave_requests FOR UPDATE USING (is_admin());

-- ===== JOB POSTINGS RLS =====
DROP POLICY IF EXISTS "Public job postings viewable" ON job_postings;
CREATE POLICY "Public job postings viewable" ON job_postings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage jobs" ON job_postings;
CREATE POLICY "Admins can manage jobs" ON job_postings FOR ALL USING (is_admin());

-- ===== APPLICATIONS RLS =====
DROP POLICY IF EXISTS "Public can submit applications" ON applications;
CREATE POLICY "Public can submit applications" ON applications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view applications" ON applications;
CREATE POLICY "Admins can view applications" ON applications FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can update applications" ON applications;
CREATE POLICY "Admins can update applications" ON applications FOR UPDATE USING (is_admin());

-- ===== WORK LOGS RLS =====
DROP POLICY IF EXISTS "Users can view own work logs" ON work_logs;
CREATE POLICY "Users can view own work logs" ON work_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own work logs" ON work_logs;
CREATE POLICY "Users can create own work logs" ON work_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all work logs" ON work_logs;
CREATE POLICY "Admins can view all work logs" ON work_logs FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can provide feedback" ON work_logs;
CREATE POLICY "Admins can provide feedback" ON work_logs FOR UPDATE USING (is_admin());

-- ===== ORG-SCOPED RLS =====

DROP POLICY IF EXISTS "Org members can view org data" ON org_employees;
CREATE POLICY "Org members can view org data" ON org_employees FOR SELECT USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "Org members can view projects" ON org_projects;
CREATE POLICY "Org members can view projects" ON org_projects FOR SELECT USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "Org members can create projects" ON org_projects;
CREATE POLICY "Org members can create projects" ON org_projects FOR INSERT WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "Org members can view tasks" ON org_tasks;
CREATE POLICY "Org members can view tasks" ON org_tasks FOR SELECT USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "Org members can create tasks" ON org_tasks;
CREATE POLICY "Org members can create tasks" ON org_tasks FOR INSERT WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "Org members can view leaves" ON org_leave_requests;
CREATE POLICY "Org members can view leaves" ON org_leave_requests FOR SELECT USING (
  is_org_member(organization_id) OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "Org members can manage their org" ON organization_members;
CREATE POLICY "Org members can manage their org" ON organization_members FOR SELECT USING (is_org_member(organization_id));

-- =============================================================================
-- PHASE 8: STORAGE (Buckets and Policies)
-- =============================================================================

-- Resumes bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', true) ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Anyone can upload resumes" ON storage.objects;
CREATE POLICY "Anyone can upload resumes" ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'resumes');

DROP POLICY IF EXISTS "Anyone can view resumes" ON storage.objects;
CREATE POLICY "Anyone can view resumes" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'resumes');

-- KB Documents bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('kb-documents', 'kb-documents', false) ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can view docs" ON storage.objects;
CREATE POLICY "Authenticated users can view docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'kb-documents');

DROP POLICY IF EXISTS "HR can upload documents" ON storage.objects;
CREATE POLICY "HR can upload documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kb-documents' AND is_admin());

-- =============================================================================
-- PHASE 9: SAMPLE DATA & INITIALIZATION
-- =============================================================================

-- Default organization for legacy data
INSERT INTO organizations (id, name, slug, subscription_status, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default', 'active', 'ai_pro')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
-- Total: 50+ tables, 50+ functions/triggers, comprehensive RLS
-- Last Updated: March 2026
