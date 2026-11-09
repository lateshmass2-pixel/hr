// =============================================================================
// Work Intelligence — GitHub REST client
// =============================================================================
// Thin fetch wrapper over the GitHub REST API with:
//   * auth from the encrypted OAuth token (decrypted server-side only),
//     or anonymous for public repos,
//   * rate-limit awareness (returns typed failures instead of throwing so
//     ingestion never breaks the dashboard — spec §26),
//   * per-call timeout.
// Tokens never leave the server: this module is imported only by route
// handlers / server modules and never from client components.
// =============================================================================

import { logger } from '@/lib/observability/logger';

const GITHUB_API = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const DEFAULT_TIMEOUT_MS = 15_000;

export class GitHubApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly rateLimited: boolean = false,
        public readonly retryAfterSeconds: number | null = null
    ) {
        super(message);
        this.name = 'GitHubApiError';
    }
}

export interface RepoInfo {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
    default_branch: string;
    owner: { login: string; id: number; type?: string };
    description: string | null;
    visibility?: string;
}

export interface CommitDetail {
    sha: string;
    commit: {
        message: string;
        author: { name: string; email: string; date: string } | null;
        committer: { name: string; email: string; date: string } | null;
    };
    html_url: string;
    parents: Array<{ sha: string }>;
    author: { id: number; login: string; type: string } | null;
    committer: { id: number; login: string; type: string } | null;
    stats?: { additions: number; deletions: number; total: number };
    files?: Array<{
        filename: string;
        status: string;
        additions: number;
        deletions: number;
        changes: number;
        previous_filename?: string;
        patch?: string;
    }>;
    verification?: {
        verified: boolean;
        reason: string | null;
        signature: string | null;
        payload: string | null;
        // GitHub exposes signature type only as part of the reason string
        // (e.g. 'valid', 'expired_key'); type detection is best-effort.
    } | null;
}

export interface UserInfo {
    id: number;
    login: string;
    name: string | null;
    email: string | null;
    avatar_url: string;
    type: string;
}

export class GitHubClient {
    constructor(private readonly token: string | null) {}

    private async request<T>(
        path: string,
        init: RequestInit = {}
    ): Promise<T> {
        const headers: Record<string, string> = {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': API_VERSION,
            ...(init.headers as Record<string, string>),
        };
        if (this.token) headers.Authorization = `Bearer ${this.token}`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
        try {
            const res = await fetch(`${GITHUB_API}${path}`, {
                ...init,
                headers,
                signal: controller.signal,
            });

            if (res.status === 403 || res.status === 429) {
                const retryAfter = res.headers.get('retry-after')
                    ?? res.headers.get('x-ratelimit-reset');
                const remaining = res.headers.get('x-ratelimit-remaining');
                // 403 with remaining=0 is the classic rate-limit response.
                const rateLimited = remaining === '0' || res.status === 429;
                if (rateLimited) {
                    throw new GitHubApiError(
                        `GitHub rate limit hit for ${path}`,
                        res.status,
                        true,
                        retryAfter ? Number(retryAfter) : null
                    );
                }
            }
            if (res.status === 404) {
                throw new GitHubApiError(`Not found: ${path}`, 404);
            }
            if (res.status === 401) {
                throw new GitHubApiError(
                    `Unauthorized (token may be expired/revoked): ${path}`,
                    401
                );
            }
            if (!res.ok) {
                const body = await res.text().catch(() => '');
                throw new GitHubApiError(
                    `GitHub API ${res.status} for ${path}: ${body.slice(0, 300)}`,
                    res.status
                );
            }
            return (await res.json()) as T;
        } catch (err) {
            if (err instanceof GitHubApiError) throw err;
            if (err instanceof Error && err.name === 'AbortError') {
                throw new GitHubApiError(`GitHub API timeout for ${path}`, 0);
            }
            throw err;
        } finally {
            clearTimeout(timer);
        }
    }

    async getRepo(fullName: string): Promise<RepoInfo> {
        return this.request<RepoInfo>(`/repos/${fullName}`);
    }

    async getCommit(fullName: string, sha: string): Promise<CommitDetail> {
        return this.request<CommitDetail>(`/repos/${fullName}/commits/${sha}`);
    }

    async listCommits(
        fullName: string,
        params: { since?: string; per_page?: number; page?: number } = {}
    ): Promise<CommitDetail[]> {
        const qs = new URLSearchParams();
        if (params.since) qs.set('since', params.since);
        qs.set('per_page', String(params.per_page ?? 30));
        if (params.page) qs.set('page', String(params.page));
        return this.request<CommitDetail[]>(
            `/repos/${fullName}/commits?${qs.toString()}`
        );
    }

    async getUser(username: string): Promise<UserInfo> {
        return this.request<UserInfo>(`/users/${username}`);
    }

    async listUserRepos(
        perPage = 50
    ): Promise<Array<RepoInfo & { permissions?: { admin: boolean; push: boolean; pull: boolean } }>> {
        return this.request(
            `/user/repos?per_page=${perPage}&sort=pushed&affiliation=owner,collaborator,organization_member`
        );
    }

    async listPullRequests(
        fullName: string,
        params: { state?: 'open' | 'closed' | 'all'; per_page?: number } = {}
    ): Promise<Array<PRSummary>> {
        const qs = new URLSearchParams();
        qs.set('state', params.state ?? 'all');
        qs.set('per_page', String(params.per_page ?? 30));
        return this.request<Array<PRSummary>>(
            `/repos/${fullName}/pulls?${qs.toString()}`
        );
    }

    async getPullRequest(fullName: string, number: number): Promise<PRSummary> {
        return this.request<PRSummary>(`/repos/${fullName}/pulls/${number}`);
    }

    async listReviews(
        fullName: string,
        number: number
    ): Promise<Array<PRReviewSummary>> {
        return this.request<Array<PRReviewSummary>>(
            `/repos/${fullName}/pulls/${number}/reviews`
        );
    }

    async listWorkflowRuns(
        fullName: string,
        params: { per_page?: number; page?: number } = {}
    ): Promise<{ total_count: number; workflow_runs: WorkflowRunSummary[] }> {
        const qs = new URLSearchParams();
        qs.set('per_page', String(params.per_page ?? 30));
        if (params.page) qs.set('page', String(params.page));
        return this.request(
            `/repos/${fullName}/actions/runs?${qs.toString()}`
        );
    }
}

export interface PRSummary {
    id: number;
    number: number;
    title: string;
    body: string | null;
    state: string;
    draft: boolean;
    user: UserInfo | null;
    head: { ref: string; sha: string; repo?: { full_name?: string } | null };
    base: { ref: string };
    html_url: string;
    created_at: string;
    updated_at: string;
    merged_at: string | null;
    closed_at: string | null;
    mergeable_state?: string;
    additions?: number;
    deletions?: number;
    changed_files?: number;
    commits?: number;
}

export interface PRReviewSummary {
    id: number;
    user: UserInfo | null;
    state: string;
    body: string | null;
    submitted_at: string;
    html_url: string;
    pull_request_url: string;
}

export interface WorkflowRunSummary {
    id: number;
    name: string;
    path: string;
    event: string;
    head_branch: string | null;
    head_sha: string;
    status: string;
    conclusion: string | null;
    actor: UserInfo | null;
    html_url: string;
    run_started_at: string | null;
    run_completed_at?: string | null;
    updated_at: string | null;
}

/** Extract the numeric status code to branch on, for sync error handling. */
export function toSyncErrorStatus(err: unknown): 'ERROR' | 'REAUTH_REQUIRED' {
    if (err instanceof GitHubApiError && err.status === 401) {
        return 'REAUTH_REQUIRED';
    }
    return 'ERROR';
}

/** Log-and-return error channel so route handlers stay non-throwing (§26). */
export async function safeGitHub<T>(
    op: () => Promise<T>,
    context: string
): Promise<T | null> {
    try {
        return await op();
    } catch (err) {
        if (err instanceof GitHubApiError && err.rateLimited) {
            logger.warn(`GitHub rate limit during ${context}`, {
                retryAfter: err.retryAfterSeconds,
            });
        } else {
            logger.error(`GitHub API failure during ${context}`, err);
        }
        return null;
    }
}
