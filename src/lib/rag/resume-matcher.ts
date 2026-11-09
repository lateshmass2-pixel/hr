/**
 * Resume <-> Job-Description matching via embeddings + cosine similarity.
 *
 * This replaces the old keyword / LLM-based scoring:
 *   - The job description (JD) supplied by HR is embedded.
 *   - The resume text is embedded (BGE-M3 via Ollama, see ./embedder).
 *   - The "real" match score is the cosine similarity between the two.
 *
 * Every resume is also persisted permanently in `resume_embeddings`
 * (the talent pool) so a candidate rejected for one role can be
 * re-matched against any future JD.
 */

import { generateEmbedding } from './embedder';
import { createClient } from '@/lib/supabase/server';

/**
 * Auto-reject cutoff expressed as a cosine similarity in [0, 1].
 * BGE-M3 JD/resume similarities are compressed (good fits ~0.5-0.7),
 * so keep this modest. Tunable without a redeploy via env.
 */
export const MATCH_THRESHOLD = clamp01(Number(process.env.RESUME_MATCH_THRESHOLD ?? 0.4));

/** Cosine similarity between two equal-length dense vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length === 0 || a.length !== b.length) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Maps a cosine similarity (0..1) to an integer 0-100 "match score". */
export function similarityToScore(similarity: number): number {
    return Math.round(clamp01(similarity) * 100);
}

export interface JobLike {
    title?: string | null;
    description?: string | null;
    required_skills?: string[] | null;
}

/**
 * Builds the text that represents the JD for embedding. Combines the
 * title, the free-text description written by HR, and any required /
 * extra skills so the vector captures the full role definition.
 */
export function buildJobDescriptionText(job: JobLike, extraSkills: string[] = []): string {
    const skills = [...(job.required_skills ?? []), ...extraSkills]
        .map((s) => s.trim())
        .filter(Boolean);

    return [
        job.title ? `Job Title: ${job.title}` : '',
        job.description ? `Job Description: ${job.description}` : '',
        skills.length ? `Required Skills: ${skills.join(', ')}` : '',
    ]
        .filter(Boolean)
        .join('\n\n')
        .trim();
}

export interface ScoreResumeResult {
    similarity: number;      // raw cosine similarity 0..1
    score: number;           // similarity * 100, rounded
    resumeEmbedding: number[];
    jdEmbedding: number[];
}

/**
 * Embeds the JD and resume and returns the cosine-similarity score.
 * The resume embedding is returned so callers can persist it without
 * paying for a second embedding call.
 */
export async function scoreResumeAgainstJD(
    resumeText: string,
    jobDescriptionText: string
): Promise<ScoreResumeResult> {
    const [resumeEmbedding, jdEmbedding] = await Promise.all([
        generateEmbedding(resumeText),
        generateEmbedding(jobDescriptionText),
    ]);

    const similarity = cosineSimilarity(resumeEmbedding, jdEmbedding);

    return {
        similarity,
        score: similarityToScore(similarity),
        resumeEmbedding,
        jdEmbedding,
    };
}

/**
 * Short-lived, in-process cache of JD-text -> embedding.
 *
 * When HR bulk-uploads resumes against a single pasted JD, each resume is
 * processed by its own server-action call. Without this, we'd re-embed the
 * identical JD once per resume. Keyed by the normalized JD text so a whole
 * batch (and repeat uploads of the same JD) only pays for one JD embedding.
 *
 * This is a best-effort optimization: a cache miss simply re-embeds, so
 * correctness never depends on the cache surviving (e.g. across a restart).
 */
const JD_EMBED_CACHE = new Map<string, { embedding: number[]; at: number }>();
const JD_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const JD_CACHE_MAX_ENTRIES = 50;

function jdCacheKey(text: string): string {
    return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Embeds raw JD text, reusing a recent identical embedding when available.
 * Prefer this over calling generateEmbedding directly for JD text.
 */
export async function embedJobDescriptionText(jdText: string): Promise<number[]> {
    const key = jdCacheKey(jdText);
    const now = Date.now();

    const hit = JD_EMBED_CACHE.get(key);
    if (hit && now - hit.at < JD_CACHE_TTL_MS) {
        return hit.embedding;
    }

    const embedding = await generateEmbedding(jdText);
    JD_EMBED_CACHE.set(key, { embedding, at: now });

    // Evict the oldest entry if the cache grows too large.
    if (JD_EMBED_CACHE.size > JD_CACHE_MAX_ENTRIES) {
        let oldestKey: string | null = null;
        let oldestAt = Infinity;
        for (const [k, v] of JD_EMBED_CACHE) {
            if (v.at < oldestAt) {
                oldestAt = v.at;
                oldestKey = k;
            }
        }
        if (oldestKey) JD_EMBED_CACHE.delete(oldestKey);
    }

    return embedding;
}

/**
 * Builds the JD text for a job and embeds it (via the cached primitive).
 * Used to precompute and cache a job's embedding (on job_postings.jd_embedding)
 * so we don't re-embed the same JD on every resume upload or talent-pool search.
 */
export async function embedJobDescription(job: JobLike, extraSkills: string[] = []): Promise<number[]> {
    return embedJobDescriptionText(buildJobDescriptionText(job, extraSkills));
}

/**
 * Normalizes a pgvector column value into a number[].
 * PostgREST returns vector columns as the text form "[0.1,0.2,...]" (valid
 * JSON), but some setups return a real array — handle both, and null-out
 * anything unparseable so callers can fall back to re-embedding.
 */
export function parseEmbedding(value: unknown): number[] | null {
    if (!value) return null;
    if (Array.isArray(value)) return value as number[];
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : null;
        } catch {
            return null;
        }
    }
    return null;
}

export interface StoreResumeArgs {
    candidateName?: string | null;
    candidateEmail?: string | null;
    resumeUrl?: string | null;
    resumeText: string;
    skills?: string[];
    /** Pass a precomputed embedding to avoid re-embedding the resume. */
    embedding?: number[];
}

/**
 * Persists a resume embedding into the permanent talent pool.
 * Upserts on candidate_email so re-uploading refreshes the record.
 */
export async function storeResumeEmbedding(args: StoreResumeArgs): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const embedding = args.embedding ?? (await generateEmbedding(args.resumeText));

    // candidate_email is the unique upsert key, so we always need a value.
    const email =
        args.candidateEmail && args.candidateEmail.trim()
            ? args.candidateEmail.trim().toLowerCase()
            : `no-email-${crypto.randomUUID()}@resume.local`;

    const { error } = await supabase
        .from('resume_embeddings')
        .upsert(
            {
                candidate_name: args.candidateName ?? null,
                candidate_email: email,
                resume_url: args.resumeUrl ?? null,
                resume_text: args.resumeText,
                skills: args.skills ?? [],
                embedding,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'candidate_email' }
        );

    if (error) {
        console.error('❌ Failed to store resume embedding:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

export interface ResumeMatch {
    id: string;
    candidate_name: string | null;
    candidate_email: string | null;
    resume_url: string | null;
    resume_text: string | null;
    skills: string[] | null;
    similarity: number;
    /** Absolute score: raw cosine similarity * 100 (honest, comparable over time). */
    score: number;
    /** Relative score: min-max normalized across the current batch, 0-100 (for ranking). */
    rankScore: number;
}

/**
 * Min-max normalizes similarities across a batch so the spread fills the
 * full 0-100 range (best fit -> 100, worst -> 0), which makes relative
 * ranking easy to read. Falls back to the absolute score when there is
 * only one candidate or no spread (all similarities equal), so we never
 * show a misleading 0/100 for a single result.
 */
export function normalizeToRankScores(similarities: number[]): number[] {
    if (similarities.length === 0) return [];

    const min = Math.min(...similarities);
    const max = Math.max(...similarities);
    const range = max - min;

    if (similarities.length === 1 || range < 1e-6) {
        return similarities.map((s) => similarityToScore(s));
    }

    return similarities.map((s) => Math.round(((s - min) / range) * 100));
}

/**
 * Ranks stored resumes against a JD embedding via the `match_resumes`
 * pgvector RPC (cosine similarity). Attaches both the absolute `score`
 * and a batch-normalized `rankScore`.
 */
export async function matchResumesByEmbedding(
    jdEmbedding: number[],
    matchThreshold = 0,
    matchCount = 20
): Promise<ResumeMatch[]> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('match_resumes', {
        query_embedding: jdEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
    });

    if (error) {
        console.error('❌ match_resumes RPC error:', error);
        return [];
    }

    const rows = (data as Omit<ResumeMatch, 'score' | 'rankScore'>[]) || [];
    const rankScores = normalizeToRankScores(rows.map((r) => r.similarity));

    return rows.map((r, i) => ({
        ...r,
        score: similarityToScore(r.similarity),
        rankScore: rankScores[i],
    }));
}

function clamp01(n: number): number {
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(1, n));
}
