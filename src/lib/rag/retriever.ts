import { generateEmbedding } from './embedder';
import { createClient } from '@/lib/supabase/server';

interface RetrievedContext {
    id: string;
    content: string;
    similarity: number;
    metadata: any;
}

const MIN_SIMILARITY = 0.5; // Threshold for relevance
const MAX_CHUNKS = 5; // Context window limit

export async function retrieveContext(query: string, filterSourceIds?: string[]): Promise<RetrievedContext[]> {
    const supabase = await createClient();

    // 1. Vectorize Query
    const queryEmbedding = await generateEmbedding(query);

    // 2. Call RPC
    const { data: chunks, error } = await supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: MIN_SIMILARITY,
        match_count: MAX_CHUNKS * 2 // Fetch more for post-filtering
    });

    if (error) {
        console.error('❌ RAG Retrieval Error:', error);
        return [];
    }

    let results: RetrievedContext[] = chunks || [];

    // 3. Optional: Filter by specific Source IDs (Knowledge Base docs uploaded for this Job)
    if (filterSourceIds && filterSourceIds.length > 0) {
        results = results.filter(c => filterSourceIds.includes(c.metadata?.source_id));
    }

    // 4. Deduplicate (if multiple chunks are too similar or overlapping - simplistic check)
    // For now, we just return the top K matching the filter
    return results.slice(0, MAX_CHUNKS);
}

/**
 * Formats retrieved chunks into a string for the LLM prompt.
 */
export function formatContext(chunks: RetrievedContext[]): string {
    if (!chunks.length) return "No relevant knowledge base information found.";

    return chunks.map((c, i) => `
[SOURCE ${i + 1}] (Relevance: ${(c.similarity * 100).toFixed(1)}%)
${c.content}
`).join('\n---\n');
}
