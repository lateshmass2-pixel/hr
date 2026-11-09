-- =============================================================================
-- HEMS Work Intelligence — Follow-up migration 009
-- =============================================================================
-- Adds columns the account/settings UI and API layer need, the
-- `automation_events` table (explicit bot/automation evidence, separate from
-- agent_events which tracks AI-assisted provenance), and small hardening
-- additions discovered during integration of migration 008 with the app layer.
--
-- Notes:
--   * git_accounts.sync_enabled lets a user pause ingestion for their account
--     without disconnecting (the app previously abused `status` for this).
--   * git_accounts bot/automation columns allow flagging known automation
--     accounts (e.g. a shared CI account) at the account level.
--   * identity_source on git_accounts records how the GitHub↔employee mapping
--     was established (oauth = the employee connected it themselves, manual =
--     an admin linked it), which is evidence in itself.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. git_accounts additions
-- ---------------------------------------------------------------------------
ALTER TABLE git_accounts
  ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE git_accounts
  ADD COLUMN IF NOT EXISTS identity_source TEXT NOT NULL DEFAULT 'oauth'
  CHECK (identity_source IN ('oauth','manual'));

ALTER TABLE git_accounts
  ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE git_accounts
  ADD COLUMN IF NOT EXISTS bot_type TEXT;
ALTER TABLE git_accounts
  ADD COLUMN IF NOT EXISTS bot_name TEXT;
ALTER TABLE git_accounts
  ADD COLUMN IF NOT EXISTS automation_source TEXT;

-- Admins may manually link a GitHub identity to an employee without OAuth.
-- (Needed for the "map GitHub users to employees" acceptance criterion.)
-- Writes still go through the RLS policies from migration 008.

-- ---------------------------------------------------------------------------
-- 2. automation_events — explicit automation evidence (non-AI)
-- ---------------------------------------------------------------------------
-- Distinct from agent_events (§ spec 6): automation_events records *bot /
-- CI / GitHub App* activity — Dependabot, Renovate, GitHub Actions bots,
-- deployment apps. agent_events records AI-assistant provenance
-- (Copilot/Claude Code/Cursor co-author trailers etc.).
CREATE TABLE IF NOT EXISTS automation_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  source_kind         TEXT CHECK (source_kind IN ('commit','push','pull_request','workflow_run')),
  commit_id           UUID REFERENCES git_commits(id) ON DELETE CASCADE,
  push_event_id       UUID REFERENCES git_push_events(id) ON DELETE CASCADE,
  pull_request_id     UUID REFERENCES git_pull_requests(id) ON DELETE CASCADE,
  -- GitHub id of the source object (run id, delivery-scoped id); used for
  -- workflow_run dedupe where no FK column applies.
  source_github_id    BIGINT,

  bot_type            TEXT NOT NULL DEFAULT 'other'
                      CHECK (bot_type IN ('dependabot','renovate','github-actions','github-app','ci','other')),
  bot_name            TEXT NOT NULL,
  automation_source  TEXT,                          -- login / app slug
  evidence            JSONB NOT NULL DEFAULT '{}',   -- raw metadata that justified detection
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency: exactly one detection row per (bot, source). A plain UNIQUE
-- constraint would NOT work here because Postgres treats NULLs as distinct;
-- partial unique indexes per source kind give real dedupe while allowing the
-- other source columns to be NULL. Ingestion also uses
-- upsert(onConflict: ...) against these indexes.
CREATE UNIQUE INDEX IF NOT EXISTS uq_automation_commit
  ON automation_events(commit_id, bot_name)
  WHERE source_kind = 'commit';
CREATE UNIQUE INDEX IF NOT EXISTS uq_automation_push
  ON automation_events(push_event_id, bot_name)
  WHERE source_kind = 'push';
CREATE UNIQUE INDEX IF NOT EXISTS uq_automation_pr
  ON automation_events(pull_request_id, bot_name)
  WHERE source_kind = 'pull_request';
CREATE UNIQUE INDEX IF NOT EXISTS uq_automation_run
  ON automation_events(source_github_id, bot_name)
  WHERE source_kind = 'workflow_run';

-- ---------------------------------------------------------------------------
-- 2b. agent_events dedupe indexes (008 created the table with NO unique
--     constraint, which would allow duplicate agent detections on webhook
--     replays; ingest upserts rely on these)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_events_commit
  ON agent_events(commit_id, agent_type, agent_name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_events_push
  ON agent_events(push_event_id, agent_type, agent_name)
  WHERE push_event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_events_pr
  ON agent_events(pull_request_id, agent_type, agent_name)
  WHERE pull_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_automation_events_org ON automation_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_automation_events_commit ON automation_events(commit_id);
CREATE INDEX IF NOT EXISTS idx_automation_events_push ON automation_events(push_event_id);
CREATE INDEX IF NOT EXISTS idx_automation_events_pr ON automation_events(pull_request_id);

ALTER TABLE automation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "au_events_select" ON automation_events
  FOR SELECT TO authenticated USING (is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- 3. Evidence hardening
-- ---------------------------------------------------------------------------
-- Faster category filtering for the diff analyzer / reports.
CREATE INDEX IF NOT EXISTS idx_git_commit_files_commit_cat
  ON git_commit_files(commit_id, file_category);

-- Anomalies and reports are recomputed over the underlying evidence; make the
-- recomputation window lookup cheap.
CREATE INDEX IF NOT EXISTS idx_git_commits_account_time
  ON git_commits(git_account_id, committed_at DESC);
CREATE INDEX IF NOT EXISTS idx_git_prs_account_time
  ON git_pull_requests(git_account_id, gh_created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. git_events: allow ingestion to mark retries without conflicting with
--    the idempotency constraint. Nothing structural — just document that
--    duplicate deliveries set processing_status='duplicate' (008 already
--    allows it via the CHECK).
-- ----------------------------------------------------------------------------

-- =============================================================================
-- END OF MIGRATION 009
-- =============================================================================
