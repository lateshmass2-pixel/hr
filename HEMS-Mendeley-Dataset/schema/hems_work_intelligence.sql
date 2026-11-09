-- =============================================================================
-- HEMS Work Intelligence — Employee Work Authenticity & Git Intelligence
-- Migration 008
-- =============================================================================
-- Adds GitHub integration, git evidence collection, provenance, anomaly
-- detection, daily work reports and work-intelligence settings.
--
-- Design rules encoded here:
--   * Every table is org-scoped (organization_id) following existing pattern.
--   * Raw evidence tables (git_events, git_commits, git_push_events, ...) are
--     effectively append-only for app users: no UPDATE/DELETE RLS policies.
--   * Idempotency is enforced with unique constraints (delivery ids, shas,
--     github ids) so duplicate webhooks cannot create duplicate evidence.
--   * Identity is NEVER assumed: git_commits.git_account_id is an explicit
--     mapping resolved via git_accounts, not the raw commit author.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. GITHUB ACCOUNTS (employee <-> GitHub identity)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS git_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id         UUID REFERENCES org_employees(id) ON DELETE SET NULL,
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  github_user_id      BIGINT NOT NULL,
  github_username     TEXT NOT NULL,
  display_name        TEXT,
  email               TEXT,
  avatar_url          TEXT,

  -- Encrypted at app layer (AES-256-GCM with ENCRYPTION_KEY). Never returned
  -- to the browser. Nullable: webhook-only setups need no token.
  access_token_encrypted TEXT,
  token_scopes        TEXT,
  token_expires_at    TIMESTAMPTZ,

  status              TEXT NOT NULL DEFAULT 'CONNECTED'
                      CHECK (status IN ('CONNECTED','SYNCING','SYNCED','ERROR','REAUTH_REQUIRED','DISCONNECTED')),
  last_error          TEXT,
  connected_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT git_accounts_unique_github_per_org UNIQUE (organization_id, github_user_id)
);

CREATE INDEX IF NOT EXISTS idx_git_accounts_org ON git_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_git_accounts_employee ON git_accounts(employee_id);
CREATE INDEX IF NOT EXISTS idx_git_accounts_user ON git_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_git_accounts_username ON git_accounts(github_username);

-- -----------------------------------------------------------------------------
-- 2. GITHUB ORGANIZATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS git_organizations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  github_org_id       BIGINT NOT NULL,
  login               TEXT NOT NULL,
  name                TEXT,
  avatar_url          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT git_organizations_unique UNIQUE (github_org_id)
);

CREATE INDEX IF NOT EXISTS idx_git_orgs_org ON git_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_git_orgs_login ON git_organizations(login);

-- -----------------------------------------------------------------------------
-- 3. GIT REPOSITORIES (+ mapping to HEMS projects)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS git_repositories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  github_repo_id      BIGINT NOT NULL,
  git_organization_id UUID REFERENCES git_organizations(id) ON DELETE SET NULL,
  project_id          UUID REFERENCES org_projects(id) ON DELETE SET NULL,

  owner               TEXT NOT NULL,
  name                TEXT NOT NULL,
  full_name           TEXT NOT NULL,
  url                 TEXT NOT NULL,
  default_branch      TEXT NOT NULL DEFAULT 'main',
  visibility          TEXT NOT NULL DEFAULT 'private'
                      CHECK (visibility IN ('public','private','internal')),

  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  sync_status         TEXT NOT NULL DEFAULT 'CONNECTED'
                      CHECK (sync_status IN ('CONNECTED','SYNCING','SYNCED','ERROR','REAUTH_REQUIRED')),
  last_error          TEXT,
  last_synced_at      TIMESTAMPTZ,
  next_cursor         TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT git_repositories_unique UNIQUE (github_repo_id)
);

CREATE INDEX IF NOT EXISTS idx_git_repos_org ON git_repositories(organization_id);
CREATE INDEX IF NOT EXISTS idx_git_repos_project ON git_repositories(project_id);
CREATE INDEX IF NOT EXISTS idx_git_repos_full_name ON git_repositories(full_name);
CREATE INDEX IF NOT EXISTS idx_git_repos_active ON git_repositories(organization_id, is_active);

-- -----------------------------------------------------------------------------
-- 4. REPOSITORY MEMBERS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS git_repository_members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id       UUID NOT NULL REFERENCES git_repositories(id) ON DELETE CASCADE,
  github_user_id      BIGINT NOT NULL,
  github_username     TEXT NOT NULL,
  permission          TEXT NOT NULL DEFAULT 'write'
                      CHECK (permission IN ('admin','maintain','write','triage','read')),
  is_bot              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT git_repo_members_unique UNIQUE (repository_id, github_user_id)
);

CREATE INDEX IF NOT EXISTS idx_git_repo_members_repo ON git_repository_members(repository_id);
CREATE INDEX IF NOT EXISTS idx_git_repo_members_gh_user ON git_repository_members(github_user_id);

-- -----------------------------------------------------------------------------
-- 5. BRANCHES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS git_branches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  repository_id       UUID NOT NULL REFERENCES git_repositories(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  last_commit_sha     TEXT,
  is_default          BOOLEAN NOT NULL DEFAULT FALSE,
  first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT git_branches_unique UNIQUE (repository_id, name)
);

CREATE INDEX IF NOT EXISTS idx_git_branches_repo ON git_branches(repository_id);
CREATE INDEX IF NOT EXISTS idx_git_branches_org ON git_branches(organization_id);

-- -----------------------------------------------------------------------------
-- 6. COMMITS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS git_commits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  repository_id       UUID NOT NULL REFERENCES git_repositories(id) ON DELETE CASCADE,

  sha                 TEXT NOT NULL,
  message             TEXT NOT NULL,
  url                 TEXT,
  committed_at        TIMESTAMPTZ NOT NULL,          -- author timestamp
  committer_date      TIMESTAMPTZ,

  -- Raw authorship (untrusted, kept as evidence)
  author_name         TEXT,
  author_email        TEXT,
  committer_name      TEXT,
  committer_email     TEXT,

  -- Push provenance
  push_event_id       UUID,                          -- FK added after git_push_events
  pusher_account_id   UUID REFERENCES git_accounts(id) ON DELETE SET NULL,
  github_actor        TEXT,                          -- login of the pusher (webhook)
  github_actor_id     BIGINT,
  github_app_slug     TEXT,                          -- set when pushed by a GitHub App
  is_bot              BOOLEAN NOT NULL DEFAULT FALSE,
  bot_type            TEXT,                          -- dependabot|renovate|github-actions|github-app|other
  bot_name            TEXT,
  automation_source   TEXT,

  -- Explicit identity mapping (resolved, never assumed)
  git_account_id      UUID REFERENCES git_accounts(id) ON DELETE SET NULL,
  identity_source     TEXT
                      CHECK (identity_source IN ('github_account','email_match','push_actor','manual','unmapped')),

  -- Diff summary
  additions           INT NOT NULL DEFAULT 0,
  deletions           INT NOT NULL DEFAULT 0,
  changed_files       INT NOT NULL DEFAULT 0,
  parent_shas         TEXT[] DEFAULT '{}',
  co_authors          JSONB DEFAULT '[]',

  -- Classification (deterministic analyzer output)
  change_category     TEXT
                      CHECK (change_category IN ('FEATURE','BUG_FIX','REFACTOR','TESTING','DOCUMENTATION','CONFIGURATION','DEPENDENCY','GENERATED','FORMATTING','UNKNOWN')),
  meaningful_score    NUMERIC(6,2),
  analyzed_at         TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT git_commits_unique UNIQUE (repository_id, sha)
);

CREATE INDEX IF NOT EXISTS idx_git_commits_repo ON git_commits(repository_id);
CREATE INDEX IF NOT EXISTS idx_git_commits_org ON git_commits(organization_id);
CREATE INDEX IF NOT EXISTS idx_git_commits_account ON git_commits(git_account_id);
CREATE INDEX IF NOT EXISTS idx_git_commits_sha ON git_commits(sha);
CREATE INDEX IF NOT EXISTS idx_git_commits_time ON git_commits(organization_id, committed_at DESC);
CREATE INDEX IF NOT EXISTS idx_git_commits_push_event ON git_commits(push_event_id);

-- -----------------------------------------------------------------------------
-- 7. COMMIT FILES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS git_commit_files (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commit_id           UUID NOT NULL REFERENCES git_commits(id) ON DELETE CASCADE,
  path                TEXT NOT NULL,
  status              TEXT CHECK (status IN ('added','modified','removed','renamed','copied')),
  additions           INT NOT NULL DEFAULT 0,
  deletions           INT NOT NULL DEFAULT 0,
  changes             INT NOT NULL DEFAULT 0,
  previous_path       TEXT,
  file_category       TEXT
                      CHECK (file_category IN ('source','test','documentation','configuration','generated','lockfile','migration','asset','other')),
  patch_excerpt       TEXT,                          -- truncated patch for evidence display

  CONSTRAINT git_commit_files_unique UNIQUE (commit_id, path)
);

CREATE INDEX IF NOT EXISTS idx_git_commit_files_commit ON git_commit_files(commit_id);
CREATE INDEX IF NOT EXISTS idx_git_commit_files_category ON git_commit_files(file_category);

-- -----------------------------------------------------------------------------
-- 8. COMMIT SIGNATURES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS git_commit_signatures (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commit_id           UUID NOT NULL REFERENCES git_commits(id) ON DELETE CASCADE,
  signature_state     TEXT NOT NULL DEFAULT 'unsigned'
                      CHECK (signature_state IN ('verified','unverified','expired_key','invalid','unsigned')),
  signature_type      TEXT CHECK (signature_type IN ('gpg','ssh','smime','unknown')),
  signer_name         TEXT,
  signer_email        TEXT,
  payload             JSONB,

  CONSTRAINT git_commit_signatures_unique UNIQUE (commit_id)
);

CREATE INDEX IF NOT EXISTS idx_git_commit_signatures_commit ON git_commit_signatures(commit_id);

-- -----------------------------------------------------------------------------
-- 9. PUSH EVENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS git_push_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  repository_id       UUID NOT NULL REFERENCES git_repositories(id) ON DELETE CASCADE,
  webhook_event_id    UUID,                          -- FK to git_events added after its definition

  branch              TEXT NOT NULL,
  before_sha          TEXT,
  after_sha           TEXT,
  commit_shas         TEXT[] DEFAULT '{}',
  pushed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  git_account_id      UUID REFERENCES git_accounts(id) ON DELETE SET NULL,
  github_actor        TEXT,
  github_actor_id     BIGINT,
  pusher_name         TEXT,
  pusher_email        TEXT,
  sender_login        TEXT,
  github_app          JSONB,
  is_bot              BOOLEAN NOT NULL DEFAULT FALSE,
  bot_type            TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One push per (repo, delivery, after-sha): duplicate webhooks are no-ops.
  CONSTRAINT git_push_events_unique UNIQUE (repository_id, webhook_event_id, after_sha)
);

CREATE INDEX IF NOT EXISTS idx_git_push_repo ON git_push_events(repository_id);
CREATE INDEX IF NOT EXISTS idx_git_push_org_time ON git_push_events(organization_id, pushed_at DESC);
CREATE INDEX IF NOT EXISTS idx_git_push_account ON git_push_events(git_account_id);
CREATE INDEX IF NOT EXISTS idx_git_push_branch ON git_push_events(repository_id, branch);

-- Now that git_push_events exists, add the FK from commits.
ALTER TABLE git_commits
  DROP CONSTRAINT IF EXISTS git_commits_push_event_fk;
ALTER TABLE git_commits
  ADD CONSTRAINT git_commits_push_event_fk
  FOREIGN KEY (push_event_id) REFERENCES git_push_events(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 10. PULL REQUESTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS git_pull_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  repository_id       UUID NOT NULL REFERENCES git_repositories(id) ON DELETE CASCADE,

  pr_number           INT NOT NULL,
  github_pr_id        BIGINT NOT NULL,
  title               TEXT NOT NULL,
  body                TEXT,
  url                 TEXT,
  state               TEXT NOT NULL DEFAULT 'open'
                      CHECK (state IN ('open','closed','merged')),
  is_draft            BOOLEAN NOT NULL DEFAULT FALSE,

  author_username     TEXT,
  author_github_id    BIGINT,
  git_account_id      UUID REFERENCES git_accounts(id) ON DELETE SET NULL,
  author_is_bot       BOOLEAN NOT NULL DEFAULT FALSE,
  author_bot_type     TEXT,
  author_app_slug     TEXT,

  head_branch         TEXT,
  base_branch         TEXT,
  head_sha            TEXT,

  additions           INT NOT NULL DEFAULT 0,
  deletions           INT NOT NULL DEFAULT 0,
  changed_files       INT NOT NULL DEFAULT 0,
  commit_count        INT NOT NULL DEFAULT 0,

  gh_created_at       TIMESTAMPTZ,
  gh_updated_at       TIMESTAMPTZ,
  merged_at           TIMESTAMPTZ,
  closed_at           TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT git_prs_unique UNIQUE (repository_id, pr_number)
);

CREATE INDEX IF NOT EXISTS idx_git_prs_repo ON git_pull_requests(repository_id);
CREATE INDEX IF NOT EXISTS idx_git_prs_org ON git_pull_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_git_prs_account ON git_pull_requests(git_account_id);
CREATE INDEX IF NOT EXISTS idx_git_prs_github_id ON git_pull_requests(github_pr_id);
CREATE INDEX IF NOT EXISTS idx_git_prs_head_branch ON git_pull_requests(repository_id, head_branch);

-- -----------------------------------------------------------------------------
-- 11. PULL REQUEST REVIEWS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS git_pull_request_reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pull_request_id     UUID NOT NULL REFERENCES git_pull_requests(id) ON DELETE CASCADE,

  github_review_id    BIGINT NOT NULL,
  reviewer_username   TEXT,
  reviewer_github_id  BIGINT,
  git_account_id      UUID REFERENCES git_accounts(id) ON DELETE SET NULL,
  state               TEXT CHECK (state IN ('approved','changes_requested','commented','dismissed','pending')),
  body                TEXT,
  submitted_at        TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT git_pr_reviews_unique UNIQUE (github_review_id)
);

CREATE INDEX IF NOT EXISTS idx_git_pr_reviews_pr ON git_pull_request_reviews(pull_request_id);
CREATE INDEX IF NOT EXISTS idx_git_pr_reviews_org ON git_pull_request_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_git_pr_reviews_account ON git_pull_request_reviews(git_account_id);

-- -----------------------------------------------------------------------------
-- 12. WORKFLOW RUNS (CI/CD)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS git_workflow_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  repository_id       UUID NOT NULL REFERENCES git_repositories(id) ON DELETE CASCADE,

  github_run_id       BIGINT NOT NULL,
  name                TEXT,
  workflow_file       TEXT,
  event               TEXT,                          -- push, pull_request, schedule...
  head_branch         TEXT,
  head_sha            TEXT,
  status              TEXT,                          -- queued|in_progress|completed...
  conclusion          TEXT,                          -- success|failure|cancelled|null
  actor_username      TEXT,
  actor_github_id     BIGINT,
  git_account_id      UUID REFERENCES git_accounts(id) ON DELETE SET NULL,
  html_url            TEXT,
  run_started_at      TIMESTAMPTZ,
  run_completed_at    TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT git_workflow_runs_unique UNIQUE (github_run_id)
);

CREATE INDEX IF NOT EXISTS idx_git_wf_runs_repo ON git_workflow_runs(repository_id);
CREATE INDEX IF NOT EXISTS idx_git_wf_runs_org ON git_workflow_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_git_wf_runs_sha ON git_workflow_runs(head_sha);
CREATE INDEX IF NOT EXISTS idx_git_wf_runs_account ON git_workflow_runs(git_account_id);

-- -----------------------------------------------------------------------------
-- 13. RAW WEBHOOK EVENTS (ingestion audit trail; idempotency key: delivery_id)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS git_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id) ON DELETE SET NULL,
  repository_id       UUID REFERENCES git_repositories(id) ON DELETE SET NULL,

  delivery_id         TEXT NOT NULL,                 -- X-GitHub-Delivery
  event_type          TEXT NOT NULL,                 -- push, pull_request, ...
  action              TEXT,
  github_actor        TEXT,
  payload             JSONB NOT NULL,
  signature_valid     BOOLEAN NOT NULL DEFAULT FALSE,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at        TIMESTAMPTZ,
  processing_status   TEXT NOT NULL DEFAULT 'received'
                      CHECK (processing_status IN ('received','processed','duplicate','ignored','error')),
  processing_error    TEXT,

  CONSTRAINT git_events_delivery_unique UNIQUE (delivery_id)
);

CREATE INDEX IF NOT EXISTS idx_git_events_repo ON git_events(repository_id);
CREATE INDEX IF NOT EXISTS idx_git_events_type ON git_events(event_type);
CREATE INDEX IF NOT EXISTS idx_git_events_received ON git_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_git_events_status ON git_events(processing_status);

-- Deferred FK now that git_events exists.
ALTER TABLE git_push_events
  DROP CONSTRAINT IF EXISTS git_push_events_event_fk;
ALTER TABLE git_push_events
  ADD CONSTRAINT git_push_events_event_fk
  FOREIGN KEY (webhook_event_id) REFERENCES git_events(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 14. AGENT / AUTOMATION PROVENANCE (explicit evidence only)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  agent_type          TEXT NOT NULL
                      CHECK (agent_type IN ('COPILOT','CLAUDE','CODEX','CURSOR','CUSTOM_AGENT','UNKNOWN_AGENT')),
  detection_basis     TEXT NOT NULL DEFAULT 'explicit_provenance'
                      CHECK (detection_basis IN ('explicit_provenance','co_author','app_identity','inference')),
  confidence          TEXT NOT NULL DEFAULT 'high'
                      CHECK (confidence IN ('high','medium','low')),

  source_kind         TEXT CHECK (source_kind IN ('commit','push','pull_request','workflow_run')),
  commit_id           UUID REFERENCES git_commits(id) ON DELETE CASCADE,
  push_event_id       UUID REFERENCES git_push_events(id) ON DELETE CASCADE,
  pull_request_id     UUID REFERENCES git_pull_requests(id) ON DELETE CASCADE,

  agent_name          TEXT,
  evidence            JSONB NOT NULL DEFAULT '{}',   -- raw metadata that justified detection
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_events_org ON agent_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_commit ON agent_events(commit_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_pr ON agent_events(pull_request_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_type ON agent_events(organization_id, agent_type);

-- -----------------------------------------------------------------------------
-- 15. WORK SESSIONS (per employee/day activity windows)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id         UUID NOT NULL REFERENCES org_employees(id) ON DELETE CASCADE,
  session_date        DATE NOT NULL,

  first_activity_at   TIMESTAMPTZ,
  last_activity_at    TIMESTAMPTZ,
  commit_count        INT NOT NULL DEFAULT 0,
  push_count          INT NOT NULL DEFAULT 0,
  pr_count            INT NOT NULL DEFAULT 0,
  review_count        INT NOT NULL DEFAULT 0,
  ci_run_count        INT NOT NULL DEFAULT 0,
  branches            TEXT[] DEFAULT '{}',
  repository_ids      UUID[] DEFAULT '{}',

  computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT work_sessions_unique UNIQUE (employee_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_work_sessions_org_date ON work_sessions(organization_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_work_sessions_employee ON work_sessions(employee_id, session_date DESC);

-- -----------------------------------------------------------------------------
-- 16. WORK EVIDENCE (atomic evidence facts feeding reports/statuses)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_evidence (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id         UUID REFERENCES org_employees(id) ON DELETE CASCADE,

  evidence_type       TEXT NOT NULL
                      CHECK (evidence_type IN (
                        'identity_verified','push_provenance','signed_commit',
                        'meaningful_source_change','test_activity','pr_activity',
                        'review_activity','ci_activity','task_linkage',
                        'agent_activity','automation_activity','anomaly'
                      )),
  source_table        TEXT NOT NULL,                 -- git_commits, git_pull_requests, ...
  source_id           UUID NOT NULL,
  observed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  weight              NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  details             JSONB NOT NULL DEFAULT '{}',

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_evidence_org ON work_evidence(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_evidence_employee ON work_evidence(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_evidence_source ON work_evidence(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_work_evidence_time ON work_evidence(organization_id, observed_at DESC);

-- -----------------------------------------------------------------------------
-- 17. ACTIVITY ANOMALIES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_anomalies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id         UUID REFERENCES org_employees(id) ON DELETE CASCADE,

  severity            TEXT NOT NULL
                      CHECK (severity IN ('NORMAL','UNUSUAL','REVIEW_REQUIRED','INSUFFICIENT_EVIDENCE')),
  rule_code           TEXT NOT NULL,                 -- e.g. 'commit_burst', 'generated_only'
  rule_version        TEXT NOT NULL DEFAULT 'v1',
  reason              TEXT NOT NULL,
  explanation         TEXT NOT NULL,                 -- human-readable, evidence-based wording
  evidence            JSONB NOT NULL DEFAULT '[]',   -- list of evidence strings/refs
  affected_event_ids  JSONB NOT NULL DEFAULT '[]',
  window_start        TIMESTAMPTZ,
  window_end          TIMESTAMPTZ,

  status              TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','acknowledged','dismissed','resolved')),
  reviewed_by         UUID REFERENCES auth.users(id),
  reviewed_at         TIMESTAMPTZ,
  review_note         TEXT,

  detected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_org ON activity_anomalies(organization_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_employee ON activity_anomalies(employee_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON activity_anomalies(organization_id, severity);
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON activity_anomalies(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_anomalies_rule ON activity_anomalies(rule_code);

-- -----------------------------------------------------------------------------
-- 18. TASK <-> GIT CORRELATION
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_git_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id             UUID NOT NULL REFERENCES org_tasks(id) ON DELETE CASCADE,
  repository_id       UUID REFERENCES git_repositories(id) ON DELETE CASCADE,
  branch_name         TEXT,
  commit_id           UUID REFERENCES git_commits(id) ON DELETE CASCADE,
  pull_request_id     UUID REFERENCES git_pull_requests(id) ON DELETE CASCADE,

  link_type           TEXT NOT NULL DEFAULT 'auto'
                      CHECK (link_type IN ('auto','manual')),
  correlation_basis   TEXT,                          -- branch_name_pattern, pr_body_ref, manual...
  linked_by           UUID REFERENCES auth.users(id),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT task_git_links_unique UNIQUE (task_id, commit_id, pull_request_id, branch_name)
);

CREATE INDEX IF NOT EXISTS idx_task_git_links_task ON task_git_links(task_id);
CREATE INDEX IF NOT EXISTS idx_task_git_links_org ON task_git_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_git_links_repo_branch ON task_git_links(repository_id, branch_name);

-- -----------------------------------------------------------------------------
-- 19. DAILY WORK REPORTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_work_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id         UUID NOT NULL REFERENCES org_employees(id) ON DELETE CASCADE,
  report_date         DATE NOT NULL,

  repository_count    INT NOT NULL DEFAULT 0,
  commit_count        INT NOT NULL DEFAULT 0,
  push_count          INT NOT NULL DEFAULT 0,
  pr_count            INT NOT NULL DEFAULT 0,
  review_count        INT NOT NULL DEFAULT 0,
  ci_run_count        INT NOT NULL DEFAULT 0,
  files_changed       INT NOT NULL DEFAULT 0,
  work_areas          TEXT[] DEFAULT '{}',

  evidence_summary    JSONB NOT NULL DEFAULT '{}',   -- checklist results
  automation_summary  JSONB NOT NULL DEFAULT '{}',   -- detected agents/bots + basis
  anomaly_summary     JSONB NOT NULL DEFAULT '[]',

  authenticity_status TEXT NOT NULL DEFAULT 'INSUFFICIENT_EVIDENCE'
                      CHECK (authenticity_status IN ('VERIFIED','REVIEW_REQUIRED','UNUSUAL_ACTIVITY','INSUFFICIENT_EVIDENCE')),
  status_reason       TEXT,

  ai_summary          TEXT,
  ai_generated_at     TIMESTAMPTZ,

  generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT daily_work_reports_unique UNIQUE (employee_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_org_date ON daily_work_reports(organization_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_reports_employee ON daily_work_reports(employee_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_reports_status ON daily_work_reports(organization_id, authenticity_status);

-- -----------------------------------------------------------------------------
-- 20. WORK INTELLIGENCE SETTINGS (per org)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_intelligence_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  anomaly_thresholds  JSONB NOT NULL DEFAULT '{
    "commit_burst_window_minutes": 15,
    "commit_burst_threshold": 20,
    "tiny_commit_threshold": 3,
    "generated_file_ratio": 0.8
  }',
  enabled_sources     JSONB NOT NULL DEFAULT '{
    "github": true, "tasks": true, "ci": true, "reviews": true
  }',
  ai_analysis_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  retention_days      INT NOT NULL DEFAULT 365,
  auto_correlate_tasks BOOLEAN NOT NULL DEFAULT TRUE,

  updated_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT work_intelligence_settings_unique UNIQUE (organization_id)
);

-- -----------------------------------------------------------------------------
-- 21. UPDATED_AT TRIGGERS
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'git_accounts',
      'git_organizations',
      'git_repositories',
      'git_pull_requests',
      'daily_work_reports',
      'work_intelligence_settings'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON %I; CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      tbl, tbl
    );
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 22. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
ALTER TABLE git_accounts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_organizations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_repositories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_repository_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_branches              ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_commits               ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_commit_files          ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_commit_signatures     ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_push_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_pull_requests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_pull_request_reviews  ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_workflow_runs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_sessions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_evidence             ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_anomalies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_git_links            ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_work_reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_intelligence_settings ENABLE ROW LEVEL SECURITY;

-- Helper: employee rows belonging to the current user
CREATE OR REPLACE FUNCTION wi_my_employee_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM org_employees WHERE user_id = auth.uid();
$$;

-- ============ git_accounts ============
-- Employees see their own accounts; manager+ sees org accounts.
CREATE POLICY "gi_accounts_select" ON git_accounts
  FOR SELECT TO authenticated
  USING (
    has_org_role(organization_id, 'manager')
    OR id IN (
      SELECT ga.id FROM git_accounts ga
      WHERE ga.employee_id IN (SELECT wi_my_employee_ids())
         OR ga.user_id = auth.uid()
    ) AND is_org_member(organization_id)
  );

CREATE POLICY "gi_accounts_insert" ON git_accounts
  FOR INSERT TO authenticated
  WITH CHECK (is_org_member(organization_id));

-- Only owner/hr may update (token rotation, status) or delete.
CREATE POLICY "gi_accounts_update" ON git_accounts
  FOR UPDATE TO authenticated
  USING (has_org_role(organization_id, 'hr'));

CREATE POLICY "gi_accounts_delete" ON git_accounts
  FOR DELETE TO authenticated
  USING (has_org_role(organization_id, 'hr'));

-- ============ org/repo-level tables ============
CREATE POLICY "gi_git_orgs_select" ON git_organizations
  FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "gi_git_orgs_write" ON git_organizations
  FOR ALL TO authenticated
  USING (has_org_role(organization_id, 'hr'))
  WITH CHECK (has_org_role(organization_id, 'hr'));

CREATE POLICY "gi_repos_select" ON git_repositories
  FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "gi_repos_insert" ON git_repositories
  FOR INSERT TO authenticated WITH CHECK (has_org_role(organization_id, 'manager'));
CREATE POLICY "gi_repos_update" ON git_repositories
  FOR UPDATE TO authenticated USING (has_org_role(organization_id, 'manager'));
CREATE POLICY "gi_repos_delete" ON git_repositories
  FOR DELETE TO authenticated USING (has_org_role(organization_id, 'hr'));

CREATE POLICY "gi_repo_members_select" ON git_repository_members
  FOR SELECT TO authenticated
  USING (repository_id IN (
    SELECT id FROM git_repositories WHERE is_org_member(organization_id)
  ));
CREATE POLICY "gi_repo_members_write" ON git_repository_members
  FOR ALL TO authenticated
  USING (repository_id IN (
    SELECT id FROM git_repositories WHERE has_org_role(organization_id, 'manager')
  ))
  WITH CHECK (repository_id IN (
    SELECT id FROM git_repositories WHERE has_org_role(organization_id, 'manager')
  ));

CREATE POLICY "gi_branches_select" ON git_branches
  FOR SELECT TO authenticated USING (is_org_member(organization_id));

-- ============ evidence tables (member read; writes via service role) ============
-- Commits, files, signatures, pushes, PRs, reviews, runs, events: org members
-- can read; ingestion happens server-side with the service role key.
CREATE POLICY "gi_commits_select" ON git_commits
  FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "gi_commit_files_select" ON git_commit_files
  FOR SELECT TO authenticated
  USING (commit_id IN (SELECT id FROM git_commits WHERE is_org_member(organization_id)));
CREATE POLICY "gi_commit_sigs_select" ON git_commit_signatures
  FOR SELECT TO authenticated
  USING (commit_id IN (SELECT id FROM git_commits WHERE is_org_member(organization_id)));
CREATE POLICY "gi_push_select" ON git_push_events
  FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "gi_prs_select" ON git_pull_requests
  FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "gi_pr_reviews_select" ON git_pull_request_reviews
  FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "gi_wf_runs_select" ON git_workflow_runs
  FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "gi_events_select" ON git_events
  FOR SELECT TO authenticated
  USING (
    -- raw payloads are admin-level; org membership + manager role required
    has_org_role(COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), 'manager')
  );
CREATE POLICY "gi_agent_events_select" ON agent_events
  FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "gi_task_links_select" ON task_git_links
  FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "gi_task_links_write" ON task_git_links
  FOR ALL TO authenticated
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

-- ============ employee-scoped tables ============
-- Employees see only their own rows; manager+ sees org-wide.
CREATE POLICY "wi_sessions_select" ON work_sessions
  FOR SELECT TO authenticated
  USING (
    has_org_role(organization_id, 'manager')
    OR employee_id IN (SELECT wi_my_employee_ids())
  );

CREATE POLICY "wi_evidence_select" ON work_evidence
  FOR SELECT TO authenticated
  USING (
    has_org_role(organization_id, 'manager')
    OR employee_id IN (SELECT wi_my_employee_ids())
  );

CREATE POLICY "wi_anomalies_select" ON activity_anomalies
  FOR SELECT TO authenticated
  USING (
    has_org_role(organization_id, 'manager')
    OR employee_id IN (SELECT wi_my_employee_ids())
  );

CREATE POLICY "wi_anomalies_update" ON activity_anomalies
  FOR UPDATE TO authenticated
  USING (has_org_role(organization_id, 'manager'));

CREATE POLICY "wi_reports_select" ON daily_work_reports
  FOR SELECT TO authenticated
  USING (
    has_org_role(organization_id, 'manager')
    OR employee_id IN (SELECT wi_my_employee_ids())
  );

-- ============ settings ============
CREATE POLICY "wi_settings_select" ON work_intelligence_settings
  FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY "wi_settings_write" ON work_intelligence_settings
  FOR ALL TO authenticated
  USING (has_org_role(organization_id, 'hr'))
  WITH CHECK (has_org_role(organization_id, 'hr'));

-- NOTE: inserts into git_* evidence tables are performed with the service role
-- key (server-side webhook ingestion and sync jobs), which bypasses RLS by
-- design. No INSERT policies are created for evidence tables so browser
-- clients cannot fabricate evidence.

-- =============================================================================
-- END OF MIGRATION 008
-- =============================================================================