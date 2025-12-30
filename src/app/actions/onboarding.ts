'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import OpenAI from 'openai'
import { Resend } from 'resend'
// @ts-ignore
import PDFParser from 'pdf2json'

const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
})

const resend = new Resend(process.env.RESEND_API_KEY)

const AI_MODEL = 'llama-3.3-70b-versatile'

// Helper to parse PDF using pdf2json
async function parsePDF(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        // @ts-ignore
        const pdfParser = new PDFParser(null, 1) // 1 = text content only

        pdfParser.on("pdfParser_dataError", (errData: any) => {
            console.error('PDF Parser Error:', errData.parserError)
            reject(errData.parserError)
        })

        pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            // Extract raw text content
            const text = pdfParser.getRawTextContent()
            resolve(text)
        })

        pdfParser.parseBuffer(buffer)
    })
}

// Generate a secure random password
function generatePassword(name: string): string {
    const cleanName = name.split(' ')[0].replace(/[^a-zA-Z]/g, '') || 'User'
    const random = Math.floor(Math.random() * 9000) + 1000
    const special = ['!', '@', '#', '$'][Math.floor(Math.random() * 4)]
    return `${cleanName}${random}${special}`
}

export async function createEmployeeAccount(formData: FormData) {
    console.log('📋 Starting employee onboarding...')

    const supabase = await createClient()

    // Get form data
    const file = formData.get('resume') as File | null
    const manualName = formData.get('name') as string
    const manualEmail = formData.get('email') as string
    const position = formData.get('position') as string

    let extractedName = manualName
    let extractedEmail = manualEmail
    let resumeUrl = ''
    let resumeText = ''

    try {
        // Step A: Parse Resume if provided
        if (file && file.size > 0) {
            console.log('📄 Parsing resume...')

            // Upload to storage
            const fileExt = file.name.split('.').pop()
            const fileName = `employees/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

            const { error: uploadError } = await supabase
                .storage
                .from('resumes')
                .upload(fileName, file)

            if (!uploadError) {
                resumeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resumes/${fileName}`
            }

            // Extract text from PDF
            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            resumeText = await parsePDF(buffer)

            // Only extract if we don't have manual entries
            if (!manualName || !manualEmail) {
                console.log('🤖 Extracting details with AI...')

                const completion = await openai.chat.completions.create({
                    model: AI_MODEL,
                    messages: [
                        {
                            role: "system",
                            content: `Extract the person's name and email from this resume text. Return ONLY valid JSON:
{"name": "Full Name", "email": "email@example.com"}
If you can't find them, use empty strings.`
                        },
                        {
                            role: "user",
                            content: resumeText.substring(0, 2000)
                        }
                    ],
                    response_format: { type: "json_object" }
                })

                const extracted = JSON.parse(completion.choices[0].message.content || '{}')
                extractedName = manualName || extracted.name || 'New Employee'
                extractedEmail = manualEmail || extracted.email || ''
            }
        }

        // Validate we have required info
        if (!extractedEmail) {
            return { success: false, message: 'Email is required. Please enter manually or upload a resume with email.' }
        }

        if (!extractedName) {
            extractedName = extractedEmail.split('@')[0]
        }

        console.log(`👤 Creating account for: ${extractedName} (${extractedEmail})`)

        // Step B: Generate password and create auth user
        const tempPassword = generatePassword(extractedName)

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: extractedEmail,
            password: tempPassword,
            email_confirm: true, // Skip email verification
            user_metadata: {
                full_name: extractedName,
                role: 'EMPLOYEE',
                position: position || null
            }
        })

        if (authError) {
            console.error('Auth error:', authError)
            if (authError.message.includes('already been registered')) {
                return { success: false, message: 'This email is already registered.' }
            }
            return { success: false, message: authError.message }
        }

        const newUserId = authData.user.id
        console.log('✅ Auth user created:', newUserId)

        // Step C: Create profile entry
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: newUserId,
                email: extractedEmail,
                full_name: extractedName,
                role: 'EMPLOYEE',
                position: position || null,
                resume_url: resumeUrl || null
            })

        if (profileError) {
            console.error('Profile error:', profileError)
            // Try to clean up auth user
            await supabaseAdmin.auth.admin.deleteUser(newUserId)
            return { success: false, message: 'Failed to create profile: ' + profileError.message }
        }

        console.log('✅ Profile created')

        // Step D: Send welcome email with credentials
        const loginUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

        // TEST MODE: Send to admin email
        const recipientEmail = process.env.TEST_ADMIN_EMAIL || 'latesh312006@gmail.com' || extractedEmail
        const subjectPrefix = (process.env.TEST_ADMIN_EMAIL || 'true') ? '[TEST MODE] ' : ''

        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'HR Team <hr@yourdomain.com>',
            to: recipientEmail,
            subject: `${subjectPrefix}Credentials for ${extractedName}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Welcome Aboard! 🎉</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your employee account is ready</p>
        </div>
        
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi <strong>${extractedName}</strong>,
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your employee portal account has been created.
                ${process.env.TEST_ADMIN_EMAIL ? `<br><br><strong>Note:</strong> This is a test email sent to admin. The real employee email is: ${extractedEmail}` : ''}
            </p>
            
            <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 30px 0; border: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 16px 0; font-weight: 600;">🔐 Your Login Credentials:</p>
                
                <div style="margin-bottom: 12px;">
                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Login ID (Email)</span>
                    <p style="color: #1e293b; font-size: 16px; margin: 4px 0 0 0; font-family: monospace; background: white; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">${extractedEmail}</p>
                </div>
                
                <div>
                    <span style="color: #64748b; font-size: 12px; text-transform: uppercase;">Temporary Password</span>
                    <p style="color: #1e293b; font-size: 16px; margin: 4px 0 0 0; font-family: monospace; background: white; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">${tempPassword}</p>
                </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Login to Portal →
                </a>
            </div>
            
            <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-top: 24px;">
                <p style="color: #92400e; font-size: 14px; margin: 0;">
                    ⚠️ <strong>Security Notice:</strong> Please change your password after your first login for security purposes.
                </p>
            </div>
        </div>
        
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
            If you didn't expect this email, please contact HR immediately.
        </p>
    </div>
</body>
</html>
            `
        })

        console.log('📧 Welcome email sent!')

        revalidatePath('/dashboard')
        return {
            success: true,
            message: `Employee account created! Credentials sent to ${extractedEmail}`,
            employee: {
                id: newUserId,
                name: extractedName,
                email: extractedEmail
            }
        }

    } catch (error: any) {
        console.error('Onboarding error:', error)
        return { success: false, message: error.message || 'Failed to create employee account' }
    }
}
