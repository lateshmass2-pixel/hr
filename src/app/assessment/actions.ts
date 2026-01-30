'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { openai, AI_MODEL } from "@/lib/ai"
import { sendRejectionEmail, sendInterviewReadyEmail } from "@/lib/email"
import { calculateScore } from "@/lib/grading"
import { Question } from "@/lib/assessment-schema"

type MCQ = {
    question: string
    options: string[]
    correct: number
}

export async function getAssessmentSession(sessionId: string) {
    const supabase = await createClient()

    // Fetch session with questions
    const { data: session, error } = await supabase
        .from('assessment_sessions')
        .select(`
            *,
            assessment_questions (*)
        `)
        .eq('id', sessionId)
        .single()

    if (error || !session) {
        return null
    }

    // Fetch linked application to check status
    const { data: app } = await supabase
        .from('applications')
        .select('*')
        .eq('id', session.candidate_id)
        .single()

    return { session, app }
}

export async function getApplication(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        return null
    }
    return data
}

export async function submitAssessment(id: string, answers: number[]) {
    const supabase = await createClient()

    console.log('📝 Processing assessment submission for:', id)

    // Check if this is a RAG Assessment Session
    const { data: session } = await supabase
        .from('assessment_sessions')
        .select('*, assessment_questions(*)')
        .eq('id', id)
        .single()

    let applicationId = id
    let questions: Question[] = []
    let appStatus = ''
    let candidateName = ''
    let candidateEmail = ''
    let aiReasoning = ''

    if (session) {
        // --- NEW RAG FLOW ---
        applicationId = session.candidate_id

        // Fetch Application
        const { data: app } = await supabase
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single()

        if (!app) return { message: 'Application not found' }

        appStatus = app.status
        candidateName = app.candidate_name
        candidateEmail = app.candidate_email
        aiReasoning = app.ai_reasoning || ''

        // Convert DB Questions to grading format
        questions = session.assessment_questions.map((q: any) => {
            // Parse options if stored as JSON string
            let options = []
            try {
                options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
            } catch (e) {
                options = []
            }

            return {
                id: q.id,
                question: q.question_text,
                options: options,
                // RAG Correct Answer is text, we need index for grading compatibility
                // Logic: Find index of correct_answer in options
                correctOptionIndex: options.findIndex((o: string) => o === q.correct_answer),
                explanation: ''
            }
        })

    } else {
        // --- LEGACY FLOW ---
        const { data: app, error } = await supabase
            .from('applications')
            .select('id, generated_questions, resume_text, ai_reasoning, candidate_name, candidate_email, status')
            .eq('id', id)
            .single()

        if (error || !app) {
            console.error('Application fetch error:', error)
            return { message: 'Application/Session not found' }
        }

        appStatus = app.status
        candidateName = app.candidate_name
        candidateEmail = app.candidate_email
        aiReasoning = app.ai_reasoning
        const generated = app.generated_questions

        if (Array.isArray(generated)) {
            questions = generated.map((q: any) => ({
                id: q.id || 'legacy',
                question: q.question,
                options: q.options,
                correctOptionIndex: typeof q.correct === 'number' ? q.correct : (q.correctOptionIndex ?? 0),
                explanation: q.explanation || ''
            }))
        } else if (generated && typeof generated === 'object') {
            const gen = generated as { aptitude?: any[], technical?: any[] }
            const raw = [...(gen.aptitude || []), ...(gen.technical || [])]
            questions = raw.map((q: any) => ({
                id: q.id || 'unknown',
                question: q.question,
                options: q.options,
                correctOptionIndex: typeof q.correct === 'number' ? q.correct : (q.correctOptionIndex ?? 0),
                explanation: q.explanation || ''
            }))
        }
    }

    // Common Logic
    if (appStatus !== 'TEST_PENDING') {
        console.log('⚠️ Assessment already submitted. Status:', appStatus)
        return { message: 'Assessment already submitted', score: null, status: appStatus, passed: false, feedback: '' }
    }

    if (questions.length === 0) {
        throw new Error('No questions found for this assessment')
    }

    // Strict Grading
    const { score, correctCount, details } = calculateScore(answers, questions)

    // AI Feedback Generation
    const detailedResults = details.map(d => {
        const q = questions.find(q => q.id === d.questionId)
        return {
            question: q?.question || 'Unknown',
            correct: d.isCorrect
        }
    })

    console.log(`📊 Results: ${correctCount}/${questions.length} correct = ${score}%`)

    // Generate Feedback
    const completion = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: [
            {
                role: "system",
                content: `You are a Senior Tech Lead. Provide brief, encouraging but honest feedback (2 sentences) on a candidate's test results. Return JSON: { "feedback": "..." }`
            },
            {
                role: "user",
                content: `Score: ${score}%. Breakdown: ${JSON.stringify(detailedResults)}`
            }
        ],
        response_format: { type: "json_object" }
    })

    const aiResponse = JSON.parse(completion.choices[0].message.content || '{}')
    const feedback = aiResponse.feedback || 'Assessment completed.'

    const passed = score >= 70
    const newStatus = passed ? 'INTERVIEW' : 'REJECTED'

    console.log(`🔄 Updating Application ${applicationId}: TEST_PENDING → ${newStatus}`)

    const { error: updateError } = await supabase
        .from('applications')
        .update({
            test_score: score,
            candidate_answers: answers,
            ai_reasoning: `**Previous Analysis:** ${aiReasoning || 'N/A'}\n\n**Test Score: ${score}%**\n**Feedback:** ${feedback}`,
            status: newStatus
        })
        .eq('id', applicationId)

    if (updateError) {
        throw new Error('Failed to update application: ' + updateError.message)
    }

    // Trigger Emails
    if (passed) {
        await sendInterviewReadyEmail(candidateEmail, candidateName)
    } else {
        await sendRejectionEmail(candidateEmail, candidateName)
    }

    revalidatePath('/dashboard/hiring')
    return { message: 'Success', score, status: newStatus, feedback, passed }
}

export async function rejectApplication(applicationId: string, reason: string) {
    const supabase = await createClient()

    console.log('🚫 Rejecting application due to proctoring violation:', applicationId)

    // Fetch the application for email
    const { data: app } = await supabase
        .from('applications')
        .select('candidate_name, candidate_email, ai_reasoning')
        .eq('id', applicationId)
        .single()

    // Update status to REJECTED
    const { error: updateError } = await supabase
        .from('applications')
        .update({
            status: 'REJECTED',
            ai_reasoning: `${app?.ai_reasoning || ''}\n\n**Proctoring Result:** ${reason}`
        })
        .eq('id', applicationId)

    if (updateError) {
        console.error('❌ Failed to reject application:', updateError)
        return { success: false, message: updateError.message }
    }

    // Send rejection email
    if (app?.candidate_email && app?.candidate_name) {
        await sendRejectionEmail(app.candidate_email, app.candidate_name)
    }

    revalidatePath('/dashboard/hiring')

    console.log('✅ Application rejected successfully')
    return { success: true }
}
