import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    scopeClient,
    TenantScopeError,
    TENANT_SCOPED_TABLES,
    TENANT_LESS_TABLES,
    type TenantScopedTable,
} from '@/lib/db/tenant-scoped';

/**
 * This layer is the only thing preventing cross-tenant access on service-role
 * paths (where RLS does not apply at all). Its behaviour needs to be pinned
 * precisely, so these tests record every filter and payload the layer produces.
 */

// -----------------------------------------------------------------------------
// Recording fake Supabase client
// -----------------------------------------------------------------------------

interface Recorded {
    table: string;
    operation: string;
    payload?: unknown;
    columns?: string;
    filters: Array<{ column: string; value: unknown }>;
}

function makeFakeClient() {
    const calls: Recorded[] = [];

    /**
     * Mirrors the full ScopedQuery surface so a chain that typechecks also runs
     * here. Filter methods record (column, value); modifiers just chain.
     */
    const FILTER_METHODS = [
        'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in',
        'contains', 'overlaps',
    ] as const;

    const CHAIN_METHODS = [
        'not', 'or', 'match', 'filter', 'textSearch',
        'order', 'limit', 'range',
        'select', 'single', 'maybeSingle', 'csv', 'throwOnError',
    ] as const;

    function filterBuilder(record: Recorded) {
        const builder: Record<string, unknown> = {};

        for (const method of FILTER_METHODS) {
            builder[method] = (column: string, value: unknown) => {
                record.filters.push({ column, value });
                return builder;
            };
        }
        for (const method of CHAIN_METHODS) {
            builder[method] = () => builder;
        }

        return builder as never;
    }

    const client = {
        from(table: string) {
            return {
                select(columns?: string) {
                    const record: Recorded = { table, operation: 'select', columns, filters: [] };
                    calls.push(record);
                    return filterBuilder(record);
                },
                insert(payload: unknown) {
                    const record: Recorded = { table, operation: 'insert', payload, filters: [] };
                    calls.push(record);
                    return filterBuilder(record);
                },
                upsert(payload: unknown) {
                    const record: Recorded = { table, operation: 'upsert', payload, filters: [] };
                    calls.push(record);
                    return filterBuilder(record);
                },
                update(payload: unknown) {
                    const record: Recorded = { table, operation: 'update', payload, filters: [] };
                    calls.push(record);
                    return filterBuilder(record);
                },
                delete() {
                    const record: Recorded = { table, operation: 'delete', filters: [] };
                    calls.push(record);
                    return filterBuilder(record);
                },
            };
        },
    };

    return { client, calls, last: () => calls.at(-1)! };
}

const ORG = 'org-aaa';
const OTHER_ORG = 'org-bbb';

let fake: ReturnType<typeof makeFakeClient>;
let db: ReturnType<typeof scopeClient>;

beforeEach(() => {
    fake = makeFakeClient();
    db = scopeClient(fake.client, ORG);
});

// -----------------------------------------------------------------------------

describe('construction', () => {
    it('exposes the organization it is scoped to', () => {
        expect(db.organizationId).toBe(ORG);
    });

    it('refuses to build without an organization id', () => {
        expect(() => scopeClient(fake.client, '')).toThrow(TenantScopeError);
    });
});

describe('select', () => {
    it('applies the tenant filter automatically', () => {
        db.from('org_projects').select('id, title');
        expect(fake.last()).toMatchObject({
            table: 'org_projects',
            operation: 'select',
            columns: 'id, title',
        });
        expect(fake.last().filters).toEqual([{ column: 'organization_id', value: ORG }]);
    });

    it('defaults to selecting all columns', () => {
        db.from('org_employees').select();
        expect(fake.last().columns).toBe('*');
    });

    it('allows further chaining after scoping', () => {
        const builder = db.from('org_tasks').select('*') as unknown as {
            eq: (c: string, v: unknown) => unknown;
        };
        // Caller-added filters coexist with the tenant filter.
        (builder.eq('status', 'TODO') as { eq: (c: string, v: unknown) => unknown });
        expect(fake.last().filters).toEqual([
            { column: 'organization_id', value: ORG },
            { column: 'status', value: 'TODO' },
        ]);
    });
});

describe('insert', () => {
    it('injects the organization id', () => {
        db.from('org_projects').insert({ title: 'Apollo' });
        expect(fake.last().payload).toEqual({ title: 'Apollo', organization_id: ORG });
    });

    it('injects the organization id into every row of a bulk insert', () => {
        db.from('org_tasks').insert([{ title: 'a' }, { title: 'b' }]);
        expect(fake.last().payload).toEqual([
            { title: 'a', organization_id: ORG },
            { title: 'b', organization_id: ORG },
        ]);
    });

    it('OVERRIDES a caller-supplied organization id', () => {
        // A caller must never be able to write into another tenant, whether by
        // mistake or because the value came from request input.
        db.from('org_projects').insert({ title: 'x', organization_id: OTHER_ORG });
        expect((fake.last().payload as Record<string, unknown>).organization_id).toBe(ORG);
    });

    it('overrides a caller-supplied organization id in bulk inserts', () => {
        db.from('org_tasks').insert([
            { title: 'a', organization_id: OTHER_ORG },
            { title: 'b' },
        ]);
        expect(fake.last().payload).toEqual([
            { title: 'a', organization_id: ORG },
            { title: 'b', organization_id: ORG },
        ]);
    });
});

describe('upsert', () => {
    it('injects the organization id', () => {
        db.from('org_employees').upsert({ email: 'a@b.c' });
        expect(fake.last().payload).toEqual({ email: 'a@b.c', organization_id: ORG });
    });
});

describe('update', () => {
    it('applies the tenant filter', () => {
        db.from('org_projects').update({ title: 'new' });
        expect(fake.last().filters).toEqual([{ column: 'organization_id', value: ORG }]);
    });

    it('STRIPS organization_id from the patch', () => {
        // Allowing it through would let an update re-parent a row into another
        // tenant, which the WHERE clause alone would not prevent.
        db.from('org_projects').update({ title: 'new', organization_id: OTHER_ORG });
        expect(fake.last().payload).toEqual({ title: 'new' });
        expect(fake.last().filters).toEqual([{ column: 'organization_id', value: ORG }]);
    });

    it('keeps the tenant filter alongside a caller id filter', () => {
        const builder = db.from('org_projects').update({ title: 'n' }) as unknown as {
            eq: (c: string, v: unknown) => unknown;
        };
        builder.eq('id', 'project-1');
        expect(fake.last().filters).toEqual([
            { column: 'organization_id', value: ORG },
            { column: 'id', value: 'project-1' },
        ]);
    });
});

describe('delete', () => {
    it('applies the tenant filter', () => {
        db.from('org_projects').delete();
        expect(fake.last()).toMatchObject({ table: 'org_projects', operation: 'delete' });
        expect(fake.last().filters).toEqual([{ column: 'organization_id', value: ORG }]);
    });

    it('cannot be narrowed to another tenant by a caller filter', () => {
        // A caller adding their own organization_id filter produces an AND, so
        // the result is an impossible predicate rather than a cross-tenant delete.
        const builder = db.from('org_projects').delete() as unknown as {
            eq: (c: string, v: unknown) => unknown;
        };
        builder.eq('organization_id', OTHER_ORG);
        const filters = fake.last().filters;
        expect(filters[0]).toEqual({ column: 'organization_id', value: ORG });
        expect(filters).toHaveLength(2);
    });
});

describe('table registry', () => {
    it('accepts every registered tenant-scoped table', () => {
        for (const table of TENANT_SCOPED_TABLES) {
            expect(() => db.from(table).select('*'), `${table} should be scopable`).not.toThrow();
        }
    });

    it('rejects tenant-less tables with an actionable message', () => {
        for (const table of TENANT_LESS_TABLES) {
            expect(
                () => db.from(table as unknown as TenantScopedTable).select('*'),
                `${table} must be rejected`
            ).toThrow(TenantScopeError);
        }
    });

    it('explains WHY a tenant-less table is rejected', () => {
        expect(() => db.from('profiles' as unknown as TenantScopedTable).select('*'))
            .toThrow(/has no organization_id column/);
    });

    it('rejects an unknown table rather than silently allowing it', () => {
        expect(() => db.from('made_up_table' as unknown as TenantScopedTable).select('*'))
            .toThrow(/Unknown table/);
    });

    it('has no overlap between the scoped and tenant-less registries', () => {
        const overlap = TENANT_SCOPED_TABLES.filter(
            (t) => (TENANT_LESS_TABLES as readonly string[]).includes(t)
        );
        expect(overlap).toEqual([]);
    });
});

describe('organization()', () => {
    it('filters organizations by id, not organization_id', () => {
        // `organizations` is the tenant root, keyed by `id`.
        db.organization();
        expect(fake.last()).toMatchObject({ table: 'organizations', operation: 'select' });
        expect(fake.last().filters).toEqual([{ column: 'id', value: ORG }]);
    });
});

describe('unsafeUnscoped()', () => {
    it('returns the raw client when given a reason', () => {
        const raw = db.unsafeUnscoped('Stripe webhook resolves the org from customer id');
        expect(raw).toBe(fake.client);
    });

    it('refuses an empty or perfunctory reason', () => {
        expect(() => db.unsafeUnscoped('')).toThrow(TenantScopeError);
        expect(() => db.unsafeUnscoped('because')).toThrow(/substantive reason/);
    });

    it('produces NO tenant filter, which is the point of the warning', () => {
        const raw = db.unsafeUnscoped('deliberate cross-tenant admin reporting query');
        raw.from('org_projects').select('*');
        expect(fake.last().filters).toEqual([]);
    });
});

describe('ergonomics: the chain the app actually writes', () => {
    // If the scoped client is awkward to use, developers route around it and the
    // guarantee evaporates. These pin the shapes used in real call sites.

    it('supports select -> eq -> single (getProject)', () => {
        db.from('org_projects').select('*').eq('id', 'p1').single();
        expect(fake.last().filters).toEqual([
            { column: 'organization_id', value: ORG },
            { column: 'id', value: 'p1' },
        ]);
    });

    it('supports select -> order (getProjects)', () => {
        db.from('org_projects').select('*').order('created_at', { ascending: false });
        expect(fake.last().filters).toEqual([{ column: 'organization_id', value: ORG }]);
    });

    it('supports insert -> select -> single (createProject)', () => {
        db.from('org_projects').insert({ title: 'x' }).select().single();
        expect(fake.last().payload).toEqual({ title: 'x', organization_id: ORG });
    });

    it('supports delete -> eq (deleteProject cascade)', () => {
        db.from('project_workspaces').delete().eq('project_id', 'p1');
        expect(fake.last().filters).toEqual([
            { column: 'organization_id', value: ORG },
            { column: 'project_id', value: 'p1' },
        ]);
    });

    it('supports limit and range for pagination', () => {
        db.from('org_candidates').select('*').order('created_at').limit(20);
        expect(fake.last().filters).toEqual([{ column: 'organization_id', value: ORG }]);

        db.from('org_candidates').select('*').range(0, 49);
        expect(fake.last().filters).toEqual([{ column: 'organization_id', value: ORG }]);
    });

    it('keeps the tenant filter first regardless of chain length', () => {
        db.from('org_tasks')
            .select('*')
            .eq('status', 'TODO')
            .neq('priority', 'LOW')
            .in('assigned_to', ['u1', 'u2'])
            .order('due_date')
            .limit(10);

        expect(fake.last().filters[0]).toEqual({ column: 'organization_id', value: ORG });
    });
});

describe('two tenants never see each other', () => {
    it('produces different filters for different organizations against one client', () => {
        const dbA = scopeClient(fake.client, 'org-A');
        const dbB = scopeClient(fake.client, 'org-B');

        dbA.from('org_employees').select('*');
        const filtersA = fake.last().filters;

        dbB.from('org_employees').select('*');
        const filtersB = fake.last().filters;

        expect(filtersA).toEqual([{ column: 'organization_id', value: 'org-A' }]);
        expect(filtersB).toEqual([{ column: 'organization_id', value: 'org-B' }]);
    });

    it('never emits a query without a tenant predicate across all operations', () => {
        const scoped = scopeClient(fake.client, ORG);
        const table = 'org_employees' as const;

        scoped.from(table).select('*');
        scoped.from(table).update({ x: 1 });
        scoped.from(table).delete();
        // insert/upsert carry the tenant in the payload rather than a filter.
        scoped.from(table).insert({ x: 1 });
        scoped.from(table).upsert({ x: 1 });

        for (const call of fake.calls) {
            if (call.operation === 'insert' || call.operation === 'upsert') {
                expect(
                    (call.payload as Record<string, unknown>).organization_id,
                    `${call.operation} must carry the tenant in its payload`
                ).toBe(ORG);
            } else {
                expect(
                    call.filters.some((f) => f.column === 'organization_id' && f.value === ORG),
                    `${call.operation} must carry a tenant filter`
                ).toBe(true);
            }
        }
    });
});
