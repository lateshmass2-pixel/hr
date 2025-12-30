'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { parsePDF } from "@/lib/pdf-parser"
import { openai, AI_MODEL } from "@/lib/ai"
import { sendAssessmentInvite, sendRejectionEmail, sendOfferEmail } from "@/lib/email"

export async function deleteApplication(applicationId: string) {
    console.log('🗑️ Attempting to delete application:', applicationId)
    const supabase = await createClient()

    // First fetch the application to get resume URL
    const { data: app, error: fetchError } = await supabase
        .from('applications')
        .select('resume_url')
        .eq('id', applicationId)
        .single()

    if (fetchError) {
        console.error('Fetch error:', fetchError)
        return { success: false, message: 'Application not found: ' + fetchError.message }
    }

    // Delete resume from storage if it exists
    if (app?.resume_url) {
        const urlParts = app.resume_url.split('/resumes/')
        if (urlParts[1]) {
            const filePath = urlParts[1]
            console.log('📁 Deleting file from storage:', filePath)
            const { error: storageError } = await supabase.storage.from('resumes').remove([filePath])
            if (storageError) {
                console.error('Storage delete error:', storageError)
                // Continue anyway - file might not exist
            }
        }
    }

    // Delete the application record
    const { error: deleteError, count } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId)

    console.log('Delete result - error:', deleteError, 'count:', count)

    if (deleteError) {
        console.error('❌ Delete error:', deleteError)
        return { success: false, message: 'Delete failed: ' + deleteError.message }
    }

    console.log('✅ Application deleted successfully')
    revalidatePath('/dashboard/hiring')
    return { success: true, message: 'Application deleted' }
}

export async function getJobs() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('job_postings')
        .select('id, title, required_skills')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching jobs:', error)
        return []
    }
    return data || []
}

export async function createJob(title: string, description: string, requiredSkills: string[]) {
    console.log('📋 Creating new job posting:', title)
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('job_postings')
        .insert({
            title,
            description,
            required_skills: requiredSkills,
            is_active: true
        })
        .select()
        .single()

    if (error) {
        console.error('Job creation error:', error)
        return { success: false, message: error.message }
    }

    console.log('✅ Job created:', data.id)
    revalidatePath('/dashboard/hiring')
    return { success: true, job: data }
}

export async function processApplication(formData: FormData) {
    const supabase = await createClient()

    const file = formData.get('resume') as File
    const jobId = formData.get('jobId') as string | null
    const candidateName = formData.get('name') as string
    const candidateEmail = formData.get('email') as string

    if (!file) {
        return { message: 'Missing file' }
    }

    try {
        // 1. Fetch job required skills if jobId is provided
        let requiredSkills: string[] = []
        let jobTitle = 'General Position'

        if (jobId) {
            const { data: job } = await supabase
                .from('job_postings')
                .select('title, required_skills')
                .eq('id', jobId)
                .single()

            if (job) {
                requiredSkills = job.required_skills || []
                jobTitle = job.title
            }
        }

        // 2. Upload Resume to Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `resumes/${fileName}`

        const { error: uploadError } = await supabase
            .storage
            .from('resumes')
            .upload(filePath, file)

        if (uploadError) throw new Error('Upload failed: ' + uploadError.message)

        const resumeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resumes/${filePath}`

        // 3. Extract Text from PDF
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const rawText = await parsePDF(buffer)
        const resumeText = rawText.substring(0, 3000)

        // 4. Build skill-aware AI prompt
        const skillsContext = requiredSkills.length > 0
            ? `\n\n**CRITICAL REQUIREMENT:** The candidate MUST have experience with these specific skills: [${requiredSkills.join(', ')}].
- Check for the presence and depth of these specific skills in the resume.
- If they are MISSING any of these skills entirely, give a score below 50 and list missing skills.
- If they have ALL required skills, score based on experience level.`
            : ''

        const completion = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [
                {
                    role: "system",
                    content: `You are an expert HR Recruiter and Technical Assessor. Analyze the resume for the position: "${jobTitle}".${skillsContext}

Output a JSON object with:
- score: number (0-100) based on resume relevance and skill match
- summary: string (brief reasoning about the candidate)
- missing_skills: array of strings (skills from required list that are NOT found in resume, empty if all present)
- questions: array of 10-15 MCQ objects, each with:
  - question: string (the question text)
  - options: array of 4 strings (A, B, C, D choices)
  - correct: number (0-3 index of correct answer)
- candidate_name: string (extracted from resume, or "Unknown Candidate")
- candidate_email: string (extracted from resume, or "unknown@example.com")

Generate MCQs based on ${requiredSkills.length > 0 ? 'the REQUIRED SKILLS' : 'skills found in the resume'}. Mix difficulty:
- 40% Easy, 40% Medium, 20% Hard

Return ONLY valid JSON.`
                },
                {
                    role: "user",
                    content: `Resume Text: ${resumeText}`
                }
            ],
            response_format: { type: "json_object" }
        })

        const aiResponse = JSON.parse(completion.choices[0].message.content || '{}')
        const { score, summary, missing_skills, questions, candidate_name, candidate_email } = aiResponse

        // Use formData values if present (manual override), otherwise use AI extracted values
        const finalName = candidateName || candidate_name || 'Unknown Candidate'
        const finalEmail = candidateEmail || candidate_email || 'unknown@example.com'

        // 5. Determine status based on score
        const status = score >= 60 ? 'TEST_PENDING' : 'REJECTED'

        // Build AI reasoning with skill info
        const aiReasoning = missing_skills && missing_skills.length > 0
            ? `${summary}\n\n⚠️ **Missing Required Skills:** ${missing_skills.join(', ')}`
            : summary

        // 6. Insert into Database
        const { data: insertedApplication, error: dbError } = await supabase
            .from('applications')
            .insert({
                job_id: jobId || null,
                candidate_name: finalName,
                candidate_email: finalEmail,
                resume_url: resumeUrl,
                resume_text: resumeText,
                score: score,
                ai_reasoning: aiReasoning,
                generated_questions: questions,
                status: status
            })
            .select()
            .single()

        if (dbError) throw new Error('DB Insert failed: ' + dbError.message)

        // 6. AUTOMATED EMAIL TRIGGER
        if (status === 'TEST_PENDING' && insertedApplication) {
            // Send assessment invite immediately
            console.log(`📧 Sending assessment invite to ${finalEmail}...`)
            const emailResult = await sendAssessmentInvite(
                finalEmail,
                insertedApplication.id,
                finalName
            )
            if (emailResult.success) {
                console.log('✅ Assessment invite sent successfully')
            } else {
                console.error('❌ Failed to send assessment invite:', emailResult.error)
            }
        } else if (status === 'REJECTED') {
            // Optionally send rejection email
            console.log(`📧 Sending rejection email to ${finalEmail}...`)
            const emailResult = await sendRejectionEmail(finalEmail, finalName)
            if (emailResult.success) {
                console.log('✅ Rejection email sent')
            } else {
                console.error('❌ Failed to send rejection email:', emailResult.error)
            }
        }

        revalidatePath('/dashboard/hiring')
        return { message: 'Success', status, score }

    } catch (error: any) {
        console.error('Processing Error:', error)
        return { message: error.message }
    }
}

// =====================================================
// OFFER LETTER ACTIONS
// =====================================================

export async function draftOffer(applicationId: string, role: string, salary: string, startDate: string) {
    console.log('📝 Drafting offer for application:', applicationId)
    const supabase = await createClient()

    // Fetch the candidate
    const { data: app, error: fetchError } = await supabase
        .from('applications')
        .select('candidate_name, candidate_email')
        .eq('id', applicationId)
        .single()

    if (fetchError || !app) {
        console.error('Fetch error:', fetchError)
        return { success: false, message: 'Application not found' }
    }

    try {
        // Generate offer letter with AI
        const completion = await openai.chat.completions.create({
            model: AI_MODEL,
            messages: [
                {
                    role: "system",
                    content: `You are an HR professional writing a job offer letter. Write a professional, warm, and exciting offer letter.

Keep it concise (about 150-200 words). Include:
- Congratulations on being selected
- The role title
- Starting salary
- Start date
- Brief mention of the team being excited
- Next steps (reply to accept)

Do NOT include:
- Formal letterhead/addresses
- The word "Subject:"
- Your signature (that's added separately)

Write in a professional but friendly tone.`
                },
                {
                    role: "user",
                    content: `Write an offer letter for ${app.candidate_name} for the position of ${role} with a starting salary of ${salary}. The start date is ${startDate}.`
                }
            ]
        })

        const offerContent = completion.choices[0].message.content || ''

        // Save draft to database
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                offer_letter_content: offerContent,
                offer_role: role,
                offer_salary: salary,
                offer_start_date: startDate
            })
            .eq('id', applicationId)

        if (updateError) {
            console.error('Update error:', updateError)
            return { success: false, message: 'Failed to save draft: ' + updateError.message }
        }

        console.log('✅ Offer draft saved')
        return { success: true, content: offerContent }

    } catch (error: any) {
        console.error('Draft error:', error)
        return { success: false, message: error.message }
    }
}

export async function sendOffer(applicationId: string, finalContent: string) {
    console.log('📧 Sending offer for application:', applicationId)
    const supabase = await createClient()

    // Fetch the candidate
    const { data: app, error: fetchError } = await supabase
        .from('applications')
        .select('candidate_name, candidate_email, offer_role')
        .eq('id', applicationId)
        .single()

    if (fetchError || !app) {
        console.error('Fetch error:', fetchError)
        return { success: false, message: 'Application not found' }
    }

    try {
        // Send the offer email
        const emailResult = await sendOfferEmail(
            app.candidate_email,
            app.candidate_name,
            finalContent,
            app.offer_role || 'New Role'
        )

        if (!emailResult.success) {
            return { success: false, message: 'Failed to send email: ' + emailResult.error }
        }

        // Update status to HIRED
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: 'HIRED',
                offer_letter_content: finalContent
            })
            .eq('id', applicationId)

        if (updateError) {
            console.error('Update error:', updateError)
            return { success: false, message: 'Email sent but failed to update status: ' + updateError.message }
        }

        console.log('✅ Offer sent and status updated to HIRED')
        revalidatePath('/dashboard/hiring')
        return { success: true, message: 'Offer sent successfully!' }

    } catch (error: any) {
        console.error('Send offer error:', error)
        return { success: false, message: error.message }
    }
}
