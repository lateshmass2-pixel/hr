// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Setup OpenAI
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

Deno.serve(async (req: Request) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Parse Request (Webhook Payload)
        const { record } = await req.json();
        if (!record || !record.resume_url) throw new Error('No resume URL found');

        // 2. Fetch PDF from Storage (Mocked for now as just text extraction logic)
        // In production: await supabase.storage.from('resumes').download(record.resume_url);

        // 3. Call OpenAI to Analyze
        const processingResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: 'You are an HR Assistant. Extract skills and calculate a match score (0-100) based on the job description. Output JSON: { "score": number, "summary": string, "draft_email": string }' },
                    { role: 'user', content: `Analyze this resume: ${record.resume_url}` } // Passing URL as text for mock
                ],
            }),
        });

        const aiData = await processingResponse.json();
        const result = JSON.parse(aiData.choices[0].message.content);

        // 4. Update Application Record
        const { error } = await supabase
            .from('applications')
            .update({
                score: result.score,
                status: result.score < 50 ? 'REJECTED' : 'SCREENING',
                draft_offer_content: result.draft_email // Pre-saving draft if highly qualified
            })
            .eq('id', record.id);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});
