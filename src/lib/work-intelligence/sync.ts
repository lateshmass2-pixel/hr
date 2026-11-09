// =============================================================================
// Work Intelligence — Incremental Sync Engine (spec §25, §26)
// =============================================================================
// Webhook-first: live events arrive via webhook. This module provides the
// catch-up path — scheduled or on-demand per-repository sync using GitHub's
// `since` cursors — plus backfill for initial connection.
//
// Performance rules (§25):
//   * never processes entire history on dashboard requests
//   * stores per-repo sync state (last_synced_at / next_cursor)
//   * bounded pages per run; batch upserts
// Error rules (§26): GitHub failures update sync_status/last_error and never
// throw to the caller.
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/observability/logger';
import { GitHubClient, safeGitHub, toSyncErrorStatus, type CommitDetail, type PRSummary, type PRReviewSummary, type WorkflowRunSummary } from './github-client';
import { decryptToken } from './crypto';
import { parseCoAuthors, detectAgentsFromMessage } from './agents';
import { classifyBotEvidence } from './bots';
import { categorizeFile, classifyChange, summarizeDiff, scoreMeaningfulWork, type FileChange } from './diff-analyzer';
import { IdentityResolver } from './identity';

export interface SyncOutcome {
    repositoryId: string;
    status: 'SYNCED' | 'ERROR' | 'REAUTH_REQUIRED';
    commitsIngested: number;
    prsIngested: number;
    runsIngested: number;
    detail?: string;
}

interface RepoRow {
    id: string;
    organization_id: string;
    github_repo_id: number;
    full_name: string;
    is_active: boolean;
    sync_status: string;
    last_synced_at: string | null;
}

const MAX_COMMITS_PER_RUN = 100;
const MAX_PRS_PER_RUN = 30;

/**
 * Sync one repository (commits + PRs + reviews + workflow runs) incrementally.
 * Safe to call repeatedly; each run continues from last_synced_at.
 */
export async function syncRepository(
    supabase: SupabaseClient,
    repositoryId: string
): Promise<SyncOutcome> {
    const { data: repo, error: repoErr } = await supabase
        .from('git_repositories')
        .select('id, organization_id, github_repo_id, full_name, is_active, sync_status, last_synced_at')
        .eq('id', repositoryId)
        .single<RepoRow>();
    if (repoErr || !repo) {
        return emptyOutcome(repositoryId, 'ERROR', 'repository not found');
    }
    if (!repo.is_active) {
        return emptyOutcome(repositoryId, 'ERROR', 'repository is inactive');
    }

    await setSyncStatus(supabase, repositoryId, 'SYNCING');

    // Org token: any connected account with a stored token.
    const token = await getOrgToken(supabase, repo.organization_id);
    if (!token) {
        await finalize(supabase, repositoryId, 'ERROR', 'No GitHub token available for this organization. Connect an account with repository access.');
        return {
            repositoryId, status: 'ERROR', commitsIngested: 0,
            prsIngested: 0, runsIngested: 0,
            detail: 'no token',
        };
    }

    const gh = new GitHubClient(token);
    const resolver = new IdentityResolver(supabase, repo.organization_id);
    const since = repo.last_synced_at ?? new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    let commitsIngested = 0;
    let prsIngested = 0;
    let runsIngested = 0;

    try {
        // --- Commits --------------------------------------------------------
        let fetched = 0;
        let page = 1;
        let latest: CommitDetail | null = null;
        while (fetched < MAX_COMMITS_PER_RUN) {
            const batch = await safeGitHub(
                () => gh.listCommits(repo.full_name, { since, per_page: 50, page }),
                `sync commits ${repo.full_name}`
            );
            if (!batch) break;
            if (batch.length === 0) break;

            for (const summaryCommit of batch) {
                // listCommits gives only stub commit info; fetch details for stats
                const detail = await safeGitHub(
                    () => gh.getCommit(repo.full_name, summaryCommit.sha),
                    `sync commit detail ${repo.full_name}@${summaryCommit.sha.slice(0, 7)}`
                );
                if (!detail) continue;
                await upsertCommitFromDetail(supabase, repo, detail, resolver);
                commitsIngested++;
                latest = detail;
            }
            fetched += batch.length;
            page++;
            if (batch.length < 50) break;
        }

        // --- Pull requests + reviews ----------------------------------------
        const prs = await safeGitHub(
            () => gh.listPullRequests(repo.full_name, { state: 'all', per_page: MAX_PRS_PER_RUN }),
            `sync PRs ${repo.full_name}`
        );
        if (prs) {
            for (const pr of prs) {
                await upsertPullRequest(supabase, repo, pr, resolver);
                prsIngested++;
                const reviews = await safeGitHub(
                    () => gh.listReviews(repo.full_name, pr.number),
                    `sync reviews ${repo.full_name}#${pr.number}`
                );
                if (reviews) {
                    for (const review of reviews) {
                        await upsertReview(supabase, repo, pr, review, resolver);
                    }
                }
            }
        }

        // --- Workflow runs ---------------------------------------------------
        const runs = await safeGitHub(
            () => gh.listWorkflowRuns(repo.full_name, { per_page: 30 }),
            `sync runs ${repo.full_name}`
        );
        if (runs) {
            for (const run of runs.workflow_runs) {
                await upsertWorkflowRun(supabase, repo, run, resolver);
                runsIngested++;
            }
        }

        const cursor = latest?.commit.committer?.date ?? new Date().toISOString();
        await finalize(supabase, repositoryId, 'SYNCED', null, cursor);
        return {
            repositoryId,
            status: 'SYNCED',
            commitsIngested,
            prsIngested,
            runsIngested,
        };
    } catch (err) {
        const st = toSyncErrorStatus(err);
        await finalize(
            supabase,
            repositoryId,
            st,
            err instanceof Error ? err.message : String(err)
        );
        return {
            repositoryId,
            status: st,
            commitsIngested,
            prsIngested,
            runsIngested,
            detail: err instanceof Error ? err.message : String(err),
        };
    }
}

function emptyOutcome(
    repositoryId: string,
    status: 'ERROR' | 'REAUTH_REQUIRED',
    detail: string
): SyncOutcome {
    return {
        repositoryId,
        status,
        commitsIngested: 0,
        prsIngested: 0,
        runsIngested: 0,
        detail,
    };
}

async function getOrgToken(
    supabase: SupabaseClient,
    organizationId: string
): Promise<string | null> {
    const { data } = await supabase
        .from('git_accounts')
        .select('access_token_encrypted, sync_enabled, status')
        .eq('organization_id', organizationId)
        .eq('sync_enabled', true)
        .not('access_token_encrypted', 'is', null)
        .order('connected_at', { ascending: true })
        .limit(1)
        .maybeSingle();
    if (!data) return null;
    if (data.status === 'REAUTH_REQUIRED' || data.status === 'DISCONNECTED') return null;
    return decryptToken(data.access_token_encrypted);
}

async function setSyncStatus(
    supabase: SupabaseClient,
    repositoryId: string,
    status: string,
    error: string | null = null
): Promise<void> {
    await supabase
        .from('git_repositories')
        .update({
            sync_status: status,
            ...(error ? { last_error: error } : {}),
        })
        .eq('id', repositoryId);
}

async function finalize(
    supabase: SupabaseClient,
    repositoryId: string,
    status: 'SYNCED' | 'ERROR' | 'REAUTH_REQUIRED',
    error: string | null,
    cursor?: string
): Promise<void> {
    await supabase
        .from('git_repositories')
        .update({
            sync_status: status,
            last_error: error,
            ...(cursor ? { last_synced_at: cursor } : {}),
        })
        .eq('id', repositoryId);
}

// ---------------------------------------------------------------------------
// Upsert helpers (mirrors webhook ingestion semantics)
// ---------------------------------------------------------------------------

async function upsertCommitFromDetail(
    supabase: SupabaseClient,
    repo: RepoRow,
    detail: CommitDetail,
    resolver: IdentityResolver
): Promise<void> {
    const identity = await resolver.resolveAuthor({
        authorGithubId: detail.author?.id ?? null,
        authorLogin: detail.author?.login ?? null,
        authorEmail: detail.commit.author?.email ?? null,
    });
    const bot = classifyBotEvidence(detail.author);
    const message = detail.commit.message ?? '';
    const coAuthors = parseCoAuthors(message);
    const agentDetections = detectAgentsFromMessage(message);
    const parentShas = (detail.parents ?? []).map((p) => p.sha);

    const files: FileChange[] = (detail.files ?? []).map((f) => ({
        path: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        changes: f.changes,
        previousPath: f.previous_filename ?? null,
    }));
    const summary = summarizeDiff(files);
    const { category } = classifyChange(files, message);
    const score = scoreMeaningfulWork(summary);

    const { data: commit, error } = await supabase
        .from('git_commits')
        .upsert(
            {
                organization_id: repo.organization_id,
                repository_id: repo.id,
                sha: detail.sha,
                message,
                url: detail.html_url,
                committed_at: detail.commit.author?.date ?? detail.commit.committer?.date ?? new Date().toISOString(),
                committer_date: detail.commit.committer?.date ?? null,
                author_name: detail.commit.author?.name ?? null,
                author_email: detail.commit.author?.email ?? null,
                committer_name: detail.commit.committer?.name ?? null,
                committer_email: detail.commit.committer?.email ?? null,
                github_actor: detail.author?.login ?? null,
                github_actor_id: detail.author?.id ?? null,
                git_account_id: identity.gitAccountId,
                identity_source: identity.source,
                is_bot: bot.isBot,
                bot_type: bot.botType,
                bot_name: bot.botName,
                automation_source: bot.automationSource,
                additions: detail.stats?.additions ?? 0,
                deletions: detail.stats?.deletions ?? 0,
                changed_files: files.length,
                parent_shas: parentShas,
                co_authors: coAuthors,
                change_category: category,
                meaningful_score: score,
                analyzed_at: new Date().toISOString(),
            },
            { onConflict: 'repository_id,sha' }
        )
        .select('id')
        .single();
    if (error || !commit) {
        logger.warn('sync: commit upsert failed', { sha: detail.sha, err: error?.message });
        return;
    }

    const fileRows = files.slice(0, 300).map((f) => ({
        commit_id: commit.id,
        path: f.path,
        status: f.status ?? 'modified',
        additions: f.additions ?? 0,
        deletions: f.deletions ?? 0,
        changes: f.changes ?? 0,
        previous_path: f.previousPath ?? null,
        file_category: categorizeFile(f.path),
    }));
    if (fileRows.length) {
        await supabase
            .from('git_commit_files')
            .upsert(fileRows, { onConflict: 'commit_id,path' });
    }

    if (detail.verification) {
        await supabase
            .from('git_commit_signatures')
            .upsert(
                {
                    commit_id: commit.id,
                    signature_state: detail.verification.verified
                        ? 'verified'
                        : 'unverified',
                    signature_type: 'unknown',
                    signer_name: detail.commit.committer?.name ?? null,
                    signer_email: detail.commit.committer?.email ?? null,
                    payload: { reason: detail.verification.reason },
                },
                { onConflict: 'commit_id' }
            );
    }

    for (const d of agentDetections) {
        await supabase.from('agent_events').upsert(
            {
                organization_id: repo.organization_id,
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
}

async function upsertPullRequest(
    supabase: SupabaseClient,
    repo: RepoRow,
    pr: PRSummary,
    resolver: IdentityResolver
): Promise<void> {
    const identity = await resolver.resolveActor(pr.user?.id, pr.user?.login);
    const bot = classifyBotEvidence(pr.user);
    const state: 'open' | 'closed' | 'merged' =
        pr.merged_at ? 'merged' : pr.state === 'closed' ? 'closed' : 'open';

    await supabase
        .from('git_pull_requests')
        .upsert(
            {
                organization_id: repo.organization_id,
                repository_id: repo.id,
                pr_number: pr.number,
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
        );
}

async function upsertReview(
    supabase: SupabaseClient,
    repo: RepoRow,
    pr: PRSummary,
    review: PRReviewSummary,
    resolver: IdentityResolver
): Promise<void> {
    const { data: prRow } = await supabase
        .from('git_pull_requests')
        .select('id')
        .eq('repository_id', repo.id)
        .eq('pr_number', pr.number)
        .maybeSingle();
    if (!prRow) return;

    const identity = await resolver.resolveActor(
        review.user?.id,
        review.user?.login
    );
    await supabase
        .from('git_pull_request_reviews')
        .upsert(
            {
                organization_id: repo.organization_id,
                pull_request_id: prRow.id,
                github_review_id: review.id,
                reviewer_username: review.user?.login ?? null,
                reviewer_github_id: review.user?.id ?? null,
                git_account_id: identity.gitAccountId,
                state: review.state,
                body: review.body,
                submitted_at: review.submitted_at,
            },
            { onConflict: 'github_review_id' }
        );
}

async function upsertWorkflowRun(
    supabase: SupabaseClient,
    repo: RepoRow,
    run: WorkflowRunSummary,
    resolver: IdentityResolver
): Promise<void> {
    const identity = await resolver.resolveActor(run.actor?.id, run.actor?.login);
    await supabase
        .from('git_workflow_runs')
        .upsert(
            {
                organization_id: repo.organization_id,
                repository_id: repo.id,
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
        );
}
