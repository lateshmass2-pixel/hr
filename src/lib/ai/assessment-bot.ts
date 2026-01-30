import { retrieveContext, formatContext } from '@/lib/rag/retriever';
import { generateText } from 'ai';
import { z } from 'zod';
import { groq, AI_MODEL } from '@/lib/ai';

const AssessmentQuestionSchema = z.object({
    question_text: z.string().describe("The formulated question text."),
    question_type: z.enum(['mcq', 'true_false', 'short_answer']),
    options: z.array(z.string()).optional().describe("Options for MCQ/TrueFalse. 4 options for MCQ."),
    correct_answer: z.string(),
    explanation: z.string().describe("Brief explanation referencing the Knowledge Base."),
    difficulty: z.enum(['Junior', 'Mid', 'Senior']),
});

const AssessmentOutputSchema = z.object({
    questions: z.array(AssessmentQuestionSchema).length(5).describe("Generate exactly 5 questions.")
});

export type Difficulty = 'Junior' | 'Mid' | 'Senior';

export async function generateRagAssessment(
    jobDescription: string,
    resumeText: string,
    difficulty: Difficulty,
    kbSourceIds?: string[]
) {
    console.log(`🤖 Generating ${difficulty} assessment...`);

    // 1. RAG: Retrieve grounded context from Knowledge Base
    // We construct a query based on JD keywords to find relevant KB sections
    const query = `Key technical concepts and requirements for: ${jobDescription.substring(0, 200)}...`;

    // Retrieve context grounded in the *Knowledge Base*
    const retrievedChunks = await retrieveContext(query, kbSourceIds);
    const knowledgeBaseContext = formatContext(retrievedChunks);

    if (!knowledgeBaseContext || retrievedChunks.length === 0) {
        console.warn("⚠️ No relevant Knowledge Base documents found. Generation usually hallucinates without grounding.");
    }

    // 2. Construct System Prompt with strict constraints
    const systemPrompt = `You are an expert Technical Interviewer. 
    Your goal is to generate a ${difficulty}-level assessment test.
    
    INPUTS:
    1. JOB DESCRIPTION (JD): Defines the role requirements.
    2. CANDIDATE RESUME: Defines the candidate's background (to tailor questions, not to quiz them on their own life).
    3. KNOWLEDGE BASE (KB): The ABSOLUTE SOURCE OF TRUTH.
    
    RULES:
    - **HALLUCINATION CONTROL**: You must ONLY generate questions based on the provided KNOWLEDGE BASE context. If a topic is not in the KB, DO NOT ask about it, even if it's in the JD.
    - **DIFFICULTY**:
       - Junior: Focus on definitions, basic usage, and "what is" questions.
       - Mid: Focus on best practices, "how to", and common pitfalls.
       - Senior: Focus on architecture, optimization, trade-offs, and "why".
    - **FORMAT**: Return strict JSON.
    `;

    // 3. Generate Questions
    const { text } = await generateText({
        model: groq(AI_MODEL),
        system: systemPrompt,
        prompt: `
        JOB DESCRIPTION: 
        ${jobDescription}

        CANDIDATE RESUME SUMMARY:
        ${resumeText.substring(0, 1000)}...

        KNOWLEDGE BASE CONTEXT (SOURCE OF TRUTH):
        ${knowledgeBaseContext}
        
        Generate 5 ${difficulty} questions now.
        RETURN ONLY VALID JSON. No markdown.
        
        IMPORTANT: "question_type" MUST be one of: "mcq", "true_false", "short_answer".
        Do NOT use "open-ended" or "essay". Use "short_answer" instead.

        Schema: { "questions": [ { "question_text": "...", "question_type": "mcq" | "true_false" | "short_answer", "options": ["..."], "correct_answer": "...", "explanation": "...", "difficulty": "..." } ] }
        `
    });

    // Clean and parse JSON
    const cleanText = text.replace(/```json\n?|```/g, '').trim();
    let result;
    try {
        result = JSON.parse(cleanText);
    } catch (e) {
        console.error("Failed to parse JSON generation:", cleanText);
        throw new Error("AI Generation failed to produce valid JSON");
    }

    // Normalize question types to ensure DB compatibility
    const normalizedQuestions = result.questions.map((q: any) => ({
        ...q,
        question_type: ['mcq', 'true_false', 'short_answer'].includes(q.question_type)
            ? q.question_type
            : 'short_answer' // Fallback for 'open-ended' or others
    }));

    // 4. Return results + Metadata (which chunks were used)
    return {
        questions: normalizedQuestions,
        source_chunks: retrievedChunks.map(c => c.id) // Track citations
    };
}
