'use server';

import { createClient } from '@/lib/supabase/server';
import { generateRagAssessment, Difficulty } from '@/lib/ai/assessment-bot';
import { revalidatePath } from 'next/cache';

/**
 * Starts a new assessment session.
 * 1. Fetches Candidate & Job Context.
 * 2. Generates Questions via RAG.
 * 3. Saves Session and Questions to DB.
 */
export async function startAssessmentSession(
    jobId: string | null,
    candidateId: string,
    difficulty: Difficulty,
    kbSourceIds?: string[]
) {
    const supabase = await createClient();

    // 1. Fetch Context (Simplified for MVP)
    // In a real app, you'd fetch the actual Job Description and Resume text here
    // For now, we'll assume they are passed or fetched from a mock/stored location
    const { data: candidate } = await supabase
        .from('applications')
        .select('resume_text, candidate_email, candidate_name')
        .eq('id', candidateId)
        .single();

    const { data: job } = jobId
        ? await supabase.from('job_postings').select('description').eq('id', jobId).single()
        : { data: { description: "General Software Engineering Role" } };

    const resumeText = candidate?.resume_text || "Candidate background...";
    const jobDescription = job?.description || "Software Engineer";

    // 2. Generate Questions
    const { questions, source_chunks } = await generateRagAssessment(
        jobDescription,
        resumeText,
        difficulty,
        kbSourceIds
    );

    // 3. Save Session
    const { data: session, error: sessionError } = await supabase
        .from('assessment_sessions')
        .insert({
            job_id: jobId,
            candidate_id: candidateId,
            difficulty,
            llm_model: 'llama-3.3-70b-versatile',
            retrieved_chunk_ids: source_chunks
        })
        .select()
        .single();

    if (sessionError) {
        console.error('Session Creation Error:', sessionError);
        return { success: false, error: sessionError.message };
    }

    // 4. Save Questions
    const questionsToInsert = questions.map(q => ({
        session_id: session.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options ? JSON.stringify(q.options) : null, // Store as JSONB
        correct_answer: q.correct_answer,
    }));

    const { error: matchError } = await supabase
        .from('assessment_questions')
        .insert(questionsToInsert);

    if (matchError) {
        console.error('Questions Insertion Error:', matchError);
        return { success: false, error: matchError.message };
    }

    // 5. Send Email Invite
    if (candidate?.candidate_email) {
        console.log(`📧 Sending assessment invite to ${candidate.candidate_email} for session ${session.id}`);
        // We pass session.id as the "candidateId" param because strict assessment pages might use session ID
        await import('@/lib/email').then(mod =>
            mod.sendAssessmentInvite(candidate.candidate_email, session.id, candidate.candidate_name)
        );
    }

    return { success: true, sessionId: session.id };
}

/**
 * Submits an answer for a specific question.
 */
export async function submitAnswer(
    sessionId: string,
    questionId: string,
    candidateId: string,
    answerText: string
) {
    const supabase = await createClient();

    // 1. Fetch correct answer to grade immediately (or defer to AI grader)
    const { data: question } = await supabase
        .from('assessment_questions')
        .select('correct_answer')
        .eq('id', questionId)
        .single();

    if (!question) return { success: false, error: 'Question not found' };

    const isCorrect = answerText.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();

    // 2. Save Answer
    const { error } = await supabase
        .from('candidate_answers')
        .insert({
            session_id: sessionId,
            question_id: questionId,
            candidate_id: candidateId,
            answer_text: answerText,
            is_correct: isCorrect,
            similarity_score: isCorrect ? 1.0 : 0.0 // Simple exact match for now
        });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/assessment/${sessionId}`);
    return { success: true, isCorrect };
}
