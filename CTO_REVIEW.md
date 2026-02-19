# 🔍 CTO Architecture Review — HEMS SaaS Foundation (Phase 1)

**Reviewed:** February 14, 2026
**Scope:** Multi-tenant schema, RLS, RBAC, billing, audit, middleware, security utilities
**Target Scale:** 10,000 organizations

---

## Executive Summary

The Phase 1 foundation provides a **reasonable starting point for <100 orgs** but has **7 critical gaps** and **12 moderate risks** that will cause failures between **500–2,000 orgs**. The architecture correctly chose shared-database multi-tenancy and RLS, but the implementation has performance cliffs, security holes that could lead to cross-tenant data leaks, and SaaS anti-patterns that will compound as you scale.

**Verdict: Ship for early beta, but prioritize the Critical items before onboarding paying customers.**

---

## ⛔ CRITICAL — Fix Before Production

### 1. Middleware Runs a DB Query on EVERY Request

**File:** `src/middleware.ts` (lines 78-84)

```typescript
// This runs on EVERY /dashboard/* request — including static assets
const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .single();
```

**Risk at 10K orgs:** At 100 concurrent users per org = 1M concurrent sessions. Each page navigation triggers this query. That's **~50K queries/sec** just for membership checks — before any actual data fetching.

**Fix:**
```
1. Cache org membership in a signed JWT claim or HttpOnly cookie
2. Set a short TTL (5 minutes) and refresh on role changes
3. Only hit the DB when the cookie is missing or expired
4. Consider Supabase Edge Functions for this check
```

---

### 2. RLS Helper Functions Are SECURITY DEFINER Without Proper Guardrails

**File:** `001_saas_foundation.sql` (lines 368-445)

All 4 helper functions (`get_user_org_ids`, `is_org_member`, `get_user_org_role`, `has_org_role`) are `SECURITY DEFINER`. This means they execute with the **privileges of the function creator** (usually `postgres` superuser), not the calling user.

**Risk:** If there's a SQL injection path anywhere upstream, the attacker runs queries with superuser context. Additionally, `SECURITY DEFINER` functions bypass RLS on the tables they query — which is intended here, but creates a hidden trust chain.

**Fix:**
- Change `get_user_org_ids`, `is_org_member`, and `get_user_org_role` to `SECURITY INVOKER` — they don't need elevated privileges since `organization_members` has RLS policies that allow authenticated users to SELECT their own memberships.
- Keep `SECURITY DEFINER` only on `accept_invitation` and `create_organization` where it's genuinely needed to bypass RLS.
- Add `REVOKE ALL ON FUNCTION ... FROM PUBLIC` to explicitly limit who can call these.

---

### 3. `member_ids UUID[]` on `org_projects` Is a Data Integrity Timebomb

**File:** `001_saas_foundation.sql` (line 187)

```sql
member_ids UUID[] DEFAULT '{}',
```

**Problems:**
- **No FK enforcement** — UUIDs in the array can reference deleted users or users from other organizations. This is a cross-tenant data leak vector.
- **No index support** — Queries like "show me all projects where I'm a member" require `@>` array operators which don't use standard B-tree indexes and perform full table scans.
- **Unbounded growth** — No size limit on the array. A client bug could insert thousands of UUIDs.

**Fix:**
```sql
-- Replace with a proper join table
CREATE TABLE org_project_members (
    project_id UUID NOT NULL REFERENCES org_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('lead', 'member', 'viewer')),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);
-- With proper RLS and indexes
```

---

### 4. Salary Stored as Plaintext `NUMERIC(12,2)`

**File:** `001_saas_foundation.sql` (line 130)

```sql
salary NUMERIC(12,2), -- encrypted at app layer
```

The comment says "encrypted at app layer" but **no encryption is actually implemented anywhere**. The `maskSalary()` function in `security/index.ts` only masks the display — the raw salary is stored and transmitted in plaintext.

**Risk:** Any Supabase dashboard user, DB admin, or compromised backup exposes all salaries. At 10K orgs, this is a compliance liability (GDPR Article 32 — pseudonymization/encryption of personal data).

**Fix:**
```
1. Encrypt salary at the application layer before INSERT using pgcrypto:
   INSERT INTO org_employees (..., salary) VALUES (..., pgp_sym_encrypt($1, $key))
2. Decrypt only in server actions, never in client-visible queries.
3. Store the encryption key in a secrets manager (not .env).
4. Or use Supabase Vault for column-level encryption.
```

---

### 5. No Organization ID Verification in RLS for Cross-Tenant Writes

**File:** `001_saas_foundation.sql` (lines 585-595)

```sql
CREATE POLICY "emp_insert" ON org_employees
  FOR INSERT TO authenticated
  WITH CHECK (has_org_role(organization_id, 'hr'));
```

**Risk:** The `WITH CHECK` only verifies the user has the HR role in the **target** organization. But there's no additional check that the `organization_id` in the INSERT actually belongs to the user. Since `has_org_role` queries `organization_members`, this is implicitly correct — BUT it relies entirely on the `SECURITY DEFINER` function behaving correctly.

More critically: **`emp_update` and `emp_delete`** use `USING` clauses that only check role, not that the `organization_id` in the row matches:

```sql
CREATE POLICY "emp_update" ON org_employees
  FOR UPDATE TO authenticated
  USING (has_org_role(organization_id, 'hr'));
```

A user who is HR in Org A could theoretically craft a request to update an employee row that belongs to Org B if there's any path that doesn't include `organization_id` in the WHERE clause. The `USING` clause does reference the row's own `organization_id`, which is correct — but this is a fragile pattern.

**Fix:**
- Add explicit double-check:
```sql
USING (
  organization_id IN (SELECT get_user_org_ids())
  AND has_org_role(organization_id, 'hr')
)
```
- This ensures the row's org_id is in the user's allowed set AND they have the right role.

---

### 6. In-Memory Rate Limiter Doesn't Work in Serverless

**File:** `src/lib/security/index.ts` (line 14)

```typescript
const rateLimitStore = new Map<string, RateLimitEntry>();
```

**Reality:** In Vercel/serverless deployments, each function invocation may run in a **different isolate**. The `Map` resets on cold starts and isn't shared across instances. An attacker sending requests fast enough will hit different instances and bypass rate limiting entirely.

**Fix:**
```
Priority: HIGH (this is a false sense of security)
1. Use Upstash Redis with @upstash/ratelimit (designed for serverless)
2. Or use Vercel KV (built on Redis)
3. Or at minimum, use Supabase RPC to implement rate limiting in the DB
4. COST: ~$10/month for Upstash starter
```

---

### 7. Audit Logs Use User's Supabase Client (Not Service Role)

**File:** `src/lib/audit/index.ts` (line 104)

```typescript
const supabase = await createClient(); // ← uses user's auth context
```

**Problem:** The RLS policy for `audit_logs` INSERT is:
```sql
WITH CHECK (is_org_member(organization_id))
```

This means audit writes go through the user's permissions. If a user is removed from an org mid-session, their final actions won't be audited. Worse, if any RLS check fails, the **main operation succeeds but the audit silently fails** (caught by the try/catch).

**Fix:**
- Use the **service role client** for audit writes (bypasses RLS entirely):
```typescript
import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
// Use adminClient for audit inserts
```
- Remove the `audit_insert` RLS policy entirely.

---

## ⚠️ HIGH — Fix Before 1,000 Orgs

### 8. No Connection Pooling Strategy

Every `createClient()` call creates a new Supabase client. At 10K orgs with 50 users each, you'll exhaust Supabase connection limits (~500 direct connections on Pro plan).

**Fix:**
- Use Supabase's built-in connection pooler (Supavisor) via the pooler URL
- Set `NEXT_PUBLIC_SUPABASE_URL` to the pooler endpoint for client-side
- Keep direct connection only for migrations and admin tasks

---

### 9. `get_user_org_ids()` Called Repeatedly in RLS — N+1 at the DB Level

Every row evaluation for SELECT policies calls `get_user_org_ids()`:

```sql
USING (organization_id IN (SELECT get_user_org_ids()));
```

For a query returning 100 rows, PostgreSQL may evaluate this function **100 times**. Even with `STABLE` marking, the planner doesn't always cache the result within a single statement.

**Fix:**
```sql
-- Use a CTE or materialized approach
-- OR restructure to use direct JOIN:
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_employees.organization_id
      AND user_id = auth.uid()
      AND is_active = TRUE
  )
)
-- EXISTS with a proper index is usually faster than IN (SELECT ...)
```

---

### 10. No Pagination Defaults on Data-Heavy Tables

Server actions like `getAuditLogs` have a default limit of 50, but the employee and candidate server actions have **no pagination at all**. A single org with 10K employees will transmit all records on every load.

**Fix:**
- Add cursor-based pagination (not offset-based) to all list queries
- Default limit: 25 rows
- Use `keyset pagination` (WHERE id > :last_id) instead of `OFFSET` for large tables

---

### 11. No Database-Level Tenant Isolation for Deletes

```sql
ON DELETE CASCADE
```

If an `organizations` row is accidentally deleted, **all** employee records, projects, tasks, payroll, audit logs — everything — cascades and is permanently lost.

**Fix:**
- Remove `ON DELETE CASCADE` from all org-scoped FKs
- Replace with `ON DELETE RESTRICT`
- Implement **soft deletion** (add `deleted_at TIMESTAMPTZ` column)
- Add a separate hard-delete job that runs after a 30-day grace period
- Backup `organizations` table separately with point-in-time recovery

---

### 12. Stripe Webhook Has No Idempotency Protection

**File:** `src/app/api/webhooks/stripe/route.ts`

Stripe can send the same webhook event **multiple times**. The current handler doesn't track processed event IDs:

```typescript
case 'checkout.session.completed': {
    // No check: "have I already processed this event ID?"
    await supabase.from('organizations').update({...}).eq('id', orgId);
}
```

**Fix:**
```typescript
// Add idempotency check
const { data: existing } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();

if (existing) return NextResponse.json({ received: true }); // already processed

// Process event...

// Record it
await supabase.from('webhook_events').insert({
    stripe_event_id: event.id,
    event_type: event.type,
    processed_at: new Date().toISOString(),
});
```

---

## 🟡 MODERATE — Fix Before 5,000 Orgs

### 13. `getCurrentOrganization()` Picks the "First" Org — No Determinism

**File:** `src/lib/organization/index.ts` (line 96)

```typescript
.limit(1)
.single();
```

With no ORDER BY, PostgreSQL returns whichever row is first physically. If a user belongs to 3 orgs, they'll get a random one on every new session. This will cause confused users who see the wrong org's data.

**Fix:** Store the "active org" preference in a cookie or user metadata. Fall back to the most recently joined org.

---

### 14. No Index on `audit_logs` for Time-Range Queries + Org

The audit logs will grow **fastest** of all tables. At 10K orgs × 50 actions/org/day = **500K rows/day** = **15M rows/month**.

Current indexes:
```sql
idx_audit_created ON audit_logs(organization_id, created_at DESC)
```

This covers org + time. But filtering by `entity_type` + `organization_id` + `created_at` (very common audit query) requires a **triple composite index**.

**Fix:**
```sql
CREATE INDEX idx_audit_org_entity_time
  ON audit_logs(organization_id, entity_type, created_at DESC);
```

Also consider **partitioning** audit_logs by month using PostgreSQL native partitioning:
```sql
CREATE TABLE audit_logs (
    ...
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

---

### 15. RBAC Is Duplicated: TypeScript AND PostgreSQL

Permissions are defined in both:
- **TypeScript:** `ROLE_PERMISSIONS` in `src/lib/rbac/types.ts`
- **PostgreSQL:** `has_org_role()` function in `001_saas_foundation.sql`

These two systems can drift. If you add a new role or change permissions in TypeScript, the RLS policies won't automatically update.

**Fix (pick one):**
- **Option A — DB is source of truth:** Remove TypeScript permission matrix. Query the DB for permissions and cache them.
- **Option B — Code gen:** Auto-generate the PostgreSQL functions from the TypeScript definitions as part of CI/CD.
- **Option C — Accept the duplication** but add a CI check that compares both matrices and fails if they differ.

---

### 16. No Request-Level Org Context Injection

Every server action manually passes `organizationId` from form data:
```typescript
organizationId: formData.get('organizationId') as string,
```

This is:
- **Repetitive** — every action repeats the same pattern
- **Spoofable** — a client can submit a different org ID in the form data
- **Missing validation** — no check that the `organizationId` in the form matches the user's active org

**Fix:**
```typescript
// Create a server action wrapper
export function withOrgContext<T>(
  action: (ctx: AuthContext, data: T) => Promise<ActionResult>
) {
  return async (formData: FormData) => {
    const orgId = await getActiveOrgFromSession(); // from cookie, not form data
    const ctx = await getAuthContext(orgId);
    const data = parseFormData<T>(formData);
    return action(ctx, data);
  };
}
```

---

### 17. `create_organization` Function Has No Rate Limiting

**File:** `001_saas_foundation.sql` (line 832)

Any authenticated user can call `create_organization` unlimited times. At 10K malicious signups, this fills your `organizations` table with garbage and inflates costs.

**Fix:**
- Add a check: `SELECT count(*) FROM organizations WHERE id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())` — limit to 3-5 orgs per user on free plans.
- Or rate-limit at the application layer before calling the RPC.

---

### 18. `unique_pending_invite` Constraint Blocks Re-Invites

**File:** `001_saas_foundation.sql` (line 108)

```sql
CONSTRAINT unique_pending_invite UNIQUE (organization_id, email)
```

This is a `UNIQUE` constraint on `(org_id, email)` regardless of status. If someone is invited, then the invite expires, they **cannot be re-invited** because the expired row still occupies the unique slot.

**Fix:**
```sql
-- Use a partial unique index instead:
CREATE UNIQUE INDEX unique_pending_invite
  ON organization_invitations(organization_id, email)
  WHERE status = 'pending';
```

---

### 19. Stripe `determinePlanFromSubscription` Has a Price-Amount Fallback

**File:** `src/app/api/webhooks/stripe/route.ts` (lines 214-217)

```typescript
const amount = subscription.items.data[0]?.price?.unit_amount ?? 0;
if (amount >= 14000) return 'ai_pro';
if (amount >= 4000) return 'growth';
```

If you change pricing, this fallback silently assigns the wrong plan. This is a **billing reliability issue**.

**Fix:** Remove the amount-based fallback entirely. If `priceId` doesn't match any plan, log an error and **do not update the plan**. Alert the ops team instead.

---

## 📋 SaaS Anti-Patterns Detected

| # | Anti-Pattern | Where | Impact |
|---|---|---|---|
| 1 | **God Context** — HemsContext.tsx still exists alongside new OrganizationContext | `src/context/` | Two sources of truth for auth state |
| 2 | **SELECT \*** in data queries | `guard.ts:29`, `organization/index.ts:49` | Over-fetching; salary data leaks to client |
| 3 | **No tenant-scoped caching** | Everywhere | Every page load is a fresh DB round-trip |
| 4 | **Monolith migrations** | `001_saas_foundation.sql` (869 lines) | Can't roll back individual changes; all-or-nothing |
| 5 | **`any` type assertions** | `guard.ts:116`, `organization/index.ts:102` | TypeScript safety is bypassed at critical boundaries |
| 6 | **No health check endpoint** | Missing `/api/health` | Can't monitor uptime or DB connectivity |
| 7 | **No graceful degradation on Stripe failure** | `billing/stripe.ts` | If Stripe is down, no user can access billing pages |
| 8 | **Feature flags in code, not database** | `billing/plans.ts` | Changing a feature flag requires a deployment |
| 9 | **Backfill migration is non-resumable** | `002_backfill.sql` | If it fails halfway, you can't safely re-run it |
| 10 | **No tenant data export** | Missing | GDPR Article 20 — right to data portability |

---

## 🏗️ Architecture Recommendations for 10,000 Orgs

### Infrastructure

| Component | Current | Recommended |
|---|---|---|
| **Database** | Supabase Free/Pro (500 connections) | Supabase Pro + Supavisor pooling + read replicas |
| **Rate Limiting** | In-memory Map | Upstash Redis (~$10/mo) |
| **Caching** | None | Vercel KV or Upstash Redis for org metadata (30s TTL) |
| **Job Queue** | None (everything is synchronous) | QStash or Inngest for payroll processing, email sending |
| **File Storage** | Supabase Storage | Supabase Storage + CDN (resumes, avatars) |
| **Monitoring** | console.log | Sentry + Supabase Logs + Vercel Analytics |
| **Search** | SQL LIKE | PostgreSQL Full-Text Search (built-in) → Meilisearch at 10K+ |

### Data Architecture

```
Current:    All orgs → 1 database → 1 schema → RLS
At 10K:     All orgs → 1 database → 1 schema → RLS + connection pooling
At 50K:     Consider schema-per-tenant or horizontal sharding
At 100K+:   Dedicated databases for enterprise tenants (hybrid model)
```

### Latency Budget (per page load)

| Step | Current | Target |
|---|---|---|
| Middleware auth check | ~50ms (DB query) | ~5ms (JWT/cookie) |
| Org context resolution | ~30ms (DB query) | ~2ms (cached) |
| Main data query | ~80ms | ~80ms (acceptable) |
| RLS evaluation | ~20ms per table | ~10ms (optimized functions) |
| **Total** | **~180ms** | **~97ms** |

---

## ✅ What Was Done Well

1. **Shared-database with RLS** — correct choice for this scale. Schema-per-tenant would be premature.
2. **SECURITY DEFINER functions** for invite acceptance — proper use of privilege escalation.
3. **Additive migration strategy** — zero downtime, preserves existing data.
4. **Append-only audit logs** — immutable trail is a compliance best practice.
5. **Feature gating at 3 levels** (component, server action, DB) — defense in depth.
6. **Zod validation on all inputs** — prevents malformed data from reaching the DB.
7. **Safe error sanitization** — internal errors never leak to clients.
8. **`ON CONFLICT DO NOTHING`** in backfill — idempotent migration.

---

## 📊 Priority Roadmap

### Sprint 1 (Critical — This Week)
- [ ] Cache org membership in cookie (fixes #1)
- [ ] Change helper functions to SECURITY INVOKER (fixes #2)
- [ ] Switch audit logging to service role client (fixes #7)
- [ ] Replace in-memory rate limiter with Upstash Redis (fixes #6)

### Sprint 2 (High — Next 2 Weeks)
- [ ] Implement salary encryption with pgcrypto (fixes #4)
- [ ] Replace `member_ids UUID[]` with join table (fixes #3)
- [ ] Add Stripe webhook idempotency (fixes #12)
- [ ] Add `ON DELETE RESTRICT` + soft deletion (fixes #11)

### Sprint 3 (Moderate — Next Month)
- [ ] Optimize RLS functions to use EXISTS pattern (fixes #9)
- [ ] Fix invite constraint to partial unique index (fixes #18)
- [ ] Add org context wrapper for server actions (fixes #16)
- [ ] Partition audit_logs table by month (fixes #14)
- [ ] Add composite audit index (fixes #14)
- [ ] Add `/api/health` endpoint
- [ ] Add tenant data export for GDPR (fixes #10 anti-pattern)

---

*Review by: Architecture Review — Phase 1 SaaS Foundation*
*Next review scheduled: After Sprint 2 completion*
