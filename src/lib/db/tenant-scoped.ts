// =============================================================================
// Tenant-Scoped Data Access Layer
// =============================================================================
// The problem this solves: tenant isolation was enforced by remembering to
// write `.eq('organization_id', ...)` on every query. Across ~100 query sites
// that is not a policy, it is a coin flip — and the misses were real
// (see the getProject / deleteProject fixes in dashboard/projects/actions.ts).
//
// This module makes the scope automatic:
//
//   const db = await getOrgDb(session)
//   db.from('org_projects').select('*')                 // scoped
//   db.from('org_projects').insert({ title })           // org id injected
//   db.from('org_projects').update({ title }).eq('id', id)  // scoped
//   db.from('org_projects').delete().eq('id', id)       // scoped
//
// Three properties worth noting:
//
//   1. The table name is a union type. A table without an `organization_id`
//      column is a COMPILE error, not a silent cross-tenant read.
//   2. The organization id comes from the Session, which comes from the
//      authenticated user. It is never a parameter a caller can supply.
//   3. Escaping the scope requires calling `unsafeUnscoped()`, which is
//      deliberately ugly and greppable. Audit it with:
//        grep -rn "unsafeUnscoped" src/
//
// This is defense in depth, not a replacement for RLS. RLS is the backstop for
// paths this layer does not cover (notably the service-role client, where RLS
// does not apply at all — there, this layer is the ONLY protection).
// =============================================================================

import { createClient } from '@/lib/supabase/server';
import type { Session } from '@/lib/auth/session';
import { logger } from '@/lib/observability/logger';

// -----------------------------------------------------------------------------
// Table registry
// -----------------------------------------------------------------------------

/**
 * Tables with an `organization_id` column, per
 * supabase/migrations/001_saas_foundation.sql.
 *
 * Adding a table here asserts that it has that column. Getting that wrong
 * produces a Postgres error on first use rather than a silent leak, because
 * filtering on a non-existent column fails loudly.
 */
export const TENANT_SCOPED_TABLES = [
    'organization_members',
    'organization_invitations',
    'org_employees',
    'org_candidates',
    'org_projects',
    'org_tasks',
    'org_payroll_records',
    'org_leave_requests',
    'org_performance_reviews',
    'org_announcements',
    'org_learning_modules',
    'audit_logs',
    'project_workspaces',
] as const;

export type TenantScopedTable = (typeof TENANT_SCOPED_TABLES)[number];

/**
 * Tables that exist but have NO tenant column, so they cannot be scoped.
 *
 * Listed explicitly to produce a useful error instead of a confusing one, and
 * to serve as the checklist for the schema cut-over (plan task 1.2). Reading
 * any of these returns rows from every tenant.
 */
export const TENANT_LESS_TABLES = [
    'profiles',
    'applications',
    'tasks',
    'projects',
    'leave_requests',
    'job_postings',
    'announcements',
    'work_logs',
    'performance_reviews',
    'resumes',
    'doc_embeddings',
    'resume_embeddings',
    'assessment_sessions',
    'assessment_questions',
    'candidate_answers',
    'workspace_files',
    'workspace_activity',
    'workspace_commits',
    'skills',
] as const;

export type TenantLessTable = (typeof TENANT_LESS_TABLES)[number];

const TENANT_LESS_SET: ReadonlySet<string> = new Set(TENANT_LESS_TABLES);
const TENANT_SCOPED_SET: ReadonlySet<string> = new Set(TENANT_SCOPED_TABLES);

const ORG_COLUMN = 'organization_id';

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

export class TenantScopeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TenantScopeError';
    }
}

function assertScopable(table: string): void {
    if (TENANT_SCOPED_SET.has(table)) return;

    if (TENANT_LESS_SET.has(table)) {
        throw new TenantScopeError(
            `Table "${table}" has no ${ORG_COLUMN} column, so it cannot be tenant-scoped. ` +
            `Reading it returns every tenant's rows. Use the org-scoped equivalent, ` +
            `or if this is deliberate and reviewed, use unsafeUnscoped() and document why. ` +
            `See docs/INDUSTRIAL_READINESS_PLAN.md task 1.2.`
        );
    }

    throw new TenantScopeError(
        `Unknown table "${table}". Add it to TENANT_SCOPED_TABLES in ` +
        `src/lib/db/tenant-scoped.ts if it has an ${ORG_COLUMN} column, ` +
        `or to TENANT_LESS_TABLES if it does not.`
    );
}

// -----------------------------------------------------------------------------
// Scoped builder
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Query builder types
// -----------------------------------------------------------------------------
// The project has no generated `Database` types (`supabase gen types` has never
// been run), so PostgrestFilterBuilder cannot be parameterized meaningfully.
// Rather than spray `any` at call sites, this declares a chainable, awaitable
// surface covering the operators actually used in this codebase.
//
// The tradeoff is explicit: row shapes are not checked (callers annotate the
// result, as they already did with `as Project[]`), but the CHAIN is checked and
// the result is awaitable with a typed `data`/`error` pair. When generated types
// land, this can be replaced by the real generic builder.
// -----------------------------------------------------------------------------

export interface PostgrestLikeError {
    message: string;
    code?: string;
    details?: string | null;
    hint?: string | null;
}

export interface PostgrestLikeResult<T> {
    data: T;
    error: PostgrestLikeError | null;
    count?: number | null;
    status?: number;
}

/**
 * Chainable, awaitable query. `T` defaults to `unknown[]`; annotate at the call
 * site (`.select<Project[]>('*')` or `await ... as { data: Project[] }`).
 */
export interface ScopedQuery<T = unknown> extends PromiseLike<PostgrestLikeResult<T>> {
    // Filters
    eq(column: string, value: unknown): ScopedQuery<T>;
    neq(column: string, value: unknown): ScopedQuery<T>;
    gt(column: string, value: unknown): ScopedQuery<T>;
    gte(column: string, value: unknown): ScopedQuery<T>;
    lt(column: string, value: unknown): ScopedQuery<T>;
    lte(column: string, value: unknown): ScopedQuery<T>;
    like(column: string, pattern: string): ScopedQuery<T>;
    ilike(column: string, pattern: string): ScopedQuery<T>;
    is(column: string, value: unknown): ScopedQuery<T>;
    in(column: string, values: readonly unknown[]): ScopedQuery<T>;
    contains(column: string, value: unknown): ScopedQuery<T>;
    overlaps(column: string, value: unknown): ScopedQuery<T>;
    not(column: string, operator: string, value: unknown): ScopedQuery<T>;
    or(filters: string, options?: Record<string, unknown>): ScopedQuery<T>;
    match(query: Record<string, unknown>): ScopedQuery<T>;
    filter(column: string, operator: string, value: unknown): ScopedQuery<T>;
    textSearch(column: string, query: string, options?: Record<string, unknown>): ScopedQuery<T>;

    // Modifiers
    order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean; referencedTable?: string }): ScopedQuery<T>;
    limit(count: number, options?: Record<string, unknown>): ScopedQuery<T>;
    range(from: number, to: number, options?: Record<string, unknown>): ScopedQuery<T>;

    // Shape
    select<U = T>(columns?: string, options?: Record<string, unknown>): ScopedQuery<U>;
    single<U = T extends readonly (infer E)[] ? E : T>(): ScopedQuery<U>;
    maybeSingle<U = T extends readonly (infer E)[] ? E : T>(): ScopedQuery<U | null>;
    csv(): ScopedQuery<string>;
    throwOnError(): ScopedQuery<T>;
}

/** Structural view of the raw Supabase client this module wraps. */
interface QueryBuilderLike {
    select: (columns?: string, options?: Record<string, unknown>) => ScopedQuery<never>;
    insert: (values: unknown, options?: Record<string, unknown>) => ScopedQuery<never>;
    update: (values: unknown, options?: Record<string, unknown>) => ScopedQuery<never>;
    delete: (options?: Record<string, unknown>) => ScopedQuery<never>;
    upsert: (values: unknown, options?: Record<string, unknown>) => ScopedQuery<never>;
}

interface SupabaseLike {
    from: (table: string) => QueryBuilderLike;
}

/** Attach the tenant id to a row or array of rows. */
function withOrg<T>(values: T, organizationId: string): T {
    if (Array.isArray(values)) {
        return values.map((row) => ({
            ...(row as Record<string, unknown>),
            [ORG_COLUMN]: organizationId,
        })) as unknown as T;
    }
    return {
        ...(values as Record<string, unknown>),
        [ORG_COLUMN]: organizationId,
    } as unknown as T;
}

/**
 * A query builder for one table with the tenant filter already applied.
 *
 * Returned builders are the real Supabase filter builders, so the full
 * chaining API (`.eq`, `.in`, `.order`, `.range`, `.single`, ...) works as
 * usual — the tenant predicate is simply already present.
 */
export interface ScopedTableBuilder {
    /** SELECT, pre-filtered to this organization. */
    select<T = unknown[]>(columns?: string, options?: Record<string, unknown>): ScopedQuery<T>;

    /** INSERT with `organization_id` injected into every row. */
    insert<T = unknown>(values: unknown, options?: Record<string, unknown>): ScopedQuery<T>;

    /** UPSERT with `organization_id` injected into every row. */
    upsert<T = unknown>(values: unknown, options?: Record<string, unknown>): ScopedQuery<T>;

    /**
     * UPDATE, pre-filtered to this organization.
     *
     * `organization_id` is also stripped from the patch: allowing it through
     * would let an update move a row into another tenant.
     */
    update<T = unknown>(values: unknown, options?: Record<string, unknown>): ScopedQuery<T>;

    /** DELETE, pre-filtered to this organization. */
    delete<T = unknown>(options?: Record<string, unknown>): ScopedQuery<T>;
}

/**
 * Tenant-scoped database handle.
 */
export interface OrgDb {
    /** The organization every query is scoped to. */
    readonly organizationId: string;

    /** Get a scoped builder for a tenant-scoped table. */
    from(table: TenantScopedTable): ScopedTableBuilder;

    /**
     * The caller's own organization row (`organizations` is keyed by `id`, not
     * `organization_id`, so it needs its own accessor).
     */
    organization<T = unknown>(): ScopedQuery<T>;

    /**
     * Escape hatch: the raw, UNSCOPED Supabase client.
     *
     * Every call is a potential cross-tenant leak and must be justified in a
     * comment. Named to be obvious in review and greppable in audit.
     *
     * @param reason why scoping cannot be used here — logged for audit
     */
    unsafeUnscoped(reason: string): SupabaseLike;
}

/**
 * Build a tenant-scoped database handle from an authenticated session.
 *
 * @param session from `requireSession()` / `requirePermissionFromSession()`.
 *   Its `organizationId` is always a real organization — the old `'legacy'`
 *   sentinel is gone (see src/lib/auth/session.ts).
 */
export async function getOrgDb(session: Session): Promise<OrgDb> {
    if (!session?.organizationId) {
        throw new TenantScopeError(
            'Cannot build a tenant-scoped client without an organization id.'
        );
    }

    const supabase = (await createClient()) as unknown as SupabaseLike;
    return buildOrgDb(supabase, session.organizationId);
}

/**
 * Wrap an existing client. Use when the client is already built — notably the
 * service-role client, where RLS does NOT apply and this wrapper is therefore
 * the only thing preventing a cross-tenant operation.
 */
export function scopeClient(client: unknown, organizationId: string): OrgDb {
    if (!organizationId) {
        throw new TenantScopeError('Cannot scope a client without an organization id.');
    }
    return buildOrgDb(client as SupabaseLike, organizationId);
}

function buildOrgDb(supabase: SupabaseLike, organizationId: string): OrgDb {
    return {
        organizationId,

        from(table: TenantScopedTable): ScopedTableBuilder {
            assertScopable(table);

            return {
                select<T = unknown[]>(columns = '*', options?: Record<string, unknown>) {
                    return supabase
                        .from(table)
                        .select(columns, options)
                        .eq(ORG_COLUMN, organizationId) as unknown as ScopedQuery<T>;
                },

                insert<T = unknown>(values: unknown, options?: Record<string, unknown>) {
                    return supabase
                        .from(table)
                        .insert(withOrg(values, organizationId), options) as unknown as ScopedQuery<T>;
                },

                upsert<T = unknown>(values: unknown, options?: Record<string, unknown>) {
                    return supabase
                        .from(table)
                        .upsert(withOrg(values, organizationId), options) as unknown as ScopedQuery<T>;
                },

                update<T = unknown>(values: unknown, options?: Record<string, unknown>) {
                    // Strip any caller-supplied organization_id: letting it
                    // through would allow re-parenting a row into another tenant.
                    const patch = { ...(values as Record<string, unknown>) };
                    if (ORG_COLUMN in patch) {
                        logger.warn('Stripped organization_id from an update payload', {
                            table,
                            organizationId,
                        });
                        delete patch[ORG_COLUMN];
                    }

                    return supabase
                        .from(table)
                        .update(patch, options)
                        .eq(ORG_COLUMN, organizationId) as unknown as ScopedQuery<T>;
                },

                delete<T = unknown>(options?: Record<string, unknown>) {
                    return supabase
                        .from(table)
                        .delete(options)
                        .eq(ORG_COLUMN, organizationId) as unknown as ScopedQuery<T>;
                },
            };
        },

        organization<T = unknown>() {
            return supabase
                .from('organizations')
                .select('*')
                .eq('id', organizationId) as unknown as ScopedQuery<T>;
        },

        unsafeUnscoped(reason: string): SupabaseLike {
            if (!reason || reason.trim().length < 10) {
                throw new TenantScopeError(
                    'unsafeUnscoped() requires a substantive reason describing why ' +
                    'tenant scoping cannot be applied.'
                );
            }
            logger.warn('Unscoped database access', { organizationId, reason });
            return supabase;
        },
    };
}
