'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function submitAssessment(applicationId: string, answers: any[]) {
    const supabase = await createClient()

    // Fetch the original questions to give context to AI
    const { data: app, error: fetchError } = await supabase
        .from('applications')
        .select('generated_questions, resume_text, ai_reasoning')
        .eq('id', applicationId)
        .single()

    if (fetchError || !app) return { message: 'Application not found' }

    try {
        // AI Grading
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are a Technical Interviewer. Grade the candidate's answers to the following questions.
                    Context: The questions were generated based on their resume.
                    Output JSON:
                    - score: number (0-100)
                    - reasoning: string (brief summary of performance)
                    
                    Return ONLY valid JSON.`
                },
                {
                    role: "user",
                    content: `
                    Questions: ${JSON.stringify(app.generated_questions)}
                    Candidate Answers: ${JSON.stringify(answers)}
                    `
                }
            ],
            response_format: { type: "json_object" }
        })

        const aiResponse = JSON.parse(completion.choices[0].message.content || '{}')
        const { score, reasoning } = aiResponse

        // Determine final status
        const newStatus = score >= 70 ? 'INTERVIEW_READY' : 'REJECTED'

        // Update DB
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                test_score: score,
                candidate_answers: answers,
                ai_reasoning: `Resume Analysis: ${app.ai_reasoning || 'N/A'}\n\nTest Analysis: ${reasoning}`,
                status: newStatus
            })
            .eq('id', applicationId)

        if (updateError) throw new Error(updateError.message)

        return { message: 'Success', score, status: newStatus }

    } catch (error: any) {
        console.error('Grading Error:', error)
        return { message: error.message }
    }
}

export async function getApplication(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single()

    if (error) return null
    return data
}
