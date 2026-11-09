// =============================================================================
// Work Intelligence — Identity Resolution Engine (spec §7)
// =============================================================================
// Maps GitHub identities to HEMS employees WITHOUT ever assuming
// commit.author == employee. Resolution order (strongest first):
//
//   1. github_account  — the GitHub user id matches a connected git_account
//   2. email_match      — commit author email matches a git_account email
//                         (verified primary GitHub email, or employee email)
//   3. push_actor       — no author match; the pusher's account is recorded
//                         as the PROVENANCE of the code arriving, NOT as
//                         authorship (labeled 'push_actor' so the UI can say
//                         "pushed by X; author unverified")
//   4. manual           — an admin explicitly linked the commit
//   5. unmapped         — no mapping; displayed as insufficient evidence
//
// Multiple GitHub accounts per employee are supported; multiple employees per
// GitHub identity are NOT (one git_accounts row per (org, github_user_id)).
// =============================================================================

import { SupabaseClient } from '@supabase/supabase-js';
import type { IdentitySource } from './types';

export interface ResolvedIdentity {
    gitAccountId: string | null;
    employeeId: string | null;
    source: IdentitySource;
    /** Human-readable explanation shown in evidence panels. */
    note: string;
}

export interface AccountRow {
    id: string;
    employee_id: string | null;
    github_user_id: number;
    github_username: string;
    email: string | null;
    is_bot: boolean;
}

export interface IdentityInput {
    /** GitHub user id of the commit author (from REST API), if known. */
    authorGithubId?: number | null;
    authorLogin?: string | null;
    authorEmail?: string | null;
    /** GitHub user id of the pusher/sender (webhook), if known. */
    pusherGithubId?: number | null;
    pusherLogin?: string | null;
    pusherEmail?: string | null;
}

/** Load all accounts for an org once per ingestion batch (perf, §25). */
export class IdentityResolver {
    private byGithubId = new Map<number, AccountRow>();
    private byEmail = new Map<string, AccountRow>();
    private byLogin = new Map<string, AccountRow>();
    private loaded = false;

    constructor(
        private readonly supabase: SupabaseClient,
        private readonly organizationId: string
    ) {}

    async load(): Promise<void> {
        if (this.loaded) return;
        const { data, error } = await this.supabase
            .from('git_accounts')
            .select('id, employee_id, github_user_id, github_username, email, is_bot')
            .eq('organization_id', this.organizationId);
        if (error) throw error;
        for (const row of (data ?? []) as AccountRow[]) {
            this.byGithubId.set(row.github_user_id, row);
            if (row.email) this.byEmail.set(row.email.toLowerCase(), row);
            this.byLogin.set(row.github_username.toLowerCase(), row);
        }
        this.loaded = true;
    }

    byId(githubUserId: number): AccountRow | null {
        return this.byGithubId.get(githubUserId) ?? null;
    }

    /**
     * Resolve the author identity of a commit/push to a git_account.
     * Falls back to pusher provenance — clearly labeled.
     */
    async resolveAuthor(input: IdentityInput): Promise<ResolvedIdentity> {
        await this.load();

        // 1. GitHub account by user id (REST-enriched commits)
        if (input.authorGithubId) {
            const acc = this.byGithubId.get(input.authorGithubId);
            if (acc) {
                return {
                    gitAccountId: acc.id,
                    employeeId: acc.employee_id,
                    source: 'github_account',
                    note: `Commit author matched connected GitHub account ${acc.github_username} by GitHub user id`,
                };
            }
        }

        // 2. Email match (author email == verified account email)
        if (input.authorEmail) {
            const acc = this.byEmail.get(input.authorEmail.toLowerCase());
            if (acc) {
                return {
                    gitAccountId: acc.id,
                    employeeId: acc.employee_id,
                    source: 'email_match',
                    note: `Commit author email matches connected GitHub account ${acc.github_username}`,
                };
            }
        }

        // 2b. Login match (webhook-only mode: sender login known, id unknown)
        if (input.authorLogin) {
            const acc = this.byLogin.get(input.authorLogin.toLowerCase());
            if (acc) {
                return {
                    gitAccountId: acc.id,
                    employeeId: acc.employee_id,
                    source: 'github_account',
                    note: `Commit author login matches connected GitHub account ${acc.github_username}`,
                };
            }
        }

        // 3. Push-actor provenance (weaker: who delivered the code, not who
        //    wrote it). Recorded but labeled so reports can phrase it safely.
        if (input.pusherGithubId) {
            const acc = this.byGithubId.get(input.pusherGithubId);
            if (acc) {
                return {
                    gitAccountId: acc.id,
                    employeeId: acc.employee_id,
                    source: 'push_actor',
                    note: `Author did not match any account; push provenance attributed to ${acc.github_username} (pusher). Authorship itself is unverified.`,
                };
            }
        }
        if (input.pusherLogin) {
            const acc = this.byLogin.get(input.pusherLogin.toLowerCase());
            if (acc) {
                return {
                    gitAccountId: acc.id,
                    employeeId: acc.employee_id,
                    source: 'push_actor',
                    note: `Author did not match any account; push provenance attributed to ${acc.github_username} (pusher). Authorship itself is unverified.`,
                };
            }
        }

        // 5. No mapping.
        return {
            gitAccountId: null,
            employeeId: null,
            source: 'unmapped',
            note: 'No GitHub identity mapping found for this commit author; recorded as unattributed evidence',
        };
    }

    /** Resolve a reviewer/PR author/CI actor to an account by id or login. */
    async resolveActor(
        githubUserId?: number | null,
        login?: string | null
    ): Promise<ResolvedIdentity> {
        await this.load();
        if (githubUserId) {
            const acc = this.byGithubId.get(githubUserId);
            if (acc) {
                return {
                    gitAccountId: acc.id,
                    employeeId: acc.employee_id,
                    source: 'github_account',
                    note: `Matched connected GitHub account ${acc.github_username}`,
                };
            }
        }
        if (login) {
            const acc = this.byLogin.get(login.toLowerCase());
            if (acc) {
                return {
                    gitAccountId: acc.id,
                    employeeId: acc.employee_id,
                    source: 'github_account',
                    note: `Matched connected GitHub account ${acc.github_username}`,
                };
            }
        }
        return {
            gitAccountId: null,
            employeeId: null,
            source: 'unmapped',
            note: 'No connected GitHub account matches this actor',
        };
    }
}

/**
 * Parse the author/committer emails from a raw commit payload.
 * Handles GitHub noreply emails (id+login@users.noreply.github.com).
 */
export function parseGithubNoreply(
    email: string | null | undefined
): { login: string | null; githubUserId: number | null } {
    if (!email) return { login: null, githubUserId: null };
    const m = email.match(/^(\d+)\+([^@]+)@users\.noreply\.github\.com$/i);
    if (m) {
        return { login: m[2], githubUserId: Number(m[1]) };
    }
    return { login: null, githubUserId: null };
}
