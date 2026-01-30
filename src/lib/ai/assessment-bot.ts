import { retrieveContext, formatContext } from '@/lib/rag/retriever';
import { generateText } from 'ai';
import { z } from 'zod';
import { groq, AI_MODEL } from '@/lib/ai';

const AssessmentQuestionSchema = z.object({
    question_text: z.string().describe("The formulated question text."),
    question_type: z.literal('mcq').describe("Only MCQ type questions."),
    category: z.enum(['aptitude', 'technical']).describe("Category of the question."),
    options: z.array(z.string()).length(4).describe("Exactly 4 options for MCQ."),
    correct_answer: z.string(),
    explanation: z.string().describe("Brief explanation referencing the Knowledge Base."),
    difficulty: z.enum(['Junior', 'Mid', 'Senior']),
});

const AssessmentOutputSchema = z.object({
    questions: z.array(AssessmentQuestionSchema).length(10).describe("Generate exactly 10 MCQ questions: 5 aptitude + 5 technical.")
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
        
        Generate 10 ${difficulty} MCQ questions now:
        - 5 APTITUDE questions: General logic, reasoning, problem-solving (category: "aptitude")
        - 5 TECHNICAL questions: Based on job requirements and candidate skills (category: "technical")
        - ALL questions must be MCQ with exactly 4 options each.
        - DO NOT include short_answer, true_false, or essay questions.
        
        RETURN ONLY VALID JSON. No markdown.

        Schema: { "questions": [ { "question_text": "...", "question_type": "mcq", "category": "aptitude" | "technical", "options": ["A", "B", "C", "D"], "correct_answer": "exact text of correct option", "explanation": "...", "difficulty": "..." } ] }
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

    // Normalize question types to ensure DB compatibility (all should be mcq now)
    const normalizedQuestions = result.questions.map((q: any) => ({
        ...q,
        question_type: 'mcq', // Force MCQ type
        category: q.category || 'technical' // Default to technical if missing
    }));

    // 4. Return results + Metadata (which chunks were used)
    return {
        questions: normalizedQuestions,
        source_chunks: retrievedChunks.map(c => c.id) // Track citations
    };
}
