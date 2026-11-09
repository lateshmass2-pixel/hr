// =============================================================================
// Work Intelligence — Task ↔ Git Correlation Engine (spec §16)
// =============================================================================
// Connects HEMS tasks to the development activity that progressed them:
//   Task → Branch → Commit → PR → Files → Tests → CI → Reviews
//
// Automatic correlation signals (each recorded with its basis):
//   * branch name contains the task id (e.g. feat/HEMS-123, task-<uuid-prefix>)
//   * commit message / PR body references the task ("#<short-id>", "task:<id>")
//   * PR head branch pattern + assignee match
// Manual correlation is a separate, auditable action by authorized users.
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export interface TaskRef {
    taskId: string;
    title?: string;
    basis: 'branch_name_pattern' | 'commit_message_ref' | 'pr_body_ref' | 'pr_title_ref';
    matchedOn: string;
}

/** UUID without dashes, first 8 chars — the idiom used in branch names. */
function uuidShort(uuid: string): string {
    return uuid.replace(/-/g, '').slice(0, 8).toLowerCase();
}

/**
 * Extract task references from a free-form string (commit message, PR body).
 * Recognizes: full UUIDs, 8-char short ids, "task:<id>", "#<short>".
 */
export function extractTaskRefs(
    text: string | null | undefined,
    knownTaskIds: string[]
): TaskRef[] {
    if (!text) return [];
    const refs: TaskRef[] = [];
    const lower = text.toLowerCase();

    for (const taskId of knownTaskIds) {
        const short = uuidShort(taskId);
        if (!short) continue;

        const patterns: Array<{ re: RegExp; basis: TaskRef['basis'] }> = [
            { re: new RegExp(taskId, 'i'), basis: 'commit_message_ref' },
            { re: new RegExp(`\\b${short}\\b`, 'i'), basis: 'commit_message_ref' },
            { re: new RegExp(`task[:#]\\s*${short}`, 'i'), basis: 'commit_message_ref' },
        ];

        for (const { re, basis } of patterns) {
            if (re.test(lower)) {
                refs.push({
                    taskId,
                    basis,
                    matchedOn: (text.match(re)?.[0] ?? '').slice(0, 120),
                    title: undefined,
                });
                break; // one ref per task max
            }
        }
    }
    return refs;
}

/**
 * Correlate a branch name to tasks: feat/abc123de-… or 1234abcde-auth
 */
export function matchBranchName(
    branchName: string | null | undefined,
    knownTaskIds: string[]
): TaskRef | null {
    if (!branchName) return null;
    for (const taskId of knownTaskIds) {
        const short = uuidShort(taskId);
        if (short && new RegExp(`(^|[-/_])${short}([-/_]|$)`, 'i').test(branchName)) {
            return {
                taskId,
                basis: 'branch_name_pattern',
                matchedOn: branchName.slice(0, 120),
            };
        }
    }
    return null;
}

export interface CorrelationStore {
    supabase: SupabaseClient;
    organizationId: string;
}

/**
 * Load org task ids once per correlation batch (perf: §25). Returns null if
 * the org has no tasks (correlation disabled).
 */
export async function loadKnownTaskIds(
    supabase: SupabaseClient,
    organizationId: string
): Promise<string[]> {
    const { data } = await supabase
        .from('org_tasks')
        .select('id')
        .eq('organization_id', organizationId);
    return (data ?? []).map((r: { id: string }) => r.id);
}

/**
 * Persist a task_git_links row (idempotently). Returns the link id or null.
 */
export async function linkTaskToGit(
    store: CorrelationStore,
    ref: {
        taskId: string;
        repositoryId?: string | null;
        branchName?: string | null;
        commitId?: string | null;
        pullRequestId?: string | null;
        linkType: 'auto' | 'manual';
        correlationBasis: string;
        linkedBy?: string | null;
    }
): Promise<void> {
    const { supabase, organizationId } = store;
    const insert = {
        organization_id: organizationId,
        task_id: ref.taskId,
        repository_id: ref.repositoryId ?? null,
        branch_name: ref.branchName ?? null,
        commit_id: ref.commitId ?? null,
        pull_request_id: ref.pullRequestId ?? null,
        link_type: ref.linkType,
        correlation_basis: ref.correlationBasis,
        linked_by: ref.linkedBy ?? null,
    };

    // Unique constraint (task_id, commit_id, pull_request_id, branch_name)
    // treats NULLs as distinct, so dedupe by pre-select.
    let query = store.supabase
        .from('task_git_links')
        .select('id')
        .eq('task_id', ref.taskId)
        .eq('link_type', ref.linkType)
        .eq('correlation_basis', ref.correlationBasis);
    query = query.is('commit_id', ref.commitId ?? null);
    query = query.is('pull_request_id', ref.pullRequestId ?? null);
    query = query.is('branch_name', ref.branchName ?? null);

    const { data: existing } = await query.maybeSingle();
    if (existing) return;

    const { error } = await supabase.from('task_git_links').insert(insert);
    if (error && error.code !== '23505') {
        throw error;
    }
}

/**
 * Full automatic correlation for one push: branch + commit messages.
 * Called from ingestion after commits are stored.
 */
export async function correlatePush(
    store: CorrelationStore,
    input: {
        repositoryId: string;
        branchName: string;
        commits: Array<{ id: string; message: string; gitAccountId: string | null; employeeId: string | null }>;
        knownTaskIds: string[];
    }
): Promise<TaskRef[]> {
    const found: TaskRef[] = [];

    const branchRef = matchBranchName(input.branchName, input.knownTaskIds);
    if (branchRef) found.push(branchRef);

    for (const c of input.commits) {
        for (const ref of extractTaskRefs(c.message, input.knownTaskIds)) {
            found.push(ref);
            await linkTaskToGit(store, {
                taskId: ref.taskId,
                repositoryId: input.repositoryId,
                branchName: input.branchName,
                commitId: c.id,
                linkType: 'auto',
                correlationBasis: ref.basis,
            });
        }
    }

    if (branchRef) {
        // Link branch-level (no commit) once
        await linkTaskToGit(store, {
            taskId: branchRef.taskId,
            repositoryId: input.repositoryId,
            branchName: input.branchName,
            linkType: 'auto',
            correlationBasis: branchRef.basis,
        });
        // Also link each commit via branch correlation
        for (const c of input.commits) {
            await linkTaskToGit(store, {
                taskId: branchRef.taskId,
                repositoryId: input.repositoryId,
                branchName: input.branchName,
                commitId: c.id,
                linkType: 'auto',
                correlationBasis: 'branch_commit',
            });
        }
    }

    return found;
}
