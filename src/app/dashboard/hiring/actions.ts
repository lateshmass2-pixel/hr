'use server'

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { parsePDF } from "@/lib/services/pdf-parser"
import { openai, AI_MODEL, groq } from "@/lib/ai"
import { sendAssessmentInvite, sendRejectionEmail, sendOfferEmail } from "@/lib/services/email"
import { generateText } from "ai"
import { extractSkills } from "@/lib/ai/skill-extractor"
import { extractResumeFields } from "@/lib/services/resume-extractor"
import { parseResumeWithAI } from "@/lib/ai/resume-parser"
import { generateEmbedding } from "@/lib/rag/embedder"
import {
    storeResumeEmbedding,
    buildJobDescriptionText,
    matchResumesByEmbedding,
    embedJobDescription,
    embedJobDescriptionText,
    parseEmbedding,
    cosineSimilarity,
    similarityToScore,
    MATCH_THRESHOLD,
    type ResumeMatch,
} from "@/lib/rag/resume-matcher"
import { requirePermissionFromSession } from "@/lib/auth/session"
import type { Permission } from "@/lib/rbac/types"

/**
 * Role-gate helper for hiring server actions. Returns a shape-agnostic result
 * so each action can map it to its own return type ({ message } vs
 * { success, message }). Wraps requirePermissionFromSession, which throws
 * 'Not authenticated' / 'Forbidden: requires <permission>'.
 */
async function guard(permission: Permission): Promise<{ ok: true } | { ok: false; message: string }> {
    try {
        await requirePermissionFromSession(permission)
        return { ok: true }
    } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : "Forbidden" }
    }
}

export async function deleteApplication(applicationId: string) {
    const g = await guard('candidates:delete')
    if (!g.ok) return { success: false, message: g.message }

    console.log('🗑️ Attempting to delete application:', applicationId)
    const supabase = await createAdminClient()

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
    const g = await guard('candidates:read')
    if (!g.ok) return []

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('job_postings')
        .select('id, title, description, required_skills')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching jobs:', error)
        return []
    }
    return data || []
}

export async function createJob(title: string, description: string, requiredSkills: string[]) {
    const g = await guard('candidates:create')
    if (!g.ok) return { success: false, message: g.message }

    console.log('📋 Creating new job posting:', title)
    const supabase = await createClient()

    // Precompute and cache the JD embedding so resume matching never has to
    // re-embed this job's description. Best-effort: if the embedding service
    // is down, the job is still created and the embedding is backfilled later.
    let jdEmbedding: number[] | null = null
    try {
        jdEmbedding = await embedJobDescription({ title, description, required_skills: requiredSkills })
    } catch (err) {
        console.error('⚠️ Could not precompute JD embedding (will backfill later):', err)
    }

    const { data, error } = await supabase
        .from('job_postings')
        .insert({
            title,
            description,
            required_skills: requiredSkills,
            is_active: true,
            jd_embedding: jdEmbedding,
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

/**
 * Generates the 10-question MCQ assessment for a candidate who passed the
 * similarity screen. The LLM is used here ONLY to author test questions —
 * it has NO influence on the match score, which comes purely from cosine
 * similarity. Best-effort: returns [] on failure so it never blocks intake.
 */
async function generateAssessmentQuestions(jobTitle: string, resumeText: string): Promise<unknown[]> {
    try {
        const { text: aiText } = await generateText({
            model: groq(AI_MODEL),
            system: `You are an expert Technical Assessor creating a screening test for the position: "${jobTitle}".

Generate EXACTLY 10 MULTIPLE CHOICE QUESTIONS:
- 5 APTITUDE questions: general logic, reasoning, and problem-solving.
- 5 TECHNICAL questions: specific to ${jobTitle} and the candidate's background.
- Every question is MCQ with exactly 4 options.
- Mix difficulty: 40% easy, 40% medium, 20% hard.

Respond with ONLY valid JSON (no markdown, no extra text):
{
  "questions": [{"id": "<string>", "type": "mcq", "category": "aptitude"|"technical", "text": "<string>", "difficulty": "easy"|"medium"|"hard", "options": ["<string>", "<string>", "<string>", "<string>"], "correctAnswer": "<exact text of correct option>", "timeLimit": <number>}]
}`,
            prompt: `Resume Text: ${resumeText}`
        })

        const clean = aiText.replace(/```json\n?|```/g, '').trim()
        const parsed = JSON.parse(clean) as { questions?: unknown[] }
        return Array.isArray(parsed?.questions) ? parsed.questions : []
    } catch (err) {
        console.error('⚠️ Assessment question generation failed (non-blocking):', err)
        return []
    }
}

export async function processApplication(formData: FormData) {
    console.log('🔄 Processing Application via embedding similarity (BGE-M3)')
    const supabase = await createClient()

    const file = formData.get('resume') as File
    const jobId = formData.get('jobId') as string | null
    const candidateName = formData.get('name') as string
    const candidateEmail = formData.get('email') as string
    const expectedSkillsInput = formData.get('expectedSkills') as string | null
    // JD text supplied by HR at upload time — the source of truth for matching.
    const jobDescriptionInput = ((formData.get('jobDescription') as string | null) || '').trim()

    if (!file) {
        return { message: 'Missing file' }
    }

    try {
        // 0. Authorize: only roles that can create candidates may submit resumes
        const g = await guard('candidates:create')
        if (!g.ok) return { message: g.message }

        // 1. Resolve the Job Description (JD) that HR wants to match against
        let jobTitle = 'General Position'
        let jobDescription = ''
        let requiredSkills: string[] = []
        let cachedJdEmbedding: number[] | null = null

        if (jobId) {
            const { data: job } = await supabase
                .from('job_postings')
                .select('title, description, required_skills, jd_embedding')
                .eq('id', jobId)
                .single()

            if (job) {
                jobTitle = job.title || jobTitle
                jobDescription = job.description || ''
                requiredSkills = job.required_skills || []
                cachedJdEmbedding = parseEmbedding(job.jd_embedding)
            }
        }

        const manualSkills = expectedSkillsInput
            ? expectedSkillsInput.split(',').map(s => s.trim()).filter(Boolean)
            : []

        // HR-provided JD text wins over the stored job description; fall back to
        // the stored description only when HR didn't enter one.
        const effectiveDescription = jobDescriptionInput.length > 0 ? jobDescriptionInput : jobDescription
        // Only bypass the cached job embedding when the JD text truly differs from
        // the stored role description (i.e. HR edited it or pasted an ad-hoc JD).
        const usingCustomJd = jobDescriptionInput.length > 0 && jobDescriptionInput !== (jobDescription || '').trim()

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

        // 3. Extract text from the PDF (pdf2json today; PyMuPDF can be swapped in later)
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const rawText = await parsePDF(buffer)
        const resumeText = rawText.substring(0, 3000)      // stored on the application row
        const embeddingText = rawText.substring(0, 8000)   // richer text for the vector

        // 4. Extract candidate display fields. Primary: fast structured LLM
        //    extraction (name/email/title/skills). Fallback: pure-regex + keyword
        //    dictionary if the LLM is unavailable. This is for DISPLAY only — the
        //    match score below still comes purely from embeddings (no AI).
        const aiParsed = await parseResumeWithAI(rawText)
        const regexFields = extractResumeFields(rawText)

        const finalName = candidateName || aiParsed?.name || regexFields.name || 'Unknown Candidate'
        const finalEmail = candidateEmail || aiParsed?.email || regexFields.email || ''
        const candidateTitle = aiParsed?.title || null

        const displaySkills = (aiParsed?.skills && aiParsed.skills.length > 0)
            ? aiParsed.skills
            : extractSkills(rawText, 15)

        // 5. Build the JD text and SCORE via cosine similarity (no keyword matching).
        // A JD only "exists" for matching when HR actually supplied a description
        // or skills — the default "General Position" title must NOT yield a score.
        const hasJD = effectiveDescription.trim().length > 0 || requiredSkills.length > 0 || manualSkills.length > 0
        const jdText = buildJobDescriptionText(
            { title: jobId ? jobTitle : '', description: effectiveDescription, required_skills: requiredSkills },
            manualSkills
        )

        // Always embed the resume once (needed both for scoring and the pool).
        const resumeEmbedding = await generateEmbedding(embeddingText)

        let score: number | null = null
        let similarity = 0

        if (hasJD) {
            // Reuse the job's cached JD embedding when it still represents the
            // JD being matched (i.e. no ad-hoc manual skills were added). This
            // avoids an Ollama call per resume.
            let jdEmbedding: number[]
            if (jobId && cachedJdEmbedding && manualSkills.length === 0 && !usingCustomJd) {
                jdEmbedding = cachedJdEmbedding
            } else {
                // Cached by JD text, so a batch uploaded against one pasted JD
                // embeds that JD only once.
                jdEmbedding = await embedJobDescriptionText(jdText)

                // Backfill the cache for jobs created before this column existed,
                // but only when the text is the pure stored JD (no manual skills
                // and no HR-provided override, so it truly represents the role).
                if (jobId && !cachedJdEmbedding && manualSkills.length === 0 && !usingCustomJd) {
                    await supabase
                        .from('job_postings')
                        .update({ jd_embedding: jdEmbedding })
                        .eq('id', jobId)
                }
            }

            similarity = cosineSimilarity(resumeEmbedding, jdEmbedding)
            score = similarityToScore(similarity)
        }

        // 6. PERSIST the resume embedding permanently (the "talent pool").
        //    This is what lets a candidate rejected for one role be
        //    re-matched against any future job description.
        await storeResumeEmbedding({
            candidateName: finalName,
            candidateEmail: finalEmail || null,
            resumeUrl,
            resumeText,
            skills: displaySkills,
            embedding: resumeEmbedding,
        })

        // 7. Gate on the similarity threshold (only when we actually have a JD)
        let status = 'TEST_PENDING'
        let sendInvite = true

        if (hasJD && score !== null && similarity < MATCH_THRESHOLD) {
            status = 'REJECTED'
            sendInvite = false
        }

        // 8. Build human-readable reasoning from the similarity result
        const matchPct = score ?? 0
        let aiReasoning = hasJD
            ? `Match score ${matchPct}% — cosine similarity between the resume embedding and the "${jobTitle}" job description.`
            : `No job description provided; resume stored in the talent pool for future role matching.`

        if (!sendInvite) {
            aiReasoning = `**AUTO-REJECTED (Low JD match):** ${matchPct}% is below the ${(MATCH_THRESHOLD * 100).toFixed(0)}% threshold.\n\n` + aiReasoning
        }
        if (displaySkills.length && displaySkills[0] !== 'General') {
            aiReasoning += `\n\n**Skills Found:** ${displaySkills.join(', ')}`
        }

        // 9. Generate the assessment ONLY for candidates who pass the screen.
        //    (LLM used for question authoring, not for scoring.)
        const questions = sendInvite ? await generateAssessmentQuestions(jobTitle, resumeText) : []

        // 10. Insert the application row. `skills`/`position` are newer columns
        //     (see applications_display_fields.sql). If that migration hasn't run
        //     yet, we retry without them so uploads never hard-fail.
        const baseRow = {
            job_id: jobId || null,
            candidate_name: finalName,
            candidate_email: finalEmail || 'unknown@example.com',
            resume_url: resumeUrl,
            resume_text: resumeText,
            score: score,
            ai_reasoning: aiReasoning,
            generated_questions: questions,
            status: status,
        }

        const insertResult = await supabase
            .from('applications')
            .insert({ ...baseRow, skills: displaySkills, position: candidateTitle })
            .select()
            .single()

        let insertedApplication = insertResult.data
        let dbError = insertResult.error

        if (dbError && /skills|position|column|schema cache/i.test(dbError.message)) {
            console.warn('⚠️ applications.skills/position not found — run applications_display_fields.sql. Storing base row for now.')
            const retry = await supabase.from('applications').insert(baseRow).select().single()
            insertedApplication = retry.data
            dbError = retry.error
        }

        if (dbError) throw new Error('DB Insert failed: ' + dbError.message)

        // 11. Send the assessment invite if the candidate is eligible
        if (insertedApplication && sendInvite && finalEmail) {
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
        } else {
            console.log(`⛔ Assessment invite SKIPPED for ${finalName} (Score: ${score}). Status: ${status}`)
        }

        revalidatePath('/dashboard/hiring')

        if (!sendInvite) {
            return { message: 'Uploaded to talent pool, but did not meet the JD match threshold.', status, score }
        }

        return { message: 'Success', status, score }

    } catch (error: any) {
        console.error('Processing Error:', error)
        return { message: error.message }
    }
}

/**
 * Re-matches the permanent talent pool against a job's JD using cosine
 * similarity. This powers "this candidate wasn't right for role A, but is a
 * strong fit for role B". Returns stored candidates ranked by similarity.
 */
export async function matchCandidatesForJob(
    jobId: string,
    matchCount = 20
): Promise<{ success: boolean; message?: string; matches: ResumeMatch[] }> {
    const g = await guard('candidates:read')
    if (!g.ok) return { success: false, message: g.message, matches: [] }

    if (!jobId) return { success: false, message: 'No job selected', matches: [] }

    const supabase = await createClient()

    const { data: job, error } = await supabase
        .from('job_postings')
        .select('title, description, required_skills, jd_embedding')
        .eq('id', jobId)
        .single()

    if (error || !job) {
        return { success: false, message: 'Job not found', matches: [] }
    }

    try {
        // Prefer the cached JD embedding; only build + embed the JD text when
        // the cache is missing (and backfill it for next time).
        let jdEmbedding = parseEmbedding(job.jd_embedding)

        if (!jdEmbedding) {
            const jdText = buildJobDescriptionText({
                title: job.title,
                description: job.description,
                required_skills: job.required_skills,
            })

            if (!jdText) {
                return { success: false, message: 'This job has no description or skills to match against.', matches: [] }
            }

            jdEmbedding = await embedJobDescriptionText(jdText)
            await supabase.from('job_postings').update({ jd_embedding: jdEmbedding }).eq('id', jobId)
        }

        const matches = await matchResumesByEmbedding(jdEmbedding, 0, matchCount)
        return { success: true, matches }
    } catch (err) {
        console.error('matchCandidatesForJob error:', err)
        return { success: false, message: err instanceof Error ? err.message : 'Matching failed', matches: [] }
    }
}

// =====================================================
// OFFER LETTER ACTIONS
// =====================================================

export async function draftOffer(applicationId: string, role: string, salary: string, startDate: string) {
    const g = await guard('candidates:update')
    if (!g.ok) return { success: false, message: g.message }

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
    const g = await guard('candidates:update')
    if (!g.ok) return { success: false, message: g.message }

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

// =====================================================
// INTERVIEW SCHEDULING ACTION
// =====================================================

export async function scheduleInterview(
    applicationId: string,
    interviewType: 'video' | 'in-person' | 'phone',
    date: string,
    time: string,
    interviewer: string,
    meetingLink?: string
) {
    const g = await guard('candidates:update')
    if (!g.ok) return { success: false, message: g.message }

    console.log('📅 Scheduling interview for application:', applicationId)
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
        // Format date and time for email
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })

        const [hours, minutes] = time.split(':').map(Number)
        const suffix = hours >= 12 ? 'PM' : 'AM'
        const hours12 = hours % 12 || 12
        const formattedTime = `${hours12}:${minutes.toString().padStart(2, '0')} ${suffix}`

        // Send the interview schedule email
        const { sendInterviewScheduleEmail } = await import('@/lib/services/email')
        const emailResult = await sendInterviewScheduleEmail(
            app.candidate_email,
            app.candidate_name,
            app.offer_role || 'Software Engineer',
            interviewType,
            formattedDate,
            formattedTime,
            meetingLink
        )

        if (!emailResult.success) {
            console.error('Email send failed:', emailResult.error)
            // Continue anyway - we still want to update the status
        }

        // Update application status and store interview details
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: 'offer',  // Move to Offer column after interview is scheduled
                interview_type: interviewType,
                interview_date: date,
                interview_time: time,
                interviewer: interviewer,
                interview_link: meetingLink || null
            })
            .eq('id', applicationId)

        if (updateError) {
            console.error('Update error:', updateError)
            return { success: false, message: 'Failed to update status: ' + updateError.message }
        }

        console.log('✅ Interview scheduled successfully')
        revalidatePath('/dashboard/hiring')
        return { success: true, message: 'Interview scheduled!' }

    } catch (error: any) {
        console.error('Schedule interview error:', error)
        return { success: false, message: error.message }
    }
}

// =====================================================
// FINAL DECISION ACTIONS
// =====================================================

export async function confirmHire(
    applicationId: string,
    joiningDate: string,
    finalRole: string
) {
    const g = await guard('candidates:update')
    if (!g.ok) return { success: false, message: g.message }

    console.log('🎉 Confirming hire for application:', applicationId)
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
        // Format date for email
        const formattedDate = new Date(joiningDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })

        // Send welcome email
        const { sendWelcomeEmail } = await import('@/lib/services/email')
        const emailResult = await sendWelcomeEmail(
            app.candidate_email,
            app.candidate_name,
            finalRole,
            formattedDate
        )

        if (!emailResult.success) {
            console.error('Welcome email failed:', emailResult.error)
            // Continue anyway
        }

        // Update application status to HIRED
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: 'HIRED',
                offer_role: finalRole,
                offer_start_date: joiningDate
            })
            .eq('id', applicationId)

        if (updateError) {
            console.error('Update error:', updateError)
            return { success: false, message: 'Failed to update status: ' + updateError.message }
        }

        console.log('✅ Candidate hired successfully')
        revalidatePath('/dashboard/hiring')
        revalidatePath('/dashboard/team')
        return { success: true, message: 'Candidate hired!' }

    } catch (error: any) {
        console.error('Confirm hire error:', error)
        return { success: false, message: error.message }
    }
}

export async function rejectCandidate(
    applicationId: string,
    reason: string,
    sendEmail: boolean
) {
    const g = await guard('candidates:update')
    if (!g.ok) return { success: false, message: g.message }

    console.log('❌ Rejecting application:', applicationId, 'Reason:', reason)
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
        // Send rejection email if requested
        if (sendEmail) {
            const emailResult = await sendRejectionEmail(app.candidate_email, app.candidate_name)
            if (!emailResult.success) {
                console.error('Rejection email failed:', emailResult.error)
                // Continue anyway
            }
        }

        // Update application status to REJECTED
        const { error: updateError } = await supabase
            .from('applications')
            .update({
                status: 'REJECTED',
                rejection_reason: reason
            })
            .eq('id', applicationId)

        if (updateError) {
            console.error('Update error:', updateError)
            return { success: false, message: 'Failed to update status: ' + updateError.message }
        }

        console.log('✅ Candidate rejected')
        revalidatePath('/dashboard/hiring')
        return { success: true, message: 'Candidate rejected' }

    } catch (error: any) {
        console.error('Reject candidate error:', error)
        return { success: false, message: error.message }
    }
}

export async function updateApplicationStatus(applicationId: string, newStatus: string) {
    const g = await guard('candidates:update')
    if (!g.ok) return { success: false, message: g.message }

    const supabase = await createClient()

    // Normalize status casing if needed, but for now assuming strict match
    const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicationId)

    if (error) {
        console.error('Error updating status:', error)
        return { success: false, message: error.message }
    }

    revalidatePath('/dashboard/hiring')
    return { success: true }
}
