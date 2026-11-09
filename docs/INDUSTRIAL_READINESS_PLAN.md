# Industrial Readiness Plan

**Goal:** take this HR application from "working demo with SaaS scaffolding" to a multi-level, multi-tenant SaaS product that can be sold to enterprises and operated safely at scale.

**Status of this document:** derived from a full read of the repo on 2026-08-03. Every claim in "Where we actually are" was verified by reading files or running commands, not inferred. Counts are reproducible with the commands shown.

---

## 1. Where we actually are

### 1.1 The headline problem

A complete multi-tenant foundation already exists and is almost entirely unused.

`supabase/migrations/001_saas_foundation.sql` (868 lines) defines 13 properly designed tenant-scoped tables — every one has `organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`, composite indexes like `(organization_id, status)`, RLS enabled, and `SECURITY DEFINER` helpers (`get_user_org_ids`, `is_org_member`, `has_org_role`).

The application code does not use it. It still reads and writes the original flat, tenant-less tables:

| Legacy table (no `organization_id`) | `from()` calls in `src/` | Intended replacement | Calls |
|---|---|---|---|
| `applications` | 29 | `org_candidates` | **0** |
| `profiles` | 21 | `org_employees` | 6 |
| `tasks` | 15 | `org_tasks` | 1 |
| `leave_requests` | 12 | `org_leave_requests` | **0** |
| `job_postings` | 8 | *(table does not exist)* | — |
| `projects` | 7 | `org_projects` | 2 |
| `announcements` | 4 | `org_announcements` | **0** |
| `performance_reviews` | 4 | `org_performance_reviews` | **0** |
| `work_logs` | 3 | *(table does not exist)* | — |

```bash
# reproduce
for t in applications profiles tasks leave_requests projects announcements; do
  echo "$t $(grep -ro "from('$t'" src/ | wc -l)"; done
```

So the product is, in its actual runtime behaviour, **single-tenant software with a multi-tenant schema sitting next to it unused.** Everything else in this plan is downstream of fixing that.

### 1.2 Verified critical gaps

**Cross-tenant data exposure.** The legacy tables have no tenant column, and 20 of their RLS policies are literally `USING (true)` / `WITH CHECK (true)` (`supabase/rls_applications.sql`, `rls_projects.sql`, `rls_projects_tasks_profiles.sql`, `complete_schema.sql:524,568,575`, `migrations/003_fix_project_rls.sql:97`). Any authenticated user of any tenant can read every other tenant's candidates, résumés, profiles, projects and tasks.

**The hiring pipeline has zero tenant scoping.** `src/app/dashboard/hiring/actions.ts` is 850 lines with 24 database queries and **0 occurrences of `organization_id`**. `deleteApplication` (line ~48) uses the service-role client and deletes by `id` alone, with no ownership check — a valid ID from any tenant deletes that row and its résumé from storage.

**AI agent tools are unscoped by design.** `src/lib/agent/tools/database.ts` exposes 14 LLM-callable tools over legacy tables with no tenant filter. `getWorkforceOverview()` runs three unfiltered full-table scans; `getHiringPipelineStats()` pulls every `applications` row in the database to build a histogram. Write tools (`updateLeaveStatus`, `updateApplicationStatus`) update by ID with no org check.

**Vector search crosses tenants.** `rpc('match_resumes')` (`src/lib/rag/resume-matcher.ts:278`) and `rpc('match_documents')` (`src/lib/rag/retriever.ts:21`) take no org parameter, and `resume_embeddings` / `doc_embeddings` have no tenant column. Semantic search returns other companies' candidates.

**An unauthenticated LLM endpoint.** `src/app/api/agent/scout/route.ts` has no auth import at all. `POST` body goes straight into `generateText` with `maxDuration = 30`. Anyone on the internet can burn Groq tokens against your key, indefinitely.

**A shared "legacy" pseudo-tenant.** `src/lib/auth/session.ts` opens with the comment *"NEVER accept organizationId from form data"*, then falls back to returning a hardcoded `organizationId: 'legacy'` for any user without an `organization_members` row. Two contradictory conventions coexist: `session.ts` resolves org from the session, while `actions/employees.ts`, `payroll.ts` and `api/billing/route.ts` accept `organizationId` from `FormData` and verify it via `requirePermission()`. The second pattern is safe but only because it verifies; the first pattern's fallback is not.

**Stripe webhooks are not idempotent.** `src/app/api/webhooks/stripe/route.ts` verifies the signature correctly (good) but there is no `event.id` dedupe and no processed-events table (`grep -c "idempot\|event\.id"` → 0). Failures return 500, Stripe retries, and plan/limit mutations re-apply. Billing state can drift.

**Checkout leads to a 404.** `/dashboard/billing` is referenced in five places (`api/billing/route.ts:49,50,63`, `components/guards/feature-gate.tsx:61`, `lib/rbac/types.ts:208`) and **does not exist** under `src/app/dashboard/`. Every paying customer lands on a 404 immediately after paying.

**Audit logs are forgeable.** `001_saas_foundation.sql` policy `audit_insert` is `WITH CHECK (is_org_member(organization_id))` — any member can write arbitrary audit rows. `src/lib/audit/index.ts` also swallows write failures into `console.error`, so audit loss is silent.

**Unlimited org creation.** The `org_insert` policy is `WITH CHECK (TRUE)` with no rate limiting. One account can create unbounded organizations, each with a 14-day trial.

### 1.3 Verified operational gaps

- **No CI.** No `.github/` directory. Nothing gates a merge.
- **No tests.** No vitest/jest/playwright, no `test` or `typecheck` script.
- **TypeScript is currently clean** — `npx tsc --noEmit` exits 0 with `strict: true`. That is a real asset and needs to be locked in by CI before it rots.
- **No schema source of truth.** 35 loose `.sql` files at `supabase/` root plus 5 in `migrations/`, two of which are unnumbered (`add_interview_columns.sql`, `add_skills_column.sql`) so ordering is ambiguous. No `supabase/config.toml`, no CLI linkage; file headers say "run this in the SQL Editor". Production schema cannot be reconstructed or verified from the repo. The existence of `inspect-schema.js` and `inspect-local-db.js` at the repo root is itself evidence of this.
- **Prisma is dead weight.** `prisma generate` runs on every production build, but `PrismaClient` is imported **0 times** in `src/`. `prisma/schema.prisma` is vestigial Clerk-era single-tenant modelling with no tenant FK, no indexes, and no `migrations/` directory.
- **No background jobs.** No queue, worker, cron, or `vercel.json`. Résumé upload → `pdf2json` parse → embed → `generateText` → insert all happen inline in one server action, with `serverActions.bodySizeLimit: '10mb'` and no `maxDuration` set on server actions.
- **Rate limiting is a module-level `Map`** (`src/lib/security/index.ts`) with a module-scope `setInterval` cleanup. Per-instance, so it is decorative on serverless.
- **Env validation exists but is never called.** `validateEnv()` is defined at `src/lib/security/index.ts:163` and referenced nowhere else. Everything else uses `process.env.X!`, so misconfiguration surfaces as runtime 500s. No `.env.example`.
- **No observability.** No Sentry, no structured logger, no metrics, no `/health`. 213 `console.*` calls. `api/agent/scout` and `api/agent/learning` return *fabricated fallback AI content* on error, so failures are invisible to users and to monitoring.
- **`zod` is imported but not declared** in `package.json`; it resolves transitively through `ai`. A dependency bump can break the build.
- **Middleware does a live DB query on every dashboard request** (`src/middleware.ts`, org-membership check) and catches auth failures with `console.warn` then continues.
- **Unbounded queries.** 31 `select('*')` calls, almost no pagination. List pages fetch entire tables.
- **Arbitrary user code execution, unaudited.** `src/lib/code-runner/{js,python}-runner.ts` powers the project workspace. Sandboxing has not been reviewed.

### 1.4 What "multi level" requires that does not exist yet

The current schema is **single-level**: a flat list of organizations, each with a flat member list. To support the hierarchy implied by "multi level SaaS" (reseller/parent company → subsidiary → department → team), we need:

- Organization hierarchy (`parent_organization_id` + materialized path or closure table).
- Org units / departments as first-class entities, not the `department TEXT` column on `org_employees`.
- Role assignments scoped to a level, not just to an org. Today there are **three competing role models**: the `org_role` enum (`owner|hr|recruiter|manager|employee`), legacy `profiles.role` strings (`HR_ADMIN|CHAIRMAN|MANAGER|RECRUITER`) mapped in `session.ts:100-120`, and Prisma's `enum Role { HR_ADMIN, EMPLOYEE }`.
- An entitlement/plan engine. `organizations.max_employees` exists but enforcement is ad hoc.
- Org switching. `src/context/OrganizationContext.tsx` exists but there is no switcher route; `session.ts` and `lib/organization/index.ts` both just `.limit(1).single()` with a comment that a real implementation "would use a cookie/session preference".

---

## 2. Guiding principles

1. **Tenant isolation is a structural property, not a code review habit.** Any design where a developer *can* forget `.eq('organization_id', …)` will eventually leak. Enforce at the database (RLS) *and* make the app layer incapable of issuing an unscoped query.
2. **Defense in depth.** RLS is the backstop, not the primary control. Application-layer scoping catches service-role paths where RLS does not apply.
3. **One source of truth per concern.** One schema, one role model, one tenant resolver, one migration history.
4. **Fix isolation before adding features.** Every feature built on the legacy tables increases migration cost and widens the leak.
5. **Prefer deleting over maintaining.** Prisma, 35 loose SQL files, and the root-level inspect scripts should go, not be tidied.

---

## 3. Phased plan

Each phase has an explicit exit gate. Do not start a phase before the previous gate passes.

### Phase 0 — Ground truth and a safety net

Nothing can be safely changed while the production schema is unknown and nothing gates a merge.

| # | Task | Detail |
|---|---|---|
| 0.1 | Adopt Supabase CLI | `supabase init`, link the project, `supabase db pull` to generate an authoritative baseline migration reflecting what production *actually* is. |
| 0.2 | Freeze and archive loose SQL | Move all 35 `supabase/*.sql` files to `supabase/_archive/` with a README stating they are historical and must not be run. All future changes go through numbered migrations only. |
| 0.3 | Rename unnumbered migrations | `add_interview_columns.sql` → `004_…`, `add_skills_column.sql` → `005_…` (verify against the pulled baseline first). |
| 0.4 | Add CI | `.github/workflows/ci.yml`: `tsc --noEmit`, `eslint`, `next build`, migration-drift check. Add `typecheck` and `test` scripts to `package.json`. tsc passes today — lock it in now. |
| 0.5 | Declare `zod` explicitly | Add to `dependencies` at the version currently resolved. |
| 0.6 | Wire up `validateEnv()` | Call it at server startup (`instrumentation.ts`). Convert `process.env.X!` sites to `getEnv()`. Commit `.env.example` with all 17 referenced var names. |
| 0.7 | Decide Prisma's fate | Recommendation: **remove it.** 0 usages in `src/`, misleading schema, and it costs a `prisma generate` on every production build. If instead you want a typed data layer, that is Phase 1.3's job and should be built against the real schema. |
| 0.8 | Delete root debug scripts | `inspect-schema.js` loads the service-role key at the repo root. Remove both; `supabase db pull` replaces them. |
| 0.9 | Test harness | Vitest for unit, Playwright for E2E. First test written in Phase 1.6. |

**Gate:** CI is green and required on `main`; the repo can regenerate the production schema from `supabase/migrations/` alone.

### Phase 1 — Close the tenant isolation holes

This is the phase that makes the product sellable. Treat it as a security incident response, not a refactor.

| # | Task | Detail |
|---|---|---|
| 1.1 | Emergency patches (same day) | Add auth + rate limit to `api/agent/scout`. Add an ownership check to `deleteApplication`. Remove the `organizationId: 'legacy'` fallback from `session.ts` — users without a membership go to onboarding, never to a shared tenant. |
| 1.2 | Choose the migration strategy | Two options: **(A)** add `organization_id NOT NULL` to the legacy tables and keep them; **(B)** complete the cut-over to the `org_*` tables that already exist and drop the legacy ones. **Recommend (B)** — the target schema, indexes, and RLS are already written and reviewed; (A) means maintaining two parallel designs forever. Cost of (B) is rewriting ~100 query sites. |
| 1.3 | Build a tenant-scoped data access layer | Single choke point, e.g. `getOrgDb(session)` returning a client where every table accessor pre-applies `.eq('organization_id', session.organizationId)`. Direct `createClient()` use in feature code becomes a lint error. This is what makes 1.2 durable — after it, an unscoped query is not something a developer *can* write by accident. |
| 1.4 | Unify the tenant resolver | One function. Org comes from the session plus a signed active-org cookie, verified server-side against `organization_members` on every use. Delete the FormData-`organizationId` convention (keep the verification logic, drop the client-supplied input). |
| 1.5 | Rewrite RLS | Replace all 20 `USING (true)` policies. Every table gets tenant-scoped policies built on the existing `is_org_member` / `has_org_role` helpers. Set `organization_id` as a JWT claim or per-transaction `SET LOCAL app.current_org` so policies do not need a subquery per row. |
| 1.6 | Isolation test suite | **The most valuable tests in the codebase.** Seed two orgs; for every table and every RPC, assert that org A's session cannot read, update, or delete org B's rows. Run in CI. This is the artifact you show an enterprise buyer's security reviewer. |
| 1.7 | Scope the AI agent | Rewrite all 14 tools in `agent/tools/database.ts` onto the scoped DAL. Push aggregation into SQL — `getHiringPipelineStats` must be a `GROUP BY`, not a full-table fetch counted in JS. |
| 1.8 | Scope vector search | Add `organization_id` to `resume_embeddings` / `doc_embeddings`, add it as a required parameter to `match_resumes` / `match_documents`, and filter *inside* the RPC before the ANN search. |
| 1.9 | Scope storage | Prefix all object paths with `{organization_id}/`. Write bucket policies for `resumes` and `kb-documents` that enforce the prefix. Fix `kb-actions.ts:39`, which discards the upload result so failures pass silently. |
| 1.10 | Contain the service role | `createAdminClient` is used in 6 app paths, including `dashboard/hiring/page.tsx` — a render path with RLS bypassed. Move all legitimate uses behind a small audited module; add an ESLint rule banning imports elsewhere. |

**Gate:** the Phase 1.6 isolation suite passes for every table, RPC, and storage bucket; zero `USING (true)` policies remain; zero unscoped queries outside the audited service-role module.

### Phase 2 — Multi-level tenancy

Now that isolation is real, add the hierarchy.

| # | Task | Detail |
|---|---|---|
| 2.1 | Org hierarchy | `organizations.parent_organization_id` + materialized path (`path LTREE` or a closure table) for efficient subtree queries. Decide the isolation rule explicitly: **does a parent see child data by default?** Encode that in RLS, do not leave it to application code. |
| 2.2 | Org units | First-class `org_units` (departments, teams, cost centres) replacing `org_employees.department TEXT`. |
| 2.3 | One role model | Collapse the three role models into one. Role assignments become `(user, scope_type, scope_id, role)` so a user can be `manager` of one unit and `employee` elsewhere. Migrate legacy `profiles.role` values and delete the mapping in `session.ts`. |
| 2.4 | Permission resolution | Effective permissions = union over the scope chain (unit → org → parent org). Cache per request. |
| 2.5 | Entitlements engine | `plan_entitlements` table (seats, feature flags, AI request quotas, storage). Enforce at the DAL boundary, not per-feature. Replace the ad hoc `max_employees` check. |
| 2.6 | Org switcher | Signed active-org cookie, server-verified. Wire up the existing `OrganizationContext.tsx`. Handle users with memberships in multiple orgs — today `.limit(1).single()` silently picks one. |
| 2.7 | Rate-limit org creation | `org_insert` is currently `WITH CHECK (TRUE)`. Cap orgs per user and per IP; require email verification before trial starts. |

**Gate:** a three-level fixture (parent → subsidiary → department) passes an extended isolation suite, including the parent-visibility rule.

### Phase 3 — Billing and money correctness

| # | Task | Detail |
|---|---|---|
| 3.1 | Webhook idempotency | `stripe_processed_events(event_id PK, processed_at)`. Insert-then-process inside a transaction; ignore duplicates. |
| 3.2 | Webhook durability | Persist raw events, process asynchronously, add a dead-letter table and a replay tool. Stop returning 500 for permanent failures — Stripe will retry forever. |
| 3.3 | Stop trusting metadata | `session.metadata.organization_id` is trusted today. Resolve the org from `stripe_customer_id` and verify it matches. |
| 3.4 | Build `/dashboard/billing` | Referenced in 5 places, does not exist. Every checkout currently ends on a 404. |
| 3.5 | Seat metering | Reconcile seats against `organization_members` on a schedule; enforce on invite; handle downgrades that exceed the new plan's seat count. |
| 3.6 | Fix `GET /api/invite/accept` | State-changing RPC on a GET, so link prefetchers and CSRF can trigger it, and the token lands in access logs and `Referer`. Make it a POST behind a confirmation page. |
| 3.7 | Tamper-proof audit log | Drop the member-level INSERT policy; write via service role only. Stop swallowing failures in `lib/audit/index.ts`. Add hash chaining if you need non-repudiation for enterprise buyers. |

**Gate:** replaying a captured Stripe event stream twice produces identical final state; a full signup → checkout → upgrade → downgrade → cancel journey passes E2E.

### Phase 4 — Scale and performance

| # | Task | Detail |
|---|---|---|
| 4.1 | Get AI and PDF work off the request path | Introduce a job queue (Inngest, QStash, or `pg-boss` on the existing Postgres). Jobs: résumé parse, embed, JD embed, performance-review generation, assessment generation, email send. Job rows carry `organization_id`, status, attempts, and a DLQ. Two Supabase Edge Functions (`resume-parser`, `send-email`) already exist unwired — wire or replace them. |
| 4.2 | Bound the upload path | Validate file type and size at the action boundary, not just via the 10 MB body limit. Upload → enqueue → return; parse out of band. |
| 4.3 | Pagination everywhere | Keyset pagination on every list. Eliminate the 31 `select('*')` calls; select explicit columns. |
| 4.4 | Aggregate in SQL | Replace count-in-JS (`getWorkforceOverview`, `getHiringPipelineStats`, dashboard tiles) with SQL aggregates or materialized views refreshed per org. |
| 4.5 | Fix middleware cost | Replace the per-request `organization_members` query with a signed cookie carrying org + role, refreshed on change. Also stop catch-and-continue on auth failure — fail closed. |
| 4.6 | Distributed rate limiting | Replace the in-memory `Map` with Redis (Upstash) or a Postgres token bucket. Key on verified identity, never on client-supplied input. Tier limits by plan. |
| 4.7 | Connection management | Route through Supavisor/pgBouncer; size pools for serverless concurrency. Plan for read replicas for reporting. |
| 4.8 | pgvector strategy | HNSW indexes on the 1024-dim embedding columns; tune `ef_search`. Ensure the org filter is applied pre-ANN. Consider per-tenant partitioning at high row counts. |
| 4.9 | Caching | `unstable_cache` / `revalidateTag` with **org-scoped cache tags**. A cache key without the tenant in it is a cross-tenant leak — treat cache keys with the same rigour as queries. |
| 4.10 | Split oversized modules | `hiring/actions.ts` (850 lines), `agent/tools/database.ts` (430). |
| 4.11 | Load test | Tenant-realistic fixtures: 1k orgs × 500 employees. Establish p95 baselines per route before optimising further. |

**Gate:** documented p95 latency and error-rate budgets met under load test; no unbounded query remains; all AI work is asynchronous.

### Phase 5 — Observability and operations

| # | Task | Detail |
|---|---|---|
| 5.1 | Structured logging | Replace 213 `console.*` calls with a structured logger emitting `request_id`, `organization_id`, `user_id`, route, duration. Never log PII or résumé content. |
| 5.2 | Error tracking | Sentry (or equivalent) with release tracking and source maps, tagged by org. |
| 5.3 | Stop fabricating success | `api/agent/scout` and `api/agent/learning` return fake AI content on error. Return a real error state; surface degradation to users and to monitoring. |
| 5.4 | Tracing | OpenTelemetry spans across request → job → DB → LLM provider. LLM latency will dominate; you need to see it. |
| 5.5 | Health endpoints | `/api/health` (liveness) and `/api/ready` (DB, storage, LLM provider reachability). |
| 5.6 | SLOs and alerts | Define availability and latency SLOs per critical journey (login, dashboard, résumé upload, checkout). Alert on burn rate, not on raw errors. |
| 5.7 | Cost controls | Per-org AI token metering and quotas; alert on anomalous spend. Currently a single tenant can consume unlimited LLM budget. |
| 5.8 | Backup and DR | Verify PITR is on; run a **restore drill** and document RTO/RPO. An untested backup is not a backup. |
| 5.9 | Runbooks | Incident response, tenant data export, tenant deletion, key rotation, migration rollback. |

**Gate:** an induced failure (DB unavailable, LLM provider down, bad deploy) is detected by alerting within the SLO window and diagnosed from telemetry alone.

### Phase 6 — Security and compliance

| # | Task | Detail |
|---|---|---|
| 6.1 | Encrypt sensitive fields | `org_employees.salary` is commented `-- encrypted at app layer`. It is not — only `maskSalary`/`redactSensitiveFields` exist, which are display-time helpers. Implement real envelope encryption (KMS) for salary, bank, and tax fields, or move them to a separately-permissioned table. |
| 6.2 | Prompt injection hardening | Candidate-supplied résumé text flows straight into LLM prompts, and those LLMs have write tools. This is the highest-severity AI risk here: a crafted résumé could attempt to drive tool calls. Separate untrusted content from instructions, constrain tool schemas, require confirmation for writes, and log every tool invocation. |
| 6.3 | Audit the code runner | `src/lib/code-runner/{js,python}-runner.ts` executes user-authored code. Needs its own threat model and a real sandbox (isolated runtime, no network, CPU/memory caps, no secret access). Treat as a blocker for enterprise sale. |
| 6.4 | Secret management | Move to a managed secret store with rotation. Rotate everything that has been on a developer machine. Ensure the service-role key is never reachable from client bundles. |
| 6.5 | Data lifecycle | Retention policies, hard-delete pipeline, tenant data export, GDPR/DPDP subject access and erasure. Requires the tenant-complete schema from Phase 1. |
| 6.6 | Enterprise auth | SAML/OIDC SSO and SCIM provisioning. `organizations.domain` already anticipates this. Add MFA and session policy controls. |
| 6.7 | External review | Third-party penetration test focused on tenant isolation. Then pursue SOC 2 Type II if enterprise deals require it. |
| 6.8 | Dependency and supply chain | Dependabot, `npm audit` in CI, pinned versions, SBOM. |

**Gate:** external pen test finds no cross-tenant or privilege-escalation issues; compliance evidence collection is automated.

### Phase 7 — Release engineering

| # | Task | Detail |
|---|---|---|
| 7.1 | Environments | Real dev / staging / production with separate Supabase projects. Preview deploys get ephemeral databases seeded from anonymised fixtures. |
| 7.2 | Migration discipline | Migrations reviewed, forward-only, expand/contract for zero-downtime. Drift detection in CI. Documented rollback per migration. |
| 7.3 | Feature flags | Per-org flags for staged rollout, decoupled from plan entitlements. |
| 7.4 | Progressive delivery | Canary or blue/green with automatic rollback on SLO burn. |
| 7.5 | Tenant lifecycle automation | Provisioning, suspension, deletion, and (later) per-tenant data residency. |

**Gate:** a schema-changing release ships to production with no downtime and a rehearsed rollback.

---

## 4. Sequencing

Phases 0 and 1 are strictly sequential and block everything else. After that:

```
Phase 0 ──► Phase 1 ──┬──► Phase 2 ──┐
                      ├──► Phase 3 ──┼──► Phase 6 ──► Phase 7
                      └──► Phase 4 ──┘
                              │
                           Phase 5 (start early, runs continuously)
```

Phase 5 observability should begin during Phase 1 — you want telemetry in place *before* the large query rewrite, so regressions are visible.

Rough relative effort, assuming a small team: Phase 0 is days. Phase 1 is the largest single body of work (~100 query sites plus the DAL and the isolation suite) and dominates the schedule. Phases 2–4 are comparable to each other and smaller than Phase 1. Phases 5–7 are ongoing rather than finite.

---

## 5. First 48 hours

If only three things happen this week, these:

1. **Authenticate and rate-limit `api/agent/scout`.** An open endpoint on your paid LLM key is being exploited or will be. One-line-of-defence fix, minutes of work.
2. **Add CI running `tsc --noEmit` + `eslint` + `next build`.** The type checker passes cleanly right now. That is a perishable asset.
3. **`supabase db pull` into a baseline migration and archive the 35 loose SQL files.** Until the schema is knowable, no isolation work can be verified.

Then start Phase 1.2 — the strategy decision on legacy vs `org_*` tables — because everything in Phase 1 depends on it.

---

## 6. Definition of "industrial ready"

The product is industrially ready when all of the following are true and continuously verified in CI:

- **Isolation:** an automated suite proves no tenant can read or mutate another's data through any table, RPC, storage bucket, cache key, vector index, or AI tool. An unscoped query is impossible to write without a lint failure.
- **One schema:** production is reconstructible from `supabase/migrations/` alone, with drift detection and rehearsed rollback.
- **Correct money:** billing is idempotent under event replay; seats and entitlements are enforced at a single boundary.
- **Bounded work:** no unbounded query, no synchronous LLM or PDF work on the request path, every list paginated.
- **Observable:** every request and job is traceable by org; failures alert before customers report them; no failure path fabricates success.
- **Recoverable:** a restore has actually been performed, with documented RTO/RPO and runbooks.
- **Defensible:** sensitive fields encrypted at rest, prompt injection contained, user code sandboxed, secrets rotated, external pen test clean.
- **Hierarchical:** a parent → subsidiary → department structure works, with an explicitly encoded and tested visibility rule.

---

## 7. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Cross-tenant leak reaches production customers | Existential — breach disclosure, contract loss | Phase 1 before any onboarding of a second real tenant |
| Prompt injection via résumé drives agent write tools | Data corruption, unauthorised state change | Phase 6.2; until then, remove write tools from agent paths that ingest untrusted text |
| Unsandboxed code runner | Remote code execution on your infrastructure | Phase 6.3; consider disabling the feature until audited |
| Unknown production schema | Migrations fail or silently diverge | Phase 0.1 before any schema change |
| Legacy-table rewrite regresses behaviour with no tests | Prolonged instability | Write the isolation suite (1.6) and E2E journeys *before* the rewrite, not after |
| Uncapped LLM spend | Runaway cost from one tenant or one attacker | Phases 1.1 and 5.7 |
| Team keeps shipping features on legacy tables | Migration cost grows faster than it is paid down | Freeze new feature work on legacy tables at the start of Phase 1 |

---

*Verification note: table-usage counts, RLS policy counts, absence of CI/tests/Prisma usage, the missing `/dashboard/billing` route, the unauthenticated scout route, the missing webhook idempotency, and the uncalled `validateEnv()` were each confirmed directly against the repo. The contents of the live production database could not be verified from the repo — that is finding 1.3 and task 0.1.*
