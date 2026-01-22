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

export async function submitAssessment(applicationId: string, answers: number[]) {
    const supabase = await createClient()

    console.log('📝 Processing MCQ assessment for:', applicationId)

    // Fetch the application with questions and candidate info
    const { data: app, error: fetchError } = await supabase
        .from('applications')
        .select('id, generated_questions, resume_text, ai_reasoning, candidate_name, candidate_email, status')
        .eq('id', applicationId)
        .single()

    if (fetchError || !app) {
        console.error('Application fetch error:', fetchError)
        return { message: 'Application not found' }
    }

    // Prevent re-submission
    if (app.status !== 'TEST_PENDING') {
        console.log('⚠️ Assessment already submitted. Current status:', app.status)
        return { message: 'Assessment already submitted', score: null, status: app.status, passed: false, feedback: '' }
    }

    try {
        let questions: Question[] = []
        const generated = app.generated_questions

        // Normalize questions to Question[] format
        if (Array.isArray(generated)) {
            questions = generated.map((q: any) => ({
                id: q.id || 'legacy',
                question: q.question,
                options: q.options,
                // Legacy 'correct' is 0-3 index usually
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

        if (questions.length === 0) {
            throw new Error('No questions found in application record')
        }

        // Use deterministic grading
        const { score, correctCount, details } = calculateScore(answers, questions)

        // Map details for AI feedback context
        const detailedResults = details.map(d => {
            const q = questions.find(q => q.id === d.questionId)
            // Find the original question object to get options text
            // Note: calculateScore details has indices
            return {
                question: q?.question || 'Unknown',
                correct: d.isCorrect,
                userAnswer: q?.options[d.userAnswerIndex ?? -1] || 'No answer',
                correctAnswer: q?.options[d.correctAnswerIndex] || 'Unknown'
            }
        })

        console.log(`📊 MCQ Results: ${correctCount}/${questions.length} correct = ${score}%`)

        // Generate AI feedback based on results
        const completion = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [
                {
                    role: "system",
                    content: `You are a Senior Tech Lead providing brief feedback on a candidate's technical assessment results.
                    
Output a JSON object with:
- feedback: string (2-3 sentences summarizing their performance, mentioning areas of strength or weakness based on which questions they got wrong)

Be encouraging but honest. Return ONLY valid JSON.`
                },
                {
                    role: "user",
                    content: `
Score: ${score}%
Correct: ${correctCount} out of ${questions.length}

Results breakdown:
${detailedResults.map((r, i) => `Q${i + 1}: ${r.correct ? '✓' : '✗'} - ${r.question.substring(0, 50)}...`).join('\n')}
                    `
                }
            ],
            response_format: { type: "json_object" }
        })

        const aiResponse = JSON.parse(completion.choices[0].message.content || '{}')
        const feedback = aiResponse.feedback || 'Assessment completed.'

        console.log(`💬 AI Feedback: ${feedback}`)

        // Determine final status based on score (70% pass threshold)
        const passed = score >= 70
        const newStatus = passed ? 'INTERVIEW' : 'REJECTED'

        console.log(`🔄 Updating status: TEST_PENDING → ${newStatus}`)

        // Update Database
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                test_score: score,
                candidate_answers: answers,
                ai_reasoning: `**Resume Analysis:** ${app.ai_reasoning || 'N/A'}\n\n**MCQ Test Score: ${score}%** (${correctCount}/${questions.length} correct)\n\n**Feedback:** ${feedback}`,
                status: newStatus
            })
            .eq('id', applicationId)

        if (updateError) {
            console.error('❌ Database update error:', updateError)
            throw new Error('Failed to update application: ' + updateError.message)
        }

        console.log('✅ Database updated successfully')

        // AUTOMATED EMAIL TRIGGER
        if (passed) {
            console.log(`🎉 Candidate ${app.candidate_name} PASSED with ${score}%! Sending interview invitation...`)
            const emailResult = await sendInterviewReadyEmail(
                app.candidate_email,
                app.candidate_name
            )
            if (emailResult.success) {
                console.log('✅ Interview invitation email sent')
            } else {
                console.error('❌ Failed to send interview email:', emailResult.error)
            }
        } else {
            console.log(`❌ Candidate ${app.candidate_name} scored ${score}%. Sending rejection email...`)
            const emailResult = await sendRejectionEmail(
                app.candidate_email,
                app.candidate_name
            )
            if (emailResult.success) {
                console.log('✅ Rejection email sent')
            } else {
                console.error('❌ Failed to send rejection email:', emailResult.error)
            }
        }

        // UI Refresh - Only revalidate the hiring dashboard, NOT the assessment page
        // The assessment page shows results via client state, revalidating causes flash
        revalidatePath('/dashboard/hiring')

        console.log('🏁 MCQ Assessment complete!')

        return {
            message: 'Success',
            score,
            status: newStatus,
            feedback,
            passed
        }

    } catch (error: any) {
        console.error('❌ Grading Error:', error)
        return { message: error.message, score: 0, passed: false, feedback: '' }
    }
}

export async function getApplication(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching application:', error)
        return null
    }
    return data
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
