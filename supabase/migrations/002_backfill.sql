-- =============================================================================
-- HEMS SaaS Foundation — Phase 1 Data Backfill
-- Migrates existing single-org data into multi-tenant tables.
-- Run AFTER 001_saas_foundation.sql
-- =============================================================================
-- STRATEGY:
--   1. Create a "default" org for all existing data
--   2. Backfill organization_id into new org-scoped tables
--   3. Link existing auth.users to organization_members
--   4. Preserve all existing data — zero data loss
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Create default organization for existing data
-- =============================================================================

INSERT INTO organizations (id, name, slug, plan, subscription_status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'default-org',
  'growth',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- STEP 2: Link all existing auth.users as organization members
-- =============================================================================

INSERT INTO organization_members (organization_id, user_id, role)
SELECT
  '00000000-0000-0000-0000-000000000001',
  p.id,
  CASE
    WHEN p.role = 'HR_ADMIN' THEN 'owner'::org_role
    ELSE 'employee'::org_role
  END
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM organization_members om
  WHERE om.user_id = p.id
    AND om.organization_id = '00000000-0000-0000-0000-000000000001'
);

-- =============================================================================
-- STEP 3: Migrate profiles → org_employees
-- (profiles only has: id, email, full_name, role, created_at, updated_at)
-- position, department, avatar_url may or may not exist depending on migrations
-- =============================================================================

DO $$
DECLARE
  has_position BOOLEAN;
  has_department BOOLEAN;
  has_avatar BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'position'
  ) INTO has_position;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'department'
  ) INTO has_department;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url'
  ) INTO has_avatar;

  IF has_position AND has_department AND has_avatar THEN
    -- All optional columns exist
    INSERT INTO org_employees (organization_id, user_id, full_name, email, position, department, avatar_url, status, created_at)
    SELECT
      '00000000-0000-0000-0000-000000000001',
      p.id,
      COALESCE(p.full_name, 'Unknown'),
      p.email,
      COALESCE(p.position, 'Employee'),
      COALESCE(p.department, 'General'),
      p.avatar_url,
      'active',
      p.created_at
    FROM profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM org_employees oe
      WHERE oe.user_id = p.id
        AND oe.organization_id = '00000000-0000-0000-0000-000000000001'
    );
  ELSE
    -- Only core columns exist — use defaults for the rest
    INSERT INTO org_employees (organization_id, user_id, full_name, email, position, department, status, created_at)
    SELECT
      '00000000-0000-0000-0000-000000000001',
      p.id,
      COALESCE(p.full_name, 'Unknown'),
      p.email,
      'Employee',
      'General',
      'active',
      p.created_at
    FROM profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM org_employees oe
      WHERE oe.user_id = p.id
        AND oe.organization_id = '00000000-0000-0000-0000-000000000001'
    );
  END IF;
END $$;

-- =============================================================================
-- STEP 4: Migrate existing projects → org_projects
-- (due_date, team_lead_id, member_ids may not exist on all instances)
-- =============================================================================

DO $$
DECLARE
  has_due_date BOOLEAN;
  has_team_lead BOOLEAN;
  has_member_ids BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='due_date') INTO has_due_date;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='team_lead_id') INTO has_team_lead;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='member_ids') INTO has_member_ids;

  IF has_due_date AND has_team_lead AND has_member_ids THEN
    INSERT INTO org_projects (id, organization_id, title, description, status, due_date, team_lead_id, member_ids, created_by, created_at)
    SELECT p.id, '00000000-0000-0000-0000-000000000001', p.title, p.description,
      COALESCE(p.status, 'ACTIVE'), p.due_date, p.team_lead_id, COALESCE(p.member_ids, '{}'), p.created_by, p.created_at
    FROM projects p WHERE NOT EXISTS (SELECT 1 FROM org_projects op WHERE op.id = p.id);
  ELSE
    INSERT INTO org_projects (id, organization_id, title, description, status, created_by, created_at)
    SELECT p.id, '00000000-0000-0000-0000-000000000001', p.title, p.description,
      COALESCE(p.status, 'ACTIVE'), p.created_by, p.created_at
    FROM projects p WHERE NOT EXISTS (SELECT 1 FROM org_projects op WHERE op.id = p.id);
  END IF;
END $$;

-- =============================================================================
-- STEP 5: Migrate existing tasks → org_tasks
-- =============================================================================

INSERT INTO org_tasks (id, organization_id, project_id, title, description, status, priority, assignee_id, created_at)
SELECT
  t.id,
  '00000000-0000-0000-0000-000000000001',
  t.project_id,
  t.title,
  t.description,
  COALESCE(t.status, 'TODO'),
  COALESCE(t.priority, 'MEDIUM'),
  t.assignee_id,
  t.created_at
FROM tasks t
WHERE NOT EXISTS (
  SELECT 1 FROM org_tasks ot WHERE ot.id = t.id
);

-- =============================================================================
-- STEP 6: Migrate leave_requests → org_leave_requests
-- =============================================================================

INSERT INTO org_leave_requests (organization_id, user_id, leave_type, start_date, end_date, reason, status, created_at)
SELECT
  '00000000-0000-0000-0000-000000000001',
  lr.user_id,
  CASE
    WHEN lr.reason ILIKE '%sick%' THEN 'sick'
    ELSE 'annual'
  END,
  lr.start_date,
  lr.end_date,
  lr.reason,
  lr.status,
  lr.created_at
FROM leave_requests lr
WHERE NOT EXISTS (
  SELECT 1 FROM org_leave_requests olr
  WHERE olr.user_id = lr.user_id
    AND olr.start_date = lr.start_date
    AND olr.organization_id = '00000000-0000-0000-0000-000000000001'
);

-- =============================================================================
-- STEP 7: Migrate performance_reviews → org_performance_reviews
-- =============================================================================

INSERT INTO org_performance_reviews (organization_id, employee_id, review_period, rating, ai_summary, created_at)
SELECT
  '00000000-0000-0000-0000-000000000001',
  oe.id, -- mapped org_employee id
  pr.review_period,
  pr.rating,
  pr.ai_summary,
  pr.created_at
FROM performance_reviews pr
JOIN org_employees oe ON oe.user_id = pr.employee_id
  AND oe.organization_id = '00000000-0000-0000-0000-000000000001'
WHERE NOT EXISTS (
  SELECT 1 FROM org_performance_reviews opr
  WHERE opr.employee_id = oe.id
    AND opr.review_period = pr.review_period
);

-- =============================================================================
-- STEP 8: Migrate announcements → org_announcements
-- =============================================================================

INSERT INTO org_announcements (organization_id, title, content, priority, created_by, expires_at, created_at)
SELECT
  '00000000-0000-0000-0000-000000000001',
  a.title,
  a.content,
  LOWER(COALESCE(a.priority, 'normal')),
  a.created_by,
  a.expires_at,
  a.created_at
FROM announcements a
WHERE NOT EXISTS (
  SELECT 1 FROM org_announcements oa
  WHERE oa.title = a.title
    AND oa.created_at = a.created_at
    AND oa.organization_id = '00000000-0000-0000-0000-000000000001'
);

-- =============================================================================
-- STEP 9: Migrate applications → org_candidates
-- (generated_questions, candidate_answers, test_score, ai_reasoning may not exist)
-- =============================================================================

DO $$
DECLARE
  has_extra_cols BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='applications' AND column_name='generated_questions'
  ) INTO has_extra_cols;

  IF has_extra_cols THEN
    INSERT INTO org_candidates (organization_id, name, email, resume_url, resume_text, score, stage, generated_questions, candidate_answers, test_score, ai_reasoning, created_at)
    SELECT
      '00000000-0000-0000-0000-000000000001', app.candidate_name, app.candidate_email,
      app.resume_url, app.resume_text, app.score,
      CASE app.status
        WHEN 'NEW' THEN 'applied' WHEN 'SCREENING' THEN 'screening'
        WHEN 'SHORTLISTED' THEN 'screening' WHEN 'INTERVIEW' THEN 'interview'
        WHEN 'INTERVIEW_READY' THEN 'interview' WHEN 'OFFER_PENDING_APPROVAL' THEN 'offer'
        WHEN 'OFFER_SENT' THEN 'offer' WHEN 'HIRED' THEN 'hired'
        WHEN 'REJECTED' THEN 'rejected' ELSE 'applied'
      END,
      app.generated_questions, app.candidate_answers, app.test_score, app.ai_reasoning,
      app.created_at
    FROM applications app
    WHERE NOT EXISTS (
      SELECT 1 FROM org_candidates oc WHERE oc.email = app.candidate_email AND oc.organization_id = '00000000-0000-0000-0000-000000000001'
    );
  ELSE
    INSERT INTO org_candidates (organization_id, name, email, resume_url, score, stage, created_at)
    SELECT
      '00000000-0000-0000-0000-000000000001', app.candidate_name, app.candidate_email,
      app.resume_url, app.score,
      CASE app.status
        WHEN 'NEW' THEN 'applied' WHEN 'SCREENING' THEN 'screening'
        WHEN 'SHORTLISTED' THEN 'screening' WHEN 'INTERVIEW' THEN 'interview'
        WHEN 'INTERVIEW_READY' THEN 'interview' WHEN 'OFFER_PENDING_APPROVAL' THEN 'offer'
        WHEN 'OFFER_SENT' THEN 'offer' WHEN 'HIRED' THEN 'hired'
        WHEN 'REJECTED' THEN 'rejected' ELSE 'applied'
      END,
      app.created_at
    FROM applications app
    WHERE NOT EXISTS (
      SELECT 1 FROM org_candidates oc WHERE oc.email = app.candidate_email AND oc.organization_id = '00000000-0000-0000-0000-000000000001'
    );
  END IF;
END $$;

-- =============================================================================
-- DONE. Verify migration counts:
-- =============================================================================
-- SELECT 'org_employees' as tbl, count(*) FROM org_employees
-- UNION ALL SELECT 'org_projects', count(*) FROM org_projects
-- UNION ALL SELECT 'org_tasks', count(*) FROM org_tasks
-- UNION ALL SELECT 'org_leave_requests', count(*) FROM org_leave_requests
-- UNION ALL SELECT 'org_performance_reviews', count(*) FROM org_performance_reviews
-- UNION ALL SELECT 'org_announcements', count(*) FROM org_announcements
-- UNION ALL SELECT 'org_candidates', count(*) FROM org_candidates;

COMMIT;
