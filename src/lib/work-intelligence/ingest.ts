// =============================================================================
// Work Intelligence — Webhook Ingestion Engine (spec §5, §7–§13)
// =============================================================================
// Processes verified GitHub webhook events into normalized evidence:
//   push → git_push_events + git_commits (+files, signatures, agents, bots)
//   pull_request → git_pull_requests
//   pull_request_review → git_pull_request_reviews
//   workflow_run → git_workflow_runs
//
// Design rules:
//   * Idempotent: delivery_id unique in git_events; per-entity upserts on
//     GitHub ids. A replayed webhook is a no-op.
//   * Evidence-preserving: raw payload is always persisted first; processing
//     failures mark the event 'error' without losing data.
//   * Identity: authors are resolved via IdentityResolver — never assumed.
//   * Enrichment: commits are fetched from the GitHub API for stats,
//     signatures and parent SHAs when a token is available; webhook-only
//     mode stores what the push payload provides.
//   * Non-throwing: GitHub API failures degrade gracefully (§26).
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/observability/logger';
import { classifyBotEvidence } from './bots';
import { detectAgentsFromMessage, detectAgentFromApp, parseCoAuthors } from './agents';
import { categorizeFile, classifyChange, summarizeDiff, scoreMeaningfulWork, type FileChange } from './diff-analyzer';
import { IdentityResolver } from './identity';
import { correlatePush, loadKnownTaskIds } from './correlation';
import { GitHubClient, safeGitHub } from './github-client';
import { decryptToken } from './crypto';
import type { EvidenceFact } from './types';

// ---------------------------------------------------------------------------
// Webhook payload shapes (subset actually used)
// ---------------------------------------------------------------------------

export interface WebhookRepository {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    html_url?: string;
    default_branch?: string;
    visibility?: string;
    owner: { login: string; id: number; type?: string };
}

export interface WebhookUser {
    login: string;
    id: number;
    type?: string;
}

interface PushPayload {
    ref: string;
    before: string;
    after: string;
    repository: WebhookRepository;
    pusher: { name: string; email: string | null };
    sender: WebhookUser & { type?: string };
    commits: Array<{
        id: string;
        message: string;
        timestamp: string;
        url: string;
        distinct: boolean;
        added: string[];
        removed: string[];
        modified: string[];
        author: { name: string; email: string | null; username?: string | null };
        committer: { name: string; email: string | null; username?: string | null };
    }>;
}

interface PullRequestPayload {
    action: string;
    number: number;
    pull_request: {
        id: number;
        number: number;
        title: string;
        body: string | null;
        state: string;
        draft: boolean;
        merged: boolean;
        merged_at: string | null;
        closed_at: string | null;
        created_at: string;
        updated_at: string;
        user: WebhookUser | null;
        head: { ref: string; sha: string; repo?: { full_name?: string } | null };
        base: { ref: string };
        html_url: string;
        additions?: number;
        deletions?: number;
        changed_files?: number;
        commits?: number;
    };
    repository: WebhookRepository;
    sender: WebhookUser;
}

interface ReviewPayload {
    action: string;
    review: {
        id: number;
        state: string;
        body: string | null;
        user: WebhookUser | null;
        submitted_at: string;
        html_url: string;
    };
    pull_request: { id: number; number: number; head: { sha: string } };
    repository: WebhookRepository;
    sender: WebhookUser;
}

interface WorkflowRunPayload {
    action: string;
    workflow_run: {
        id: number;
        name: string | null;
        path: string | null;
        event: string;
        head_branch: string | null;
        head_sha: string;
        status: string;
        conclusion: string | null;
        actor: WebhookUser | null;
        html_url: string;
        run_started_at: string | null;
        run_completed_at?: string | null;
        updated_at?: string | null;
    };
    repository: WebhookRepository;
    sender: WebhookUser;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export interface IngestContext {
    supabase: SupabaseClient;
    /** delivery id — the idempotency key */
    deliveryId: string;
    eventType: string;
    action: string | null;
    senderLogin: string | null;
    payload: Record<string, unknown>;
}

export interface IngestResult {
    status: 'processed' | 'duplicate' | 'ignored' | 'error';
    detail?: string;
}

export async function ingestWebhookEvent(ctx: IngestContext): Promise<IngestResult> {
    const { supabase, deliveryId, eventType } = ctx;

    // ---- Idempotency: check-then-insert on the unique delivery id ----------
    const { data: existing } = await supabase
        .from('git_events')
        .select('id, processing_status')
        .eq('delivery_id', deliveryId)
        .maybeSingle();

    if (existing) {
        if (existing.processing_status === 'processed') {
            await supabase
                .from('git_events')
                .update({ processing_status: 'duplicate' })
                .eq('id', existing.id);
            return { status: 'duplicate', detail: 'delivery already processed' };
        }
        if (existing.processing_status === 'error' || existing.processing_status === 'received') {
            // Retry path: reprocess below, reusing the row.
        }
    }

    const payload = ctx.payload as unknown as {
        repository?: WebhookRepository;
    };
    const repoMeta = payload.repository ?? null;
    const repoRow = repoMeta
        ? await findRepositoryByGitHubId(supabase, repoMeta.id)
        : null;

    let eventId: string;
    if (existing) {
        eventId = existing.id;
    } else {
        const { data: event, error } = await supabase
            .from('git_events')
            .insert({
                delivery_id: deliveryId,
                event_type: eventType,
                action: ctx.action,
                github_actor: ctx.senderLogin,
                payload: ctx.payload,
                signature_valid: true,
                processing_status: 'received',
                organization_id: repoRow ? repoRow.organizationId : null,
                repository_id: repoRow ? repoRow.id : null,
            })
            .select('id')
            .single();
        if (error) throw error;
        eventId = event.id;
    }

    try {
        let result: IngestResult = { status: 'ignored', detail: 'unhandled event type' };
        switch (eventType) {
            case 'push':
                result = await processPush(ctx, repoRow, eventId);
                break;
            case 'pull_request':
                result = await processPullRequest(ctx, repoRow, eventId);
                break;
            case 'pull_request_review':
                result = await processReview(ctx, repoRow, eventId);
                break;
            case 'workflow_run':
                result = await processWorkflowRun(ctx, repoRow, eventId);
                break;
            default:
                break;
        }

        await supabase
            .from('git_events')
            .update({
                processing_status: result.status === 'ignored' ? 'ignored' : 'processed',
                processed_at: new Date().toISOString(),
                processing_error: result.detail ?? null,
            })
            .eq('id', eventId);
        return result;
    } catch (err) {
        logger.error('Webhook event processing failed', {
            deliveryId,
            eventType,
            err: err instanceof Error ? err.message : String(err),
        });
        await supabase
            .from('git_events')
            .update({
                processing_status: 'error',
                processing_error: err instanceof Error ? err.message : String(err),
            })
            .eq('id', eventId);
        return { status: 'error', detail: String(err) };
    }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function findRepositoryByGitHubId(
    supabase: SupabaseClient,
    githubRepoId: number
): Promise<{ id: string; organizationId: string; fullName: string } | null> {
    const { data } = await supabase
        .from('git_repositories')
        .select('id, organization_id, full_name')
        .eq('github_repo_id', githubRepoId)
        .maybeSingle();
    if (!data) return null;
    return {
        id: data.id,
        organizationId: data.organization_id,
        fullName: data.full_name,
    };
}

async function getSyncToken(
    supabase: SupabaseClient,
    organizationId: string
): Promise<string | null> {
    // Prefer an org account with a stored token (first connected).
    const { data } = await supabase
        .from('git_accounts')
        .select('access_token_encrypted')
        .eq('organization_id', organizationId)
        .not('access_token_encrypted', 'is', null)
        .order('connected_at', { ascending: true })
        .limit(1)
        .maybeSingle();
    return data ? decryptToken(data.access_token_encrypted) : null;
}

async function recordEvidence(
    supabase: SupabaseClient,
    organizationId: string,
    facts: EvidenceFact[]
): Promise<void> {
    if (facts.length === 0) return;
    const { error } = await supabase.from('work_evidence').insert(
        facts.map((f) => ({
            organization_id: organizationId,
            employee_id: f.employeeId,
            evidence_type: f.evidenceType,
            source_table: f.sourceTable,
            source_id: f.sourceId,
            observed_at: f.observedAt ?? new Date().toISOString(),
            weight: f.weight ?? 1.0,
            details: f.details ?? {},
        }))
    );
    if (error) logger.warn('work_evidence insert failed', { err: error.message });
}

// ---------------------------------------------------------------------------
// PUSH
// ---------------------------------------------------------------------------

async function processPush(
    ctx: IngestContext,
    repoRow: { id: string; organizationId: string; fullName: string } | null,
    eventId: string
): Promise<IngestResult> {
    if (!repoRow) return { status: 'ignored', detail: 'repository not connected' };
    const payload = ctx.payload as unknown as PushPayload;
    const { supabase } = ctx;

    const branch = payload.ref.replace(/^refs\/heads\//, '');
    const isTag = payload.ref.startsWith('refs/tags/');

    // Upsert the branch
    await supabase
        .from('git_branches')
        .upsert(
            {
                organization_id: repoRow.organizationId,
                repository_id: repoRow.id,
                name: branch,
                last_commit_sha: payload.after,
                last_activity_at: new Date().toISOString(),
            },
            { onConflict: 'repository_id,name' }
        );

    if (isTag) return { status: 'ignored', detail: 'tag push ignored' };

    // Sender bot classification
    const bot = classifyBotEvidence(payload.sender, payload.sender as never);
    const pusherIdentity = await new IdentityResolver(supabase, repoRow.organizationId)
        .resolveAuthor({
            pusherLogin: payload.sender.login,
            pusherGithubId: payload.sender.id,
        });

    // Push event (idempotent on webhook_event_id + after_sha)
    const { data: pushEvent, error: pushErr } = await supabase
        .from('git_push_events')
        .upsert(
            {
                organization_id: repoRow.organizationId,
                repository_id: repoRow.id,
                webhook_event_id: eventId,
                branch,
                before_sha: payload.before,
                after_sha: payload.after,
                commit_shas: payload.commits.map((c) => c.id),
                pushed_at: new Date().toISOString(),
                git_account_id: pusherIdentity.gitAccountId,
                github_actor: payload.sender.login,
                github_actor_id: payload.sender.id,
                pusher_name: payload.pusher.name,
                pusher_email: payload.pusher.email,
                sender_login: payload.sender.login,
                is_bot: bot.isBot,
                bot_type: bot.botType,
            },
            { onConflict: 'repository_id,webhook_event_id,after_sha' }
        )
        .select('id')
        .single();
    if (pushErr || !pushEvent) throw pushErr ?? new Error('push insert failed');

    // Automation evidence for bot pushes
    if (bot.isBot) {
        await supabase.from('automation_events').upsert(
            {
                organization_id: repoRow.organizationId,
                source_kind: 'push',
                push_event_id: pushEvent.id,
                bot_type: bot.botType ?? 'other',
                bot_name: bot.botName ?? payload.sender.login,
                automation_source: bot.automationSource,
                evidence: { sender_type: payload.sender.type ?? null, sender_login: payload.sender.login },
            },
            { onConflict: 'push_event_id,bot_name' }
        );
    }

    const token = await getSyncToken(supabase, repoRow.organizationId);
    const gh = new GitHubClient(token);

    const storedCommits: Array<{ id: string; message: string }> = [];
    const evidenceFacts: EvidenceFact[] = [];

    for (const c of payload.commits) {
        if (!c.distinct) continue; // already counted in a previous push

        const identity = await new IdentityResolver(supabase, repoRow.organizationId)
            .resolveAuthor({
                authorEmail: c.author.email,
                authorLogin: c.author.username ?? null,
                pusherLogin: payload.sender.login,
                pusherGithubId: payload.sender.id,
            });

        const coAuthors = parseCoAuthors(c.message);
        const agentDetections = detectAgentsFromMessage(c.message);
        const commitBot = classifyBotEvidence(
            c.author.username
                ? { login: c.author.username, type: 'User' }
                : null
        );

        // Enrich from the API when possible (stats, files, signature, parents)
        let stats = { additions: 0, deletions: 0, changedFiles: c.added.length + c.removed.length + c.modified.length };
        let files: FileChange[] = [
            ...c.added.map((p) => ({ path: p, status: 'added' })),
            ...c.removed.map((p) => ({ path: p, status: 'removed' })),
            ...c.modified.map((p) => ({ path: p, status: 'modified' })),
        ];
        let parentShas: string[] = [];
        let signature: {
            state: 'verified' | 'unverified' | 'expired_key' | 'invalid' | 'unsigned';
            type: 'gpg' | 'ssh' | 'smime' | 'unknown';
            signerName: string | null;
            signerEmail: string | null;
        } | null = null;

        if (token) {
            const detail = await safeGitHub(
                () => gh.getCommit(repoRow.fullName, c.id),
                `commit enrichment ${repoRow.fullName}@${c.id.slice(0, 7)}`
            );
            if (detail) {
                stats.additions = detail.stats?.additions ?? 0;
                stats.deletions = detail.stats?.deletions ?? 0;
                if (detail.files) {
                    files = detail.files.map((f) => ({
                        path: f.filename,
                        status: f.status,
                        additions: f.additions,
                        deletions: f.deletions,
                        changes: f.changes,
                        previousPath: f.previous_filename ?? null,
                    }));
                }
                parentShas = (detail.parents ?? []).map((p) => p.sha);
                if (detail.verification) {
                    signature = {
                        state: detail.verification.verified
                            ? 'verified'
                            : verificationStateFromReason(detail.verification.reason),
                        type: signatureTypeFromReason(detail.verification.reason),
                        signerName: detail.commit.author?.name ?? null,
                        signerEmail: detail.commit.author?.email ?? null,
                    };
                }
            }
        }

        const summary = summarizeDiff(files);
        const { category, rationale } = classifyChange(files, c.message);
        const score = scoreMeaningfulWork(summary);

        const { data: commit, error: commitErr } = await supabase
            .from('git_commits')
            .upsert(
                {
                    organization_id: repoRow.organizationId,
                    repository_id: repoRow.id,
                    sha: c.id,
                    message: c.message,
                    url: c.url,
                    committed_at: c.timestamp,
                    committer_date: c.timestamp,
                    author_name: c.author.name,
                    author_email: c.author.email,
                    committer_name: c.committer.name,
                    committer_email: c.committer.email,
                    push_event_id: pushEvent.id,
                    pusher_account_id: pusherIdentity.gitAccountId,
                    github_actor: payload.sender.login,
                    github_actor_id: payload.sender.id,
                    git_account_id: identity.gitAccountId,
                    identity_source: identity.source,
                    is_bot: commitBot.isBot || bot.isBot,
                    bot_type: commitBot.botType ?? bot.botType,
                    bot_name: commitBot.botName ?? bot.botName,
                    automation_source: commitBot.automationSource ?? bot.automationSource,
                    additions: stats.additions,
                    deletions: stats.deletions,
                    changed_files: stats.changedFiles,
                    parent_shas: parentShas,
                    co_authors: coAuthors,
                    change_category: category,
                    meaningful_score: score,
                    analyzed_at: new Date().toISOString(),
                },
                { onConflict: 'repository_id,sha' }
            )
            .select('id, git_account_id')
            .single();
        if (commitErr || !commit) {
            logger.warn('commit upsert failed', { sha: c.id, err: commitErr?.message });
            continue;
        }

        storedCommits.push({ id: commit.id, message: c.message });

        // Per-file rows
        const fileRows = files.slice(0, 300).map((f) => ({
            commit_id: commit.id,
            path: f.path,
            status: f.status ?? 'modified',
            additions: f.additions ?? 0,
            deletions: f.deletions ?? 0,
            changes: f.changes ?? (f.additions ?? 0) + (f.deletions ?? 0),
            previous_path: f.previousPath ?? null,
            file_category: categorizeFile(f.path),
        }));
        if (fileRows.length > 0) {
            const { error: filesErr } = await supabase
                .from('git_commit_files')
                .upsert(fileRows, { onConflict: 'commit_id,path' });
            if (filesErr) logger.warn('commit files upsert failed', { err: filesErr.message });
        }

        // Signature evidence
        if (signature) {
            await supabase
                .from('git_commit_signatures')
                .upsert(
                    {
                        commit_id: commit.id,
                        signature_state: signature.state,
                        signature_type: signature.type,
                        signer_name: signature.signerName,
                        signer_email: signature.signerEmail,
                        payload: {
                            reason: 'github_commit_verification',
                        },
                    },
                    { onConflict: 'commit_id' }
                );
            if (signature.state === 'verified') {
                evidenceFacts.push({
                    employeeId: identity.employeeId,
                    evidenceType: 'signed_commit',
                    sourceTable: 'git_commit_signatures',
                    sourceId: commit.id,
                    observedAt: c.timestamp,
                    details: { signature_type: signature.type },
                });
            }
        }

        // Agent provenance
        for (const d of agentDetections) {
            await supabase.from('agent_events').upsert(
                {
                    organization_id: repoRow.organizationId,
                    agent_type: d.agentType,
                    detection_basis: d.basis,
                    confidence: d.confidence,
                    source_kind: 'commit',
                    commit_id: commit.id,
                    agent_name: d.agentName,
                    evidence: d.evidence,
                },
                { onConflict: 'commit_id,agent_type,agent_name' }
            );
        }

        // Bot provenance on the commit
        if (commitBot.isBot) {
            await supabase.from('automation_events').upsert(
                {
                    organization_id: repoRow.organizationId,
                    source_kind: 'commit',
                    commit_id: commit.id,
                    bot_type: commitBot.botType ?? 'other',
                    bot_name: commitBot.botName ?? c.author.username ?? 'unknown',
                    automation_source: commitBot.automationSource,
                    evidence: { author_username: c.author.username ?? null, message_prefix: c.message.slice(0, 80) },
                },
                { onConflict: 'commit_id,bot_name' }
            );
        }

        // Meaningful-work evidence
        if (
            summary.churnByCategory.source > 0 ||
            summary.churnByCategory.test > 0 ||
            summary.churnByCategory.migration > 0
        ) {
            evidenceFacts.push({
                employeeId: identity.employeeId,
                evidenceType: 'meaningful_source_change',
                sourceTable: 'git_commits',
                sourceId: commit.id,
                observedAt: c.timestamp,
                weight: Math.min(3, score / 33),
                details: {
                    category: rationale,
                    additions: summary.additions,
                    deletions: summary.deletions,
                    source_files: summary.sourceFiles,
                    test_files: summary.testFiles,
                },
            });
        }
        if (summary.testFiles > 0) {
            evidenceFacts.push({
                employeeId: identity.employeeId,
                evidenceType: 'test_activity',
                sourceTable: 'git_commit_files',
                sourceId: commit.id,
                observedAt: c.timestamp,
                details: { test_files: summary.testFiles },
            });
        }
        if (identity.gitAccountId && identity.source === 'github_account') {
            evidenceFacts.push({
                employeeId: identity.employeeId,
                evidenceType: 'identity_verified',
                sourceTable: 'git_accounts',
                sourceId: identity.gitAccountId,
                observedAt: c.timestamp,
                details: { note: identity.note },
            });
        }
        evidenceFacts.push({
            employeeId: pusherIdentity.employeeId,
            evidenceType: 'push_provenance',
            sourceTable: 'git_push_events',
            sourceId: pushEvent.id,
            observedAt: c.timestamp,
            details: { actor: payload.sender.login, branch },
        });
    }

    await recordEvidence(supabase, repoRow.organizationId, evidenceFacts);

    // Task correlation (auto)
    try {
        const knownTaskIds = await loadKnownTaskIds(supabase, repoRow.organizationId);
        if (knownTaskIds.length > 0) {
            await correlatePush(
                { supabase, organizationId: repoRow.organizationId },
                {
                    repositoryId: repoRow.id,
                    branchName: branch,
                    commits: storedCommits.map((c) => ({
                        ...c,
                        gitAccountId: null,
                        employeeId: null,
                    })),
                    knownTaskIds,
                }
            );
        }
    } catch (err) {
        logger.warn('task correlation failed (non-fatal)', { err: String(err) });
    }

    return {
        status: 'processed',
        detail: `${payload.commits.length} commit(s) ingested on ${branch}`,
    };
}

function verificationStateFromReason(reason: string | null): 'unverified' | 'expired_key' | 'invalid' {
    if (reason === 'expired_key') return 'expired_key';
    if (reason && /invalid|unknown|none|unsigned|bad/i.test(reason)) return 'invalid';
    return 'unverified';
}

function signatureTypeFromReason(reason: string | null): 'gpg' | 'ssh' | 'smime' | 'unknown' {
    if (!reason) return 'unknown';
    const lower = reason.toLowerCase();
    if (lower.includes('gpg')) return 'gpg';
    if (lower.includes('ssh')) return 'ssh';
    if (lower.includes('smime') || lower.includes('x509') || lower.includes('s/mime')) return 'smime';
    return 'unknown';
}

// ---------------------------------------------------------------------------
// PULL REQUEST
// ---------------------------------------------------------------------------

async function processPullRequest(
    ctx: IngestContext,
    repoRow: { id: string; organizationId: string } | null,
    _eventId: string
): Promise<IngestResult> {
    if (!repoRow) return { status: 'ignored', detail: 'repository not connected' };
    const payload = ctx.payload as unknown as PullRequestPayload;
    const { supabase } = ctx;
    const pr = payload.pull_request;

    const resolver = new IdentityResolver(supabase, repoRow.organizationId);
    const identity = await resolver.resolveActor(pr.user?.id, pr.user?.login);
    const bot = classifyBotEvidence(pr.user ?? null);
    const agents = detectAgentFromApp({ slug: pr.user?.login, name: pr.user?.login });

    const state: 'open' | 'closed' | 'merged' =
        pr.merged || pr.merged_at ? 'merged' : pr.state === 'closed' ? 'closed' : 'open';

    const { data: prRow, error } = await supabase
        .from('git_pull_requests')
        .upsert(
            {
                organization_id: repoRow.organizationId,
                repository_id: repoRow.id,
                pr_number: payload.number,
                github_pr_id: pr.id,
                title: pr.title,
                body: pr.body,
                url: pr.html_url,
                state,
                is_draft: pr.draft,
                author_username: pr.user?.login ?? null,
                author_github_id: pr.user?.id ?? null,
                git_account_id: identity.gitAccountId,
                author_is_bot: bot.isBot,
                author_bot_type: bot.botType,
                author_app_slug: agents?.agentName ?? null,
                head_branch: pr.head.ref,
                base_branch: pr.base.ref,
                head_sha: pr.head.sha,
                additions: pr.additions ?? 0,
                deletions: pr.deletions ?? 0,
                changed_files: pr.changed_files ?? 0,
                commit_count: pr.commits ?? 0,
                gh_created_at: pr.created_at,
                gh_updated_at: pr.updated_at,
                merged_at: pr.merged_at,
                closed_at: pr.closed_at,
            },
            { onConflict: 'repository_id,pr_number' }
        )
        .select('id')
        .single();
    if (error) throw error;

    const facts: EvidenceFact[] = [];
    if (identity.gitAccountId) {
        facts.push({
            employeeId: identity.employeeId,
            evidenceType: 'pr_activity',
            sourceTable: 'git_pull_requests',
            sourceId: prRow.id,
            observedAt: pr.updated_at,
            details: { title: pr.title, action: payload.action, state },
        });
    }
    if (agents && !bot.isBot) {
        await supabase.from('agent_events').upsert(
            {
                organization_id: repoRow.organizationId,
                agent_type: agents.agentType,
                detection_basis: agents.basis,
                confidence: agents.confidence,
                source_kind: 'pull_request',
                pull_request_id: prRow.id,
                agent_name: agents.agentName,
                evidence: agents.evidence,
            },
            { onConflict: 'pull_request_id,agent_type,agent_name' }
        );
    }
    await recordEvidence(supabase, repoRow.organizationId, facts);

    // Task correlation via PR body/title refs
    try {
        const knownTaskIds = await loadKnownTaskIds(supabase, repoRow.organizationId);
        if (knownTaskIds.length > 0) {
            const { extractTaskRefs, linkTaskToGit } = await import('./correlation');
            for (const ref of [
                ...extractTaskRefs(pr.body, knownTaskIds),
                ...extractTaskRefs(pr.title, knownTaskIds).map((r) => ({
                    ...r,
                    basis: 'pr_title_ref' as const,
                })),
            ]) {
                await linkTaskToGit(
                    { supabase, organizationId: repoRow.organizationId },
                    {
                        taskId: ref.taskId,
                        repositoryId: repoRow.id,
                        pullRequestId: prRow.id,
                        branchName: pr.head.ref,
                        linkType: 'auto',
                        correlationBasis: ref.basis,
                    }
                );
            }
        }
    } catch (err) {
        logger.warn('PR task correlation failed (non-fatal)', { err: String(err) });
    }

    return { status: 'processed', detail: `PR #${payload.number} ${payload.action}` };
}

// ---------------------------------------------------------------------------
// REVIEW
// ---------------------------------------------------------------------------

async function processReview(
    ctx: IngestContext,
    repoRow: { id: string; organizationId: string } | null,
    _eventId: string
): Promise<IngestResult> {
    if (!repoRow) return { status: 'ignored', detail: 'repository not connected' };
    const payload = ctx.payload as unknown as ReviewPayload;
    const { supabase } = ctx;

    const { data: prRow } = await supabase
        .from('git_pull_requests')
        .select('id')
        .eq('repository_id', repoRow.id)
        .eq('pr_number', payload.pull_request.number)
        .maybeSingle();
    if (!prRow) return { status: 'ignored', detail: 'PR not yet ingested' };

    const resolver = new IdentityResolver(supabase, repoRow.organizationId);
    const identity = await resolver.resolveActor(
        payload.review.user?.id,
        payload.review.user?.login
    );

    await supabase
        .from('git_pull_request_reviews')
        .upsert(
            {
                organization_id: repoRow.organizationId,
                pull_request_id: prRow.id,
                github_review_id: payload.review.id,
                reviewer_username: payload.review.user?.login ?? null,
                reviewer_github_id: payload.review.user?.id ?? null,
                git_account_id: identity.gitAccountId,
                state: payload.review.state,
                body: payload.review.body,
                submitted_at: payload.review.submitted_at,
            },
            { onConflict: 'github_review_id' }
        );

    const facts: EvidenceFact[] = [];
    if (identity.gitAccountId) {
        facts.push({
            employeeId: identity.employeeId,
            evidenceType: 'review_activity',
            sourceTable: 'git_pull_request_reviews',
            sourceId: String(payload.review.id),
            observedAt: payload.review.submitted_at,
            details: { state: payload.review.state },
        });
    }
    await recordEvidence(supabase, repoRow.organizationId, facts);

    return { status: 'processed', detail: `review ${payload.review.state}` };
}

// ---------------------------------------------------------------------------
// WORKFLOW RUN (CI)
// ---------------------------------------------------------------------------

async function processWorkflowRun(
    ctx: IngestContext,
    repoRow: { id: string; organizationId: string } | null,
    _eventId: string
): Promise<IngestResult> {
    if (!repoRow) return { status: 'ignored', detail: 'repository not connected' };
    const payload = ctx.payload as unknown as WorkflowRunPayload;
    const { supabase } = ctx;
    const run = payload.workflow_run;

    const resolver = new IdentityResolver(supabase, repoRow.organizationId);
    const identity = await resolver.resolveActor(run.actor?.id, run.actor?.login);
    const bot = classifyBotEvidence(run.actor ?? null);

    const { data: runRow, error } = await supabase
        .from('git_workflow_runs')
        .upsert(
            {
                organization_id: repoRow.organizationId,
                repository_id: repoRow.id,
                github_run_id: run.id,
                name: run.name,
                workflow_file: run.path,
                event: run.event,
                head_branch: run.head_branch,
                head_sha: run.head_sha,
                status: run.status,
                conclusion: run.conclusion,
                actor_username: run.actor?.login ?? null,
                actor_github_id: run.actor?.id ?? null,
                git_account_id: identity.gitAccountId,
                html_url: run.html_url,
                run_started_at: run.run_started_at,
                run_completed_at: run.run_completed_at ?? run.updated_at ?? null,
            },
            { onConflict: 'github_run_id' }
        )
        .select('id')
        .single();
    if (error) throw error;

    const facts: EvidenceFact[] = [];
    if (identity.gitAccountId && !bot.isBot) {
        facts.push({
            employeeId: identity.employeeId,
            evidenceType: 'ci_activity',
            sourceTable: 'git_workflow_runs',
            sourceId: runRow.id,
            observedAt: run.run_started_at ?? new Date().toISOString(),
            details: {
                name: run.name,
                conclusion: run.conclusion,
                event: run.event,
            },
        });
    }
    if (bot.isBot) {
        await supabase.from('automation_events').upsert(
            {
                organization_id: repoRow.organizationId,
                source_kind: 'workflow_run',
                source_github_id: run.id,
                bot_type: bot.botType ?? 'other',
                bot_name: bot.botName ?? 'unknown',
                automation_source: bot.automationSource,
                evidence: { actor: run.actor?.login ?? null },
            },
            { onConflict: 'source_github_id,bot_name' }
        );
    }
    await recordEvidence(supabase, repoRow.organizationId, facts);

    return { status: 'processed', detail: `CI ${run.status}/${run.conclusion ?? ''}` };
}
