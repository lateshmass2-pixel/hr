// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
    const { applicationId, action } = await req.json();

    if (action === 'SEND_OFFER') {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Fetch Draft Content
        const { data: app } = await supabase.from('applications').select('*').eq('id', applicationId).single();

        // 2. Update Status
        await supabase.from('applications').update({ status: 'OFFER_SENT' }).eq('id', applicationId);

        // 3. Send Email (Resend/SMTP Mock)
        console.log(`Sending Email to ${app.candidate_email}: ${app.draft_offer_content}`);

        return new Response(JSON.stringify({ sent: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response("Invalid Action", { status: 400 });
});
