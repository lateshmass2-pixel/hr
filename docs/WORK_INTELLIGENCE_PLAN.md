# Work Intelligence — Implementation Plan (from codebase audit)

## Audit findings (2026-09-25)

Stack (reuse, do not replace): Next.js 16 App Router · TypeScript · Tailwind ·
shadcn-style UI kit (`src/components/ui`) · Supabase SSR + admin clients
(`src/lib/supabase/server.ts`) · session via `getSession()` / `requireSession()`
(`src/lib/auth/session.ts`) · RBAC roles `owner|hr|recruiter|manager|employee`
(`src/lib/rbac`) · org-scoped schema from `001_saas_foundation.sql`
(organizations, organization_members, org_employees, org_projects, org_tasks,
helpers `is_org_member()`, `has_org_role()`, `update_updated_at_column()`) ·
AI via Groq (`src/lib/ai/index.ts`) · audit lib (`src/lib/audit`) · vitest unit
project `tests/unit`.

Already present (Phase 1 work by predecessor, partially broken):
- `supabase/migrations/008_work_intelligence.sql` — complete schema + RLS. KEEP.
- `src/app/api/auth/github/*` — OAuth start/callback. Redirects point to wrong pages; encryption has unsafe default key.
- `src/app/api/integrations/github/webhook/route.ts` — ingestion with bugs:
  inserts `pusher_account_id` (column does not exist → every push insert fails),
  body consumed twice (text() then json()), uses `pull_request.number` (wrong —
  top-level `number`), no enrichment (no signatures, co-authors, agent provenance).
- `src/app/api/github/accounts/*` — NO authentication (security hole), selects
  non-existent columns (`is_bot`, `bot_type`, `automation_source` on git_accounts).
- `src/app/settings/integrations/github/page.tsx` — TS errors, wrong Switch API,
  links to repositories page that does not exist.

## Phases (mapped to spec §31)

1. ✅ Audit (this doc)
2. DB: keep 008; add `009_work_intelligence_followup.sql`
   (git_accounts: sync_enabled/is_bot/bot_type/automation_source/identity_source;
   `automation_events` table + RLS).
3. OAuth: fix redirect paths (`/settings/integrations/github`), refuse to store
   token when `ENCRYPTION_KEY` missing, keep AES-256-GCM.
4. Repositories: `/api/github/repositories` (+[id]) with manager RBAC; admin UI
   `/settings/integrations/github/repositories`; map repo→project.
5. Webhook: rewrite route to thin handler calling
   `lib/work-intelligence/ingest.ts` — verify signature over raw body once,
   idempotent by delivery_id, per-event processors with identity resolution,
   bot/agent detection, branch upsert, task correlation hooks.
6. Models: commit/push/PR/review/CI writers live in ingest.ts + sync.ts.
7. Identity: `identity.ts` — github_user_id > email > push-actor fallback
   (labeled), manual overrides; never assume author==employee.
8. Diff: `diff-analyzer.ts` — file categories, deterministic change category,
   meaningful score; enrichment pulls stats/patches/signatures via REST.
9. Timeline: `timeline.ts` — union of commits/pushes/PRs/reviews/CI/anomalies
   per employee-day; no continuous-work claims.
10. Bots/agents: `bots.ts` (explicit only), `agents.ts` (co-author trailers,
    app identity, explicit footers; COPILOT/CLAUDE/CODEX/CURSOR/CUSTOM/UNKNOWN).
11. Correlation: `correlation.ts` — branch-name patterns, `#task-ref` in
    messages/PR bodies, task IDs; manual links via server action.
12. Anomalies: `anomaly.ts` — burst, tiny-commit ratio, generated-only,
    identical messages, identity mismatch, unmapped actor, baseline deviation.
    Severities NORMAL/UNUSUAL/REVIEW_REQUIRED/INSUFFICIENT_EVIDENCE; every row
    stores rule code/version/evidence.
13. Reports: `reports.ts` — daily per employee; evidence checklist, automation
    summary, anomaly summary, authenticity status + reason.
14. Dashboards: `/dashboard/work-intelligence` (+daily, git-activity, timeline,
    authenticity, ai-automation, anomalies).
15. Employee page: `/employees/[id]/work-intelligence` (all sections).
16. AI: `ai-summary.ts` — FACT/INFERENCE/UNKNOWN constrained Groq prompt over
    records only; deterministic fallback when no key.
17. Security/RLS: 008 policies + route guards on every new endpoint; service-role
    only for ingestion.
18. Tests: pure-engine unit tests + webhook idempotency + fixtures for the 10
    scenarios from spec §27.
19. Performance: incremental REST sync (`sync.ts`, per-repo cursors, last_synced_at),
    webhook-first, indexes from 008, pagination in queries.
20. Production: env vars documented, error states (REAUTH_REQUIRED etc.),
    sync status per repo.

## Env vars
GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_WEBHOOK_SECRET (existing);
ENCRYPTION_KEY (token at-rest encryption — required to store OAuth tokens);
CRON_SECRET (protects scheduled sync endpoint).

## Non-goals (spec §23, §11)
No keystroke/screen/AV surveillance; no "AI detector" guessing from source text.
