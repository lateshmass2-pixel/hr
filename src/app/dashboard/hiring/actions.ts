'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import OpenAI from "openai"
// @ts-ignore
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

// Helper to parse PDF buffer
async function parsePdf(buffer: Buffer): Promise<string> {
    // Convert Buffer to Uint8Array as expected by pdfjs-dist
    const uint8Array = new Uint8Array(buffer);

    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;

    let fullText = '';

    // Iterate through all pages
    for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();

        // Extract text items and join them
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');

        fullText += pageText + '\n';
    }

    return fullText;
}

export async function processApplication(formData: FormData) {
    const supabase = await createClient()

    const file = formData.get('resume') as File
    const jobId = formData.get('jobId') as string
    const candidateName = formData.get('name') as string
    const candidateEmail = formData.get('email') as string

    if (!file || !jobId) {
        return { message: 'Missing file or job ID' }
    }

    try {
        // 1. Upload Resume to Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `resumes/${fileName}`

        const { error: uploadError } = await supabase
            .storage
            .from('resumes') // Ensure this bucket exists!
            .upload(filePath, file)

        if (uploadError) throw new Error('Upload failed: ' + uploadError.message)

        const resumeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resumes/${filePath}`

        // 2. Extract Text from PDF
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const rawText = await parsePdf(buffer)
        const resumeText = rawText.substring(0, 3000) // Limit tokens

        // 3. Analyze with OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert HR Recruiter. Analyze the resume text against a generic software engineering role (or the specific job if provided). 
          Output a JSON object with:
          - score: number (0-100) based on relevance
          - summary: string (brief reasoning)
          - questions: array of 3 technical strings (questions to ask the candidate based on their weaknesses or claimed skills)
          - candidate_name: string (extracted from resume, or "Unknown Candidate")
          - candidate_email: string (extracted from resume, or "unknown@example.com")
          
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
        const { score, summary, questions, candidate_name, candidate_email } = aiResponse

        // Use formData values if present (manual override), otherwise use AI extracted values
        const finalName = candidateName || candidate_name
        const finalEmail = candidateEmail || candidate_email

        // 4. Update Database
        // Determine status based on score
        const status = score >= 60 ? 'TEST_PENDING' : 'REJECTED'

        const { error: dbError } = await supabase.from('applications').insert({
            job_id: jobId,
            candidate_name: finalName,
            candidate_email: finalEmail,
            resume_url: resumeUrl,
            resume_text: resumeText,
            score: score,
            ai_reasoning: summary,
            generated_questions: questions,
            status: status
        })

        if (dbError) throw new Error('DB Insert failed: ' + dbError.message)

        revalidatePath('/dashboard/hiring')
        return { message: 'Success', status, score }

    } catch (error: any) {
        console.error('Processing Error:', error)
        return { message: error.message }
    }
}
