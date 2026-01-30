import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const EMBEDDING_MODEL = 'bge-m3:latest';

// Create a dedicated client for Embeddings (Ollama/Local)
// We default to localhost:11434 for Ollama if not specified in env
const embeddingClient = new OpenAI({
    apiKey: 'ollama', // Ollama doesn't care about API key usually
    baseURL: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
});

export async function generateEmbedding(text: string): Promise<number[]> {
    text = text.replace(/\n/g, ' ');

    try {
        const response = await embeddingClient.embeddings.create({
            model: EMBEDDING_MODEL,
            input: text,
            encoding_format: 'float',
        });

        return response.data[0].embedding;
    } catch (error: any) {
        console.error("❌ Embedding Error. Ensure Ollama is running with bge-m3:latest");
        console.error("Try running: `ollama pull bge-m3` and `ollama serve`");
        throw error;
    }
}

interface EmbeddableChunk {
    id: string; // Client-generated UUID
    content: string;
    metadata: Record<string, any>;
}

export async function ingestDocument(chunks: EmbeddableChunk[]) {
    const supabase = await createClient();

    // Process in batches of 10 to avoid API timeouts
    const BATCH_SIZE = 10;
    const errors: any[] = [];

    console.log(`🧠 Ingesting ${chunks.length} chunks...`);

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);

        try {
            // 1. Generate Embeddings Parallelly
            const batchWithEmbeddings = await Promise.all(
                batch.map(async (chunk) => {
                    const embedding = await generateEmbedding(chunk.content);
                    return {
                        id: chunk.id,
                        content: chunk.content,
                        metadata: chunk.metadata,
                        embedding: embedding
                    };
                })
            );

            // 2. Upsert to Supabase
            const { error } = await supabase
                .from('doc_embeddings')
                .upsert(batchWithEmbeddings);

            if (error) {
                console.error('❌ Supabase Upsert Error:', error);
                errors.push(error);
            } else {
                console.log(`✅ Indexed chunks ${i + 1} to ${i + batchWithEmbeddings.length}`);
            }

        } catch (err) {
            console.error('❌ Embedding Generation Error:', err);
            errors.push(err);
        }
    }

    return { success: errors.length === 0, errors };
}
