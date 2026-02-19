// =============================================================================
// Invite Accept API Route — GET /api/invite/accept?token=xxx
// =============================================================================
// This route is hit when a user clicks the invite link in their email.
// If they're not logged in, they're redirected to signup first.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
        return NextResponse.redirect(new URL('/login?error=invalid_invite', request.url));
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        // Not logged in — redirect to signup with token preserved
        const signupUrl = new URL('/signup', request.url);
        signupUrl.searchParams.set('invite_token', token);
        return NextResponse.redirect(signupUrl);
    }

    // User is logged in — accept the invitation via RPC
    const { data: result, error } = await supabase.rpc('accept_invitation', {
        invite_token: token,
    });

    if (error || (result as any)?.error) {
        const errorMessage = (result as any)?.error || error?.message || 'Failed to accept invitation';
        return NextResponse.redirect(
            new URL(`/dashboard?error=${encodeURIComponent(errorMessage)}`, request.url)
        );
    }

    const orgId = (result as any)?.organization_id;
    return NextResponse.redirect(
        new URL(`/dashboard?org=${orgId}&welcome=true`, request.url)
    );
}
