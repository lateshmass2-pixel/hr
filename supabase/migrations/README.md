# Migrations — the single source of truth for schema

Every schema change lives here, numbered, in order. Nothing else defines the
database. `supabase/_archive/` is history and must never be run.

## Rules

1. **Numbered and ordered.** `NNN_short_description.sql`, zero-padded, strictly
   increasing. An unnumbered file has no defined position and will be rejected
   in review — that ambiguity is why `add_interview_columns.sql` and
   `add_skills_column.sql` had to be renamed.
2. **Idempotent.** Use `IF NOT EXISTS`, `CREATE OR REPLACE`, and guarded
   `DO $$ ... $$` blocks. CI applies every migration twice; the second pass must
   succeed. A migration that only works once cannot be safely retried after a
   partial deploy failure.
3. **Forward only.** Never edit a migration that has been applied anywhere.
   Write a new one. Editing history means environments silently diverge.
4. **Expand/contract for anything destructive.** To remove or rename a column:
   add the new shape, migrate reads and writes, deploy, *then* drop in a later
   migration. Never drop in the same release that stops using it — that
   forecloses rollback.
5. **Never run SQL by hand against production.** If it is not in this directory,
   it did not happen.

## Applying them

```bash
# once, to link the local project to the remote Supabase project
supabase link --project-ref <your-project-ref>

supabase db push        # apply pending migrations
supabase migration list # compare local and remote
```

## Required next step: capture a baseline

**These migrations cannot currently be validated end to end, and this is the
most important outstanding schema task.**

Migrations `004`–`007` alter legacy tables (`applications`, `job_postings`)
whose `CREATE TABLE` statements exist only in `supabase/_archive/`. Applying
`001`–`007` to an empty database therefore fails at `004`. More importantly,
nobody can prove what production actually contains, because it was built by
hand-running the archived scripts in an unrecorded order.

Fix it by capturing the real production schema as migration `000`:

```bash
supabase link --project-ref <your-project-ref>

# writes the current remote schema into supabase/migrations/
supabase db pull

# rename the generated file so it sorts before 001
mv supabase/migrations/<timestamp>_remote_schema.sql \
   supabase/migrations/000_baseline_remote_schema.sql
```

Then review it carefully — it is a factual record of production, including any
drift and any leftover permissive policy from the archived scripts. Expect
surprises; that is the point.

Once `000_baseline_*.sql` exists, the `migrations` job in
`.github/workflows/ci.yml` automatically switches from a warning to a hard
gate: it applies the full chain to a clean Postgres and then re-applies it to
prove idempotency.

Until then that job reports a warning and cannot verify anything. Do not read
its green status as evidence the migrations are correct.

## Current migrations

| # | File | What it does |
|---|---|---|
| 001 | `001_saas_foundation.sql` | Multi-tenant foundation: 13 `org_*` tables, each with `organization_id NOT NULL`; RLS; `SECURITY DEFINER` helpers (`get_user_org_ids`, `is_org_member`, `has_org_role`); `accept_invitation` and `create_organization` RPCs |
| 002 | `002_backfill.sql` | Copies legacy rows into the `org_*` tables |
| 003 | `003_fix_project_rls.sql` | Project RLS corrections |
| 004 | `004_applications_interview_columns.sql` | Interview scheduling columns on `applications` |
| 005 | `005_applications_display_fields.sql` | `skills` and `position` on `applications` (merges two earlier overlapping scripts) |
| 006 | `006_resume_embeddings.sql` | Persistent resume vector store + `match_resumes` cosine search (BGE-M3, 1024 dims, HNSW index) |
| 007 | `007_job_postings_jd_embedding.sql` | Caches each job's JD embedding so resume matching does not re-embed per upload |

## Known gaps in the current schema

Tracked in `docs/INDUSTRIAL_READINESS_PLAN.md`; listed here because they are
schema-level and will be fixed by migrations:

- **`resume_embeddings` and `doc_embeddings` have no `organization_id`**, and
  `match_resumes` / `match_documents` take no tenant parameter. Semantic search
  therefore returns other tenants' candidates. (Plan 1.8)
- **The legacy tables have no tenant column at all** — `applications`,
  `profiles`, `tasks`, `leave_requests`, `job_postings`, `projects`,
  `announcements`, `work_logs`, `performance_reviews`. (Plan 1.2)
- **`audit_logs` INSERT policy is `is_org_member(organization_id)`**, so any
  member can forge audit entries. Should be service-role only. (Plan 3.7)
- **`organizations` INSERT policy is `WITH CHECK (TRUE)`** — unlimited org
  creation per user, no rate limit. (Plan 2.7)
- **`org_candidates.job_posting_id` is a bare UUID with no foreign key**, and
  no `org_job_postings` table exists. (Plan 1.2)
- **`org_projects.member_ids` is a `UUID[]`** rather than a join table, so
  membership cannot be indexed or constrained. (Plan 2.2)
- **`org_employees.salary` is commented "encrypted at app layer" but is not
  encrypted.** Only display-time masking exists. (Plan 6.1)
