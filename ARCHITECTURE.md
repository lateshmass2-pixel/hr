# HEMS SaaS — Phase 1 Architecture & Folder Structure

## Proposed Scalable Folder Structure

```
src/
├── app/                                 # Next.js App Router
│   ├── (auth)/                          # Auth layout group
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   │
│   ├── api/                             # API Route Handlers
│   │   ├── billing/route.ts             # Checkout + portal
│   │   ├── invite/
│   │   │   └── accept/route.ts          # Invite accept flow
│   │   └── webhooks/
│   │       └── stripe/route.ts          # Stripe webhook handler
│   │
│   ├── assessment/                      # Public assessment pages
│   │   └── [id]/page.tsx
│   │
│   ├── dashboard/                       # Protected dashboard
│   │   ├── layout.tsx                   # Dashboard shell + OrgProvider
│   │   ├── page.tsx                     # Dashboard home
│   │   ├── onboarding/page.tsx          # Create or join org
│   │   │
│   │   ├── employees/page.tsx           # FeatureGate: basic_hr
│   │   ├── hiring/                      # FeatureGate: hiring
│   │   │   ├── page.tsx
│   │   │   └── actions.ts
│   │   ├── payroll/page.tsx             # FeatureGate: payroll
│   │   ├── projects/                    # FeatureGate: projects
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── leave/page.tsx
│   │   ├── performance/page.tsx         # FeatureGate: performance_reviews
│   │   ├── announcements/page.tsx
│   │   ├── learning/page.tsx            # FeatureGate: learning
│   │   ├── team/page.tsx                # Org members + invites
│   │   │
│   │   ├── settings/page.tsx            # Org settings
│   │   ├── billing/page.tsx             # Subscription management
│   │   └── audit/page.tsx               # Audit logs viewer
│   │
│   ├── actions/                         # Server Actions
│   │   ├── employees.ts                 # ✅ Created
│   │   ├── invitations.ts              # ✅ Created
│   │   ├── payroll.ts                   # ✅ Created
│   │   ├── leave.ts
│   │   ├── onboarding.ts
│   │   └── performance.ts
│   │
│   ├── layout.tsx                       # Root layout
│   ├── page.tsx                         # Landing page
│   └── globals.css
│
├── components/                          # Shared UI Components
│   ├── ui/                              # Primitives (shadcn)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── feature-gate.tsx                 # ✅ Created — Plan-based gating
│   ├── role-gate.tsx                    # ✅ Created — Role-based rendering
│   ├── org-switcher.tsx                 # Multi-org switcher dropdown
│   └── ...
│
├── context/                             # React Contexts
│   ├── HemsContext.tsx                   # Legacy context (migration path)
│   └── OrganizationContext.tsx          # ✅ Created — Multi-tenant context
│
├── lib/                                 # Core Libraries
│   ├── rbac/                            # Role-Based Access Control
│   │   ├── index.ts                     # ✅ Created — Barrel export
│   │   ├── types.ts                     # ✅ Created — Roles, permissions
│   │   └── guard.ts                     # ✅ Created — Server-side guards
│   │
│   ├── billing/                         # Subscription & Billing
│   │   ├── index.ts                     # ✅ Created — Barrel export
│   │   ├── plans.ts                     # ✅ Created — Plan configs + hasFeature
│   │   └── stripe.ts                    # ✅ Created — Stripe helpers
│   │
│   ├── organization/                    # Organization Utilities
│   │   └── index.ts                     # ✅ Created — CRUD + getCurrentOrg
│   │
│   ├── audit/                           # Audit Logging
│   │   └── index.ts                     # ✅ Created — createAuditLog + helpers
│   │
│   ├── security/                        # Security Utilities
│   │   └── index.ts                     # ✅ Created — Rate limit, masking, env
│   │
│   ├── validations/                     # Zod Schemas
│   │   └── schemas.ts                   # ✅ Created — All input validations
│   │
│   ├── supabase/                        # Supabase Clients
│   │   ├── client.ts                    # Browser client
│   │   ├── server.ts                    # Server client
│   │   └── middleware.ts                # Middleware client
│   │
│   ├── ai/                              # AI integrations
│   └── utils.ts                         # General utilities
│
├── hooks/                               # Custom React Hooks
│   └── use-mobile.ts
│
├── utils/                               # Utility functions
│
└── middleware.ts                         # ✅ Updated — Auth + multi-tenant routing
```

## SQL Migrations

```
supabase/
├── migrations/
│   ├── 001_saas_foundation.sql          # ✅ Created — Full multi-tenant schema
│   └── 002_backfill.sql                 # ✅ Created — Single→multi-org migration
├── schema.sql                           # Legacy (pre-SaaS)
└── ...                                  # Legacy SQL files
```

## Files Created in Phase 1

| File | Purpose |
|------|---------|
| `supabase/migrations/001_saas_foundation.sql` | Multi-tenant schema: 14 tables, RLS, helper functions |
| `supabase/migrations/002_backfill.sql` | Migrate existing data to multi-tenant tables |
| `src/lib/rbac/types.ts` | Type-safe RBAC: 5 roles × 15 resources × 7 actions |
| `src/lib/rbac/guard.ts` | Server-side auth + permission guards |
| `src/lib/rbac/index.ts` | Barrel export |
| `src/lib/billing/plans.ts` | Plan configs, feature gating, limits |
| `src/lib/billing/stripe.ts` | Stripe checkout + portal helpers |
| `src/lib/billing/index.ts` | Barrel export |
| `src/lib/organization/index.ts` | Org CRUD, getCurrentOrganization(), members |
| `src/lib/audit/index.ts` | Append-only audit logging + diff utility |
| `src/lib/security/index.ts` | Rate limiting, salary masking, env validation |
| `src/lib/validations/schemas.ts` | Zod schemas for all entities |
| `src/context/OrganizationContext.tsx` | Client-side multi-tenant context |
| `src/components/feature-gate.tsx` | Server component for plan-based feature gating |
| `src/components/role-gate.tsx` | Client component for role-based rendering |
| `src/middleware.ts` | Auth + multi-tenant route protection |
| `src/app/actions/employees.ts` | Employee CRUD server actions (multi-tenant) |
| `src/app/actions/invitations.ts` | Invite system server actions |
| `src/app/actions/payroll.ts` | Payroll lifecycle server actions |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook handler |
| `src/app/api/invite/accept/route.ts` | Invite acceptance route |
| `src/app/api/billing/route.ts` | Billing checkout + portal API |
| `.env.example` | Environment variable template |

## Migration Strategy (Detailed)

### Phase 1: Additive Schema (Zero Downtime)
1. Run `001_saas_foundation.sql` — creates NEW tables alongside existing ones
2. No existing tables are modified or dropped
3. Old code continues working against old tables

### Phase 2: Data Backfill
1. Run `002_backfill.sql` — copies data into org-scoped tables
2. Creates a "Default Organization" for all existing data
3. Maps HR_ADMIN → owner, EMPLOYEE → employee
4. Idempotent — safe to run multiple times

### Phase 3: Code Migration (Gradual)
1. Update server actions one-by-one to use `org_*` tables
2. Update HemsContext to read from OrganizationContext
3. Both old and new code can coexist during transition

### Phase 4: Cleanup
1. Remove old tables after all code migrated
2. Drop old RLS policies
3. Remove HemsContext legacy code

## Key Architecture Decisions

1. **Org-prefixed tables** (`org_employees`, `org_projects`) avoid naming conflicts during migration
2. **RLS via helper functions** (`is_org_member()`, `has_org_role()`) — clean, reusable, cacheable
3. **Security-definer functions** for sensitive operations (invite acceptance, org creation) that need to bypass RLS
4. **Append-only audit logs** — no UPDATE/DELETE allowed, immutable trail
5. **Feature gating at 3 levels**: Server Component (FeatureGate), Server Action (hasFeature), Database (RLS)
6. **Rate limiting in-memory** for now; swap to Redis/Upstash for production at scale
