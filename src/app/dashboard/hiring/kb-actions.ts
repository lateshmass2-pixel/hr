'use server';

import { processDocument } from '@/lib/rag/parser';
import { ingestDocument } from '@/lib/rag/embedder';
import { createClient } from '@/lib/supabase/server';

export async function uploadKnowledgeBase(formData: FormData) {
    const file = formData.get('file') as File;
    const documentName = (formData.get('documentName') as string) || file.name;

    if (!file) {
        return { success: false, message: 'No file uploaded' };
    }

    try {
        console.log(`📂 Processing KB Document: ${documentName}`);

        // 1. Read Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 2. Parse & Chunk
        // Using a random UUID for source_id for now (or could be DB ID if we stored docs in a table)
        const sourceId = crypto.randomUUID();
        const chunks = await processDocument(buffer, file.name, sourceId);

        console.log(`📄 Parsed ${chunks.length} chunks from ${file.name}`);

        // 3. Ingest (Embed & Upsert)
        // Add extra metadata "document_name" to each chunk
        const embeddableChunks = chunks.map(c => ({
            ...c,
            metadata: { ...c.metadata, document_name: documentName }
        }));

        // Upload file to Storage (Optional, for reference)
        const supabase = await createClient();
        const filePath = `kb/${sourceId}-${file.name}`;
        await supabase.storage.from('kb-documents').upload(filePath, file);

        // Ingest Vectors
        const result = await ingestDocument(embeddableChunks);

        if (!result.success) {
            return { success: false, message: 'Embedding failed', errors: result.errors };
        }

        return { success: true, message: `Successfully indexed ${chunks.length} chunks`, chunkCount: chunks.length };

    } catch (error: any) {
        console.error('KB Upload Error:', error);
        return { success: false, message: error.message };
    }
}

export async function getKnowledgeBaseFiles() {
    const supabase = await createClient();
    // List files in the 'kb' folder of 'kb-documents' bucket
    const { data, error } = await supabase
        .storage
        .from('kb-documents')
        .list('kb', {
            limit: 100,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' },
        });

    if (error) {
        console.error('Error listing KB files:', error);
        return [];
    }

    return data || [];
}

export async function deleteKnowledgeBaseFile(fileName: string) {
    const supabase = await createClient();
    const filePath = `kb/${fileName}`;

    console.log(`🗑️ Attempting to delete KB file: ${filePath}`);

    const { data, error: storageError } = await supabase
        .storage
        .from('kb-documents')
        .remove([filePath]);

    if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        return { success: false, message: storageError.message };
    }

    if (!data || data.length === 0) {
        console.warn('⚠️ No file deleted. Possible reasons: File not found OR Permission Denied (Row Level Security).');
        return { success: false, message: 'File could not be deleted. Please check permissions.' };
    }

    console.log('✅ File deleted successfully:', data);
    return { success: true, message: 'File deleted' };
}
