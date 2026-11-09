import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerEnv } from '@/lib/env'
import { logger } from '@/lib/observability/logger'

// Scopes required for Work Intelligence
// - read:user, user:email - for connecting GitHub account
// - repo - for accessing private repositories
// - admin:repo_hook - for managing webhooks
// - admin:org - for organization-level access
const GITHUB_OAUTH_SCOPES = [
    'read:user',
    'user:email',
    'repo',
    'admin:repo_hook',
    'admin:org',
].join(' ')

export async function GET(request: NextRequest) {
    try {
        const env = getServerEnv()
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url))
        }

        // Get user's organization
        const { data: membership } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single()

        if (!membership) {
            return NextResponse.redirect(new URL('/dashboard/onboarding', request.url))
        }

        const clientId = env.GITHUB_CLIENT_ID
        if (!clientId) {
            logger.error('GITHUB_CLIENT_ID not configured')
            return NextResponse.redirect(
                new URL('/settings/integrations/github?error=github_not_configured', request.url)
            )
        }

        // Generate state parameter for CSRF protection
        const state = Buffer.from(
            JSON.stringify({
                orgId: membership.organization_id,
                userId: user.id,
                timestamp: Date.now(),
            })
        ).toString('base64url')

        // Store state in a secure HTTP-only cookie for verification in callback
        const redirectUrl = new URL('https://github.com/login/oauth/authorize')
        redirectUrl.searchParams.set('client_id', clientId)
        redirectUrl.searchParams.set('redirect_uri', `${env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`)
        redirectUrl.searchParams.set('scope', GITHUB_OAUTH_SCOPES)
        redirectUrl.searchParams.set('state', state)
        redirectUrl.searchParams.set('allow_signup', 'false')

        const response = NextResponse.redirect(redirectUrl.toString())
        response.cookies.set('github_oauth_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 600, // 10 minutes
            path: '/',
        })

        return response
    } catch (error) {
        logger.error('GitHub OAuth initiation failed', error)
        return NextResponse.redirect(
            new URL('/settings/integrations/github?error=github_oauth_failed', request.url)
        )
    }
}