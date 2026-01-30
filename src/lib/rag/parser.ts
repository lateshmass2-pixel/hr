import fs from 'fs';
import { parsePDF } from '@/lib/pdf-parser'; // Assuming this exists from previous modules

interface Chunk {
    id: string;
    content: string;
    metadata: {
        chunk_index: number;
        token_count: number;
        source_id?: string;
        filename?: string;
    };
}

const CHUNK_SIZE = 512; // Approx tokens (using char count approximation: 1 token ~= 4 chars)
const CHUNK_OVERLAP = 50;

/**
 * Splits text into chunks with overlap.
 * Uses a simple character-based approximation for speed: 1 token ~ 4 characters.
 */
export function chunkText(text: string, sourceId?: string, filename?: string): Chunk[] {
    const chunks: Chunk[] = [];
    const charLimit = CHUNK_SIZE * 4;
    const overlapChars = CHUNK_OVERLAP * 4;

    let startIndex = 0;
    let chunkIndex = 0;

    // Normalize text
    const cleanText = text.replace(/\s+/g, ' ').trim();

    while (startIndex < cleanText.length) {
        let endIndex = startIndex + charLimit;

        // Don't cut in the middle of a word if possible
        if (endIndex < cleanText.length) {
            const lastSpace = cleanText.lastIndexOf(' ', endIndex);
            if (lastSpace > startIndex) {
                endIndex = lastSpace;
            }
        }

        const chunkContent = cleanText.slice(startIndex, endIndex);

        chunks.push({
            id: crypto.randomUUID(),
            content: chunkContent,
            metadata: {
                chunk_index: chunkIndex,
                token_count: Math.ceil(chunkContent.length / 4),
                source_id: sourceId,
                filename: filename
            }
        });

        // Move window forward
        startIndex = endIndex - overlapChars;
        chunkIndex++;
    }

    return chunks;
}

export async function processDocument(fileBuffer: Buffer, filename: string, sourceId?: string): Promise<Chunk[]> {
    let text = '';

    if (filename.toLowerCase().endsWith('.pdf')) {
        text = await parsePDF(fileBuffer);
    } else {
        text = fileBuffer.toString('utf-8');
    }

    return chunkText(text, sourceId, filename);
}
