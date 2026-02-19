// =============================================================================
// Audit Logging System — Append-Only, Org-Scoped
// =============================================================================

import { createClient } from '@/lib/supabase/server';

/**
 * Supported entity types for audit logs
 */
export type AuditEntityType =
    | 'employee'
    | 'candidate'
    | 'project'
    | 'task'
    | 'payroll'
    | 'leave'
    | 'performance'
    | 'announcement'
    | 'learning'
    | 'member'
    | 'organization'
    | 'invitation';

/**
 * Audit action patterns (resource.verb)
 */
export type AuditAction =
    | 'employee.create'
    | 'employee.update'
    | 'employee.delete'
    | 'employee.terminate'
    | 'candidate.create'
    | 'candidate.update'
    | 'candidate.stage_change'
    | 'candidate.reject'
    | 'candidate.hire'
    | 'project.create'
    | 'project.update'
    | 'project.delete'
    | 'project.archive'
    | 'task.create'
    | 'task.update'
    | 'task.delete'
    | 'task.status_change'
    | 'payroll.create'
    | 'payroll.approve'
    | 'payroll.process'
    | 'payroll.cancel'
    | 'leave.create'
    | 'leave.approve'
    | 'leave.reject'
    | 'leave.cancel'
    | 'performance.create'
    | 'performance.update'
    | 'announcement.create'
    | 'announcement.update'
    | 'announcement.delete'
    | 'member.invite'
    | 'member.join'
    | 'member.role_change'
    | 'member.remove'
    | 'organization.update'
    | 'organization.plan_change'
    | 'invitation.create'
    | 'invitation.accept'
    | 'invitation.revoke';

/**
 * Audit log entry input
 */
export interface AuditLogInput {
    organizationId: string;
    actorId: string;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId?: string;
    changes?: {
        before?: Record<string, unknown>;
        after?: Record<string, unknown>;
    };
    metadata?: Record<string, unknown>;
}

/**
 * Create an audit log entry. This is append-only — never update or delete.
 *
 * Usage:
 * ```ts
 * await createAuditLog({
 *   organizationId: ctx.organizationId,
 *   actorId: ctx.userId,
 *   action: 'employee.update',
 *   entityType: 'employee',
 *   entityId: employeeId,
 *   changes: {
 *     before: { position: 'Junior Dev' },
 *     after: { position: 'Senior Dev' },
 *   },
 * });
 * ```
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
    try {
        const supabase = await createClient();

        await supabase.from('audit_logs').insert({
            organization_id: input.organizationId,
            actor_id: input.actorId,
            action: input.action,
            entity_type: input.entityType,
            entity_id: input.entityId ?? null,
            changes: input.changes ?? null,
            metadata: input.metadata ?? {},
        });
    } catch (error) {
        // Audit logging should never crash the main operation
        console.error('[Audit] Failed to write audit log:', error);
    }
}

/**
 * Batch create multiple audit log entries
 */
export async function createAuditLogBatch(inputs: AuditLogInput[]): Promise<void> {
    try {
        const supabase = await createClient();

        const rows = inputs.map((input) => ({
            organization_id: input.organizationId,
            actor_id: input.actorId,
            action: input.action,
            entity_type: input.entityType,
            entity_id: input.entityId ?? null,
            changes: input.changes ?? null,
            metadata: input.metadata ?? {},
        }));

        await supabase.from('audit_logs').insert(rows);
    } catch (error) {
        console.error('[Audit] Failed to write batch audit logs:', error);
    }
}

/**
 * Query audit logs for an organization (paginated)
 */
export async function getAuditLogs(params: {
    organizationId: string;
    entityType?: AuditEntityType;
    entityId?: string;
    actorId?: string;
    action?: string;
    limit?: number;
    offset?: number;
}): Promise<{ data: any[]; count: number }> {
    const supabase = await createClient();

    let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('organization_id', params.organizationId)
        .order('created_at', { ascending: false });

    if (params.entityType) query = query.eq('entity_type', params.entityType);
    if (params.entityId) query = query.eq('entity_id', params.entityId);
    if (params.actorId) query = query.eq('actor_id', params.actorId);
    if (params.action) query = query.eq('action', params.action);

    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
        console.error('[Audit] Failed to query audit logs:', error);
        return { data: [], count: 0 };
    }

    return { data: data ?? [], count: count ?? 0 };
}

/**
 * Compute a diff between two objects for audit logging.
 * Only includes fields that actually changed.
 */
export function computeDiff(
    before: Record<string, unknown>,
    after: Record<string, unknown>
): { before: Record<string, unknown>; after: Record<string, unknown> } | null {
    const changedBefore: Record<string, unknown> = {};
    const changedAfter: Record<string, unknown> = {};

    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
            changedBefore[key] = before[key];
            changedAfter[key] = after[key];
        }
    }

    if (Object.keys(changedAfter).length === 0) return null;

    return { before: changedBefore, after: changedAfter };
}
