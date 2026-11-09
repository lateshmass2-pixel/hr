// =============================================================================
// Work Intelligence — Shared Types
// =============================================================================
// Canonical enum/type vocabulary for the Work Authenticity & Git Intelligence
// system. Values mirror the CHECK constraints in migrations 008/009 exactly —
// keep both sides in sync when changing either.
// =============================================================================

export type GitSyncStatus =
    | 'CONNECTED'
    | 'SYNCING'
    | 'SYNCED'
    | 'ERROR'
    | 'REAUTH_REQUIRED'
    | 'DISCONNECTED';

/** How a commit came to be attributed to a git_account (never assumed). */
export type IdentitySource =
    | 'github_account'
    | 'email_match'
    | 'push_actor'
    | 'manual'
    | 'unmapped';

/** Deterministic diff classification (spec §12). */
export type ChangeCategory =
    | 'FEATURE'
    | 'BUG_FIX'
    | 'REFACTOR'
    | 'TESTING'
    | 'DOCUMENTATION'
    | 'CONFIGURATION'
    | 'DEPENDENCY'
    | 'GENERATED'
    | 'FORMATTING'
    | 'UNKNOWN';

export type FileCategory =
    | 'source'
    | 'test'
    | 'documentation'
    | 'configuration'
    | 'generated'
    | 'lockfile'
    | 'migration'
    | 'asset'
    | 'other';

export type SignatureState =
    | 'verified'
    | 'unverified'
    | 'expired_key'
    | 'invalid'
    | 'unsigned';

export type SignatureType = 'gpg' | 'ssh' | 'smime' | 'unknown';

/** Explicit AI-agent provenance (spec §11) — never inferred from code style. */
export type AgentType =
    | 'COPILOT'
    | 'CLAUDE'
    | 'CODEX'
    | 'CURSOR'
    | 'CUSTOM_AGENT'
    | 'UNKNOWN_AGENT';

export type AgentDetectionBasis =
    | 'explicit_provenance'
    | 'co_author'
    | 'app_identity'
    | 'inference';

export type BotType =
    | 'dependabot'
    | 'renovate'
    | 'github-actions'
    | 'github-app'
    | 'ci'
    | 'other';

/** Final evidence-based status (spec §20) — never an arbitrary percentage. */
export type AuthenticityStatus =
    | 'VERIFIED'
    | 'REVIEW_REQUIRED'
    | 'UNUSUAL_ACTIVITY'
    | 'INSUFFICIENT_EVIDENCE';

/** Anomaly severity (spec §15) — explicitly NOT proof of misconduct. */
export type AnomalySeverity =
    | 'NORMAL'
    | 'UNUSUAL'
    | 'REVIEW_REQUIRED'
    | 'INSUFFICIENT_EVIDENCE';

export type EvidenceType =
    | 'identity_verified'
    | 'push_provenance'
    | 'signed_commit'
    | 'meaningful_source_change'
    | 'test_activity'
    | 'pr_activity'
    | 'review_activity'
    | 'ci_activity'
    | 'task_linkage'
    | 'agent_activity'
    | 'automation_activity'
    | 'anomaly';

/** A single evidence fact written to work_evidence. */
export interface EvidenceFact {
    employeeId: string | null;
    evidenceType: EvidenceType;
    sourceTable: string;
    sourceId: string;
    observedAt?: string;
    weight?: number;
    details?: Record<string, unknown>;
}

/** Human-readable anomaly with full auditability (spec §24). */
export interface AnomalyRecord {
    employeeId: string | null;
    severity: AnomalySeverity;
    ruleCode: string;
    ruleVersion: string;
    reason: string;
    explanation: string;
    evidence: string[];
    affectedEventIds: Record<string, string[]>;
    windowStart?: string | null;
    windowEnd?: string | null;
}

/** Timeline entry (spec §14) — evidence-based, no continuous-work claims. */
export interface TimelineEntry {
    time: string;
    kind:
        | 'branch_created'
        | 'commit'
        | 'push'
        | 'pr_opened'
        | 'pr_merged'
        | 'review'
        | 'ci_started'
        | 'ci_completed'
        | 'test_signal'
        | 'anomaly'
        | 'task_activity';
    description: string;
    sourceTable: string;
    sourceId: string;
    meta?: Record<string, unknown>;
}

export interface DailyEvidenceChecklist {
    identity_verified: boolean;
    push_provenance: boolean;
    signed_commit: boolean;
    meaningful_source_change: boolean;
    test_activity: boolean;
    pr_activity: boolean;
    review_activity: boolean;
    ci_activity: boolean;
    task_linkage: boolean;
}

export interface DailyAutomationSummary {
    agents: Array<{
        agentType: AgentType;
        agentName: string | null;
        basis: AgentDetectionBasis;
        count: number;
    }>;
    bots: Array<{ botType: BotType; botName: string; count: number }>;
}

/** Thresholds stored in work_intelligence_settings.anomaly_thresholds. */
export interface AnomalyThresholds {
    commit_burst_window_minutes: number;
    commit_burst_threshold: number;
    tiny_commit_threshold: number;
    generated_file_ratio: number;
}
