-- =============================================================================
-- HEMS SaaS Foundation — Phase 1 Migration
-- Run this ONCE in Supabase SQL Editor (or via `supabase db push`)
-- =============================================================================
-- IMPORTANT: This migration is ADDITIVE. It does NOT drop existing tables.
-- Existing single-org data will be migrated separately (see 002_backfill.sql).
-- =============================================================================

-- 0. Extensions
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

-- Organization member roles
DO $$ BEGIN
  CREATE TYPE org_role AS ENUM ('owner', 'hr', 'recruiter', 'manager', 'employee');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Subscription plans
DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM ('starter', 'growth', 'ai_pro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Subscription status
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'unpaid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Invite status
DO $$ BEGIN
  CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 2. ORGANIZATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  logo_url        TEXT,
  domain          TEXT,                          -- e.g. "acme.com" for SSO later

  -- Subscription & Billing
  plan            subscription_plan NOT NULL DEFAULT 'starter',
  subscription_status subscription_status NOT NULL DEFAULT 'trialing',
  stripe_customer_id  TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  current_period_end   TIMESTAMPTZ,
  trial_ends_at        TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  max_employees        INT NOT NULL DEFAULT 25,  -- plan-based limit

  -- Metadata
  settings        JSONB DEFAULT '{}'::jsonb,     -- org-level settings
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON organizations(stripe_customer_id);

-- =============================================================================
-- 3. ORGANIZATION MEMBERS (join table: auth.users <-> organizations)
-- =============================================================================

CREATE TABLE IF NOT EXISTS organization_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            org_role NOT NULL DEFAULT 'employee',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(organization_id, role);

-- =============================================================================
-- 4. ORGANIZATION INVITATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS organization_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  role            org_role NOT NULL DEFAULT 'employee',
  token           TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by      UUID NOT NULL REFERENCES auth.users(id),
  status          invite_status NOT NULL DEFAULT 'pending',
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate pending invites for same email in same org
  CONSTRAINT unique_pending_invite UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON organization_invitations(organization_id);

-- =============================================================================
-- 5. EMPLOYEES (org-scoped — replaces single-org profiles for employee data)
-- =============================================================================

CREATE TABLE IF NOT EXISTS org_employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- linked auth user
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  position        TEXT,
  department      TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  date_of_joining DATE,
  salary          NUMERIC(12,2),                 -- encrypted at app layer
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'onboarding', 'terminated')),
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_org_employees_org ON org_employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_employees_user ON org_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_org_employees_dept ON org_employees(organization_id, department);
CREATE INDEX IF NOT EXISTS idx_org_employees_status ON org_employees(organization_id, status);

-- =============================================================================
-- 6. CANDIDATES (org-scoped hiring pipeline)
-- =============================================================================

CREATE TABLE IF NOT EXISTS org_candidates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_posting_id  UUID,                          -- FK to org_job_postings if needed
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  resume_url      TEXT,
  resume_text     TEXT,
  score           INT CHECK (score >= 0 AND score <= 100),
  stage           TEXT NOT NULL DEFAULT 'applied'
                  CHECK (stage IN ('applied','screening','interview','offer','hired','rejected')),
  generated_questions JSONB,
  candidate_answers   JSONB,
  test_score      INT,
  ai_reasoning    TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_candidates_org ON org_candidates(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_candidates_stage ON org_candidates(organization_id, stage);

-- =============================================================================
-- 7. PROJECTS (org-scoped)
-- =============================================================================

CREATE TABLE IF NOT EXISTS org_projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED')),
  progress        INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  due_date        TIMESTAMPTZ,
  team_lead_id    UUID REFERENCES auth.users(id),
  member_ids      UUID[] DEFAULT '{}',
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_projects_org ON org_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_projects_status ON org_projects(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_org_projects_lead ON org_projects(team_lead_id);

-- =============================================================================
-- 8. TASKS (org-scoped)
-- =============================================================================

CREATE TABLE IF NOT EXISTS org_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES org_projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'TODO'
                  CHECK (status IN ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE')),
  priority        TEXT NOT NULL DEFAULT 'MEDIUM'
                  CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  assignee_id     UUID REFERENCES auth.users(id),
  due_date        TIMESTAMPTZ,
  proof_url       TEXT,
  verification_status TEXT DEFAULT 'none'
                  CHECK (verification_status IN ('none','pending','verified','rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_tasks_org ON org_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_tasks_project ON org_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_org_tasks_assignee ON org_tasks(assignee_id);

-- =============================================================================
-- 9. PAYROLL RECORDS (org-scoped)
-- =============================================================================

CREATE TABLE IF NOT EXISTS org_payroll_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES org_employees(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end   DATE NOT NULL,
  base_salary     NUMERIC(12,2) NOT NULL,
  deductions      NUMERIC(12,2) DEFAULT 0,
  bonuses         NUMERIC(12,2) DEFAULT 0,
  net_pay         NUMERIC(12,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'INR',
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','approved','paid','cancelled')),
  paid_at         TIMESTAMPTZ,
  processed_by    UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_pay_period CHECK (pay_period_end > pay_period_start)
);

CREATE INDEX IF NOT EXISTS idx_org_payroll_org ON org_payroll_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_payroll_employee ON org_payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_org_payroll_period ON org_payroll_records(pay_period_start, pay_period_end);

-- =============================================================================
-- 10. LEAVE REQUESTS (org-scoped)
-- =============================================================================

CREATE TABLE IF NOT EXISTS org_leave_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type      TEXT NOT NULL CHECK (leave_type IN ('annual','sick','personal','maternity','paternity','unpaid')),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by     UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_leave_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_org_leave_org ON org_leave_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_leave_user ON org_leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_org_leave_status ON org_leave_requests(organization_id, status);

-- =============================================================================
-- 11. PERFORMANCE REVIEWS (org-scoped)
-- =============================================================================

CREATE TABLE IF NOT EXISTS org_performance_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES org_employees(id) ON DELETE CASCADE,
  reviewer_id     UUID REFERENCES auth.users(id),
  review_period   TEXT NOT NULL,
  rating          NUMERIC(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  strengths       TEXT,
  improvements    TEXT,
  ai_summary      TEXT,
  goals           JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_reviews_org ON org_performance_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_reviews_employee ON org_performance_reviews(employee_id);

-- =============================================================================
-- 12. ANNOUNCEMENTS (org-scoped)
-- =============================================================================

CREATE TABLE IF NOT EXISTS org_announcements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  priority        TEXT NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('high','normal','low')),
  created_by      UUID REFERENCES auth.users(id),
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_announcements_org ON org_announcements(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_announcements_created ON org_announcements(organization_id, created_at DESC);

-- =============================================================================
-- 13. LEARNING MODULES (org-scoped)
-- =============================================================================

CREATE TABLE IF NOT EXISTS org_learning_modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  content_url     TEXT,
  category        TEXT,
  duration_minutes INT,
  is_mandatory    BOOLEAN DEFAULT FALSE,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_learning_org ON org_learning_modules(organization_id);

-- =============================================================================
-- 14. AUDIT LOGS (org-scoped, append-only)
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id        UUID REFERENCES auth.users(id),
  action          TEXT NOT NULL,              -- e.g. 'employee.update', 'payroll.process'
  entity_type     TEXT NOT NULL,              -- e.g. 'employee', 'payroll', 'project'
  entity_id       UUID,                      -- the record that was affected
  changes         JSONB,                     -- { before: {...}, after: {...} }
  ip_address      INET,
  user_agent      TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs are APPEND-ONLY — no UPDATE or DELETE
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(organization_id, action);

-- =============================================================================
-- 15. HELPER FUNCTION: Get user's org IDs
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = auth.uid()
    AND is_active = TRUE;
$$;

-- =============================================================================
-- 16. HELPER FUNCTION: Check if user is member of org
-- =============================================================================

CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND is_active = TRUE
  );
$$;

-- =============================================================================
-- 17. HELPER FUNCTION: Check user's role in org
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_org_role(org_id UUID)
RETURNS org_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM organization_members
  WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND is_active = TRUE
  LIMIT 1;
$$;

-- =============================================================================
-- 18. HELPER FUNCTION: Check if user has specific role or higher
-- =============================================================================

CREATE OR REPLACE FUNCTION has_org_role(org_id UUID, required_role org_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND is_active = TRUE
      AND (
        role = 'owner'
        OR (required_role = 'hr' AND role IN ('owner', 'hr'))
        OR (required_role = 'manager' AND role IN ('owner', 'hr', 'manager'))
        OR (required_role = 'recruiter' AND role IN ('owner', 'hr', 'recruiter'))
        OR (required_role = 'employee' AND role IN ('owner', 'hr', 'manager', 'recruiter', 'employee'))
      )
  );
$$;

-- =============================================================================
-- 19. UPDATED TIMESTAMP TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'organizations',
      'organization_members',
      'org_employees',
      'org_projects',
      'org_tasks',
      'org_payroll_records',
      'org_leave_requests',
      'org_performance_reviews',
      'org_learning_modules'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I; CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      tbl, tbl
    );
  END LOOP;
END $$;


-- =============================================================================
-- 20. ROW LEVEL SECURITY — ENABLE ON ALL TABLES
-- =============================================================================

ALTER TABLE organizations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_employees           ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_candidates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_tasks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_payroll_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_leave_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_announcements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_learning_modules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 21. RLS POLICIES — ORGANIZATIONS
-- =============================================================================

-- Users can see orgs they belong to
CREATE POLICY "org_select" ON organizations
  FOR SELECT TO authenticated
  USING (id IN (SELECT get_user_org_ids()));

-- Only owners can update their org
CREATE POLICY "org_update" ON organizations
  FOR UPDATE TO authenticated
  USING (has_org_role(id, 'owner'));

-- Any authenticated user can create an org (they become owner)
CREATE POLICY "org_insert" ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

-- Only owners can delete
CREATE POLICY "org_delete" ON organizations
  FOR DELETE TO authenticated
  USING (has_org_role(id, 'owner'));


-- =============================================================================
-- 22. RLS POLICIES — ORGANIZATION MEMBERS
-- =============================================================================

-- Members can see other members of their org
CREATE POLICY "members_select" ON organization_members
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

-- HR+ can add members
CREATE POLICY "members_insert" ON organization_members
  FOR INSERT TO authenticated
  WITH CHECK (has_org_role(organization_id, 'hr'));

-- HR+ can update members (role changes etc)
CREATE POLICY "members_update" ON organization_members
  FOR UPDATE TO authenticated
  USING (has_org_role(organization_id, 'hr'));

-- Only owners can remove members
CREATE POLICY "members_delete" ON organization_members
  FOR DELETE TO authenticated
  USING (has_org_role(organization_id, 'owner'));


-- =============================================================================
-- 23. RLS POLICIES — INVITATIONS
-- =============================================================================

CREATE POLICY "invites_select" ON organization_invitations
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "invites_insert" ON organization_invitations
  FOR INSERT TO authenticated
  WITH CHECK (has_org_role(organization_id, 'hr'));

CREATE POLICY "invites_update" ON organization_invitations
  FOR UPDATE TO authenticated
  USING (has_org_role(organization_id, 'hr'));

CREATE POLICY "invites_delete" ON organization_invitations
  FOR DELETE TO authenticated
  USING (has_org_role(organization_id, 'hr'));


-- =============================================================================
-- 24. RLS POLICIES — GENERIC ORG-SCOPED (macro pattern)
-- For: employees, candidates, projects, tasks, announcements, learning_modules
-- =============================================================================

-- EMPLOYEES
CREATE POLICY "emp_select" ON org_employees
  FOR SELECT TO authenticated
  USING (is_org_member(organization_id));

CREATE POLICY "emp_insert" ON org_employees
  FOR INSERT TO authenticated
  WITH CHECK (has_org_role(organization_id, 'hr'));

CREATE POLICY "emp_update" ON org_employees
  FOR UPDATE TO authenticated
  USING (has_org_role(organization_id, 'hr'));

CREATE POLICY "emp_delete" ON org_employees
  FOR DELETE TO authenticated
  USING (has_org_role(organization_id, 'owner'));

-- CANDIDATES
CREATE POLICY "cand_select" ON org_candidates
  FOR SELECT TO authenticated
  USING (is_org_member(organization_id));

CREATE POLICY "cand_insert" ON org_candidates
  FOR INSERT TO authenticated
  WITH CHECK (has_org_role(organization_id, 'recruiter'));

CREATE POLICY "cand_update" ON org_candidates
  FOR UPDATE TO authenticated
  USING (has_org_role(organization_id, 'recruiter'));

CREATE POLICY "cand_delete" ON org_candidates
  FOR DELETE TO authenticated
  USING (has_org_role(organization_id, 'hr'));

-- PROJECTS
CREATE POLICY "proj_select" ON org_projects
  FOR SELECT TO authenticated
  USING (is_org_member(organization_id));

CREATE POLICY "proj_insert" ON org_projects
  FOR INSERT TO authenticated
  WITH CHECK (has_org_role(organization_id, 'manager'));

CREATE POLICY "proj_update" ON org_projects
  FOR UPDATE TO authenticated
  USING (has_org_role(organization_id, 'manager'));

CREATE POLICY "proj_delete" ON org_projects
  FOR DELETE TO authenticated
  USING (has_org_role(organization_id, 'hr'));

-- TASKS
CREATE POLICY "task_select" ON org_tasks
  FOR SELECT TO authenticated
  USING (is_org_member(organization_id));

CREATE POLICY "task_insert" ON org_tasks
  FOR INSERT TO authenticated
  WITH CHECK (has_org_role(organization_id, 'employee'));

CREATE POLICY "task_update" ON org_tasks
  FOR UPDATE TO authenticated
  USING (has_org_role(organization_id, 'employee'));

CREATE POLICY "task_delete" ON org_tasks
  FOR DELETE TO authenticated
  USING (has_org_role(organization_id, 'manager'));

-- PAYROLL (restricted to HR+)
CREATE POLICY "payroll_select" ON org_payroll_records
  FOR SELECT TO authenticated
  USING (
    has_org_role(organization_id, 'hr')
    OR employee_id IN (
      SELECT id FROM org_employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "payroll_insert" ON org_payroll_records
  FOR INSERT TO authenticated
  WITH CHECK (has_org_role(organization_id, 'hr'));

CREATE POLICY "payroll_update" ON org_payroll_records
  FOR UPDATE TO authenticated
  USING (has_org_role(organization_id, 'hr'));

CREATE POLICY "payroll_delete" ON org_payroll_records
  FOR DELETE TO authenticated
  USING (has_org_role(organization_id, 'owner'));

-- LEAVE REQUESTS
CREATE POLICY "leave_select" ON org_leave_requests
  FOR SELECT TO authenticated
  USING (
    is_org_member(organization_id)
    AND (
      user_id = auth.uid()
      OR has_org_role(organization_id, 'hr')
      OR has_org_role(organization_id, 'manager')
    )
  );

CREATE POLICY "leave_insert" ON org_leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    is_org_member(organization_id)
    AND user_id = auth.uid()
  );

CREATE POLICY "leave_update" ON org_leave_requests
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR has_org_role(organization_id, 'hr')
  );

CREATE POLICY "leave_delete" ON org_leave_requests
  FOR DELETE TO authenticated
  USING (has_org_role(organization_id, 'hr'));

-- PERFORMANCE REVIEWS
CREATE POLICY "review_select" ON org_performance_reviews
  FOR SELECT TO authenticated
  USING (
    has_org_role(organization_id, 'hr')
    OR employee_id IN (
      SELECT id FROM org_employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "review_insert" ON org_performance_reviews
  FOR INSERT TO authenticated
  WITH CHECK (has_org_role(organization_id, 'hr'));

CREATE POLICY "review_update" ON org_performance_reviews
  FOR UPDATE TO authenticated
  USING (has_org_role(organization_id, 'hr'));

CREATE POLICY "review_delete" ON org_performance_reviews
  FOR DELETE TO authenticated
  USING (has_org_role(organization_id, 'owner'));

-- ANNOUNCEMENTS
CREATE POLICY "announce_select" ON org_announcements
  FOR SELECT TO authenticated
  USING (is_org_member(organization_id));

CREATE POLICY "announce_insert" ON org_announcements
  FOR INSERT TO authenticated
  WITH CHECK (has_org_role(organization_id, 'hr'));

CREATE POLICY "announce_update" ON org_announcements
  FOR UPDATE TO authenticated
  USING (has_org_role(organization_id, 'hr'));

CREATE POLICY "announce_delete" ON org_announcements
  FOR DELETE TO authenticated
  USING (has_org_role(organization_id, 'hr'));

-- LEARNING MODULES
CREATE POLICY "learn_select" ON org_learning_modules
  FOR SELECT TO authenticated
  USING (is_org_member(organization_id));

CREATE POLICY "learn_insert" ON org_learning_modules
  FOR INSERT TO authenticated
  WITH CHECK (has_org_role(organization_id, 'hr'));

CREATE POLICY "learn_update" ON org_learning_modules
  FOR UPDATE TO authenticated
  USING (has_org_role(organization_id, 'hr'));

CREATE POLICY "learn_delete" ON org_learning_modules
  FOR DELETE TO authenticated
  USING (has_org_role(organization_id, 'hr'));

-- AUDIT LOGS (read-only for org members, insert handled by server)
CREATE POLICY "audit_select" ON audit_logs
  FOR SELECT TO authenticated
  USING (has_org_role(organization_id, 'hr'));

-- Insert via service role only (server actions). But allow for security-definer function:
CREATE POLICY "audit_insert" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(organization_id));

-- NO UPDATE or DELETE on audit_logs — they are immutable


-- =============================================================================
-- 25. FUNCTION: Accept Invite (security definer — bypasses RLS)
-- =============================================================================

CREATE OR REPLACE FUNCTION accept_invitation(invite_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite organization_invitations%ROWTYPE;
  v_user_id UUID;
  v_org_name TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Find the invite
  SELECT * INTO v_invite
  FROM organization_invitations
  WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired invitation');
  END IF;

  -- Verify email matches
  IF v_invite.email != (SELECT email FROM auth.users WHERE id = v_user_id) THEN
    RETURN jsonb_build_object('error', 'Email does not match invitation');
  END IF;

  -- Add user to org
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_invite.organization_id, v_user_id, v_invite.role)
  ON CONFLICT (organization_id, user_id) DO UPDATE
    SET role = v_invite.role, is_active = TRUE, updated_at = NOW();

  -- Mark invite as accepted
  UPDATE organization_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = v_invite.id;

  -- Get org name for response
  SELECT name INTO v_org_name FROM organizations WHERE id = v_invite.organization_id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_invite.organization_id,
    'organization_name', v_org_name,
    'role', v_invite.role
  );
END;
$$;

-- =============================================================================
-- 26. FUNCTION: Create Organization + Set Owner
-- =============================================================================

CREATE OR REPLACE FUNCTION create_organization(
  org_name TEXT,
  org_slug TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Create org
  INSERT INTO organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO v_org_id;

  -- Add creator as owner
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'owner');

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_org_id
  );
END;
$$;

-- =============================================================================
-- DONE. Run 002_backfill.sql next to migrate existing data.
-- =============================================================================
