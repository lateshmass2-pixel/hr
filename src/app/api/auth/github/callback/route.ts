import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getServerEnv } from '@/lib/env'
import { logger } from '@/lib/observability/logger'
import crypto from 'crypto'
import {
    encryptToken,
    EncryptionKeyMissingError,
} from '@/lib/work-intelligence/crypto'

/** Where OAuth errors/success redirect to (the real settings page). */
const SETTINGS_PATH = '/settings/integrations/github'

function settingsUrl(request: NextRequest, params: Record<string, string>): URL {
    const url = new URL(SETTINGS_PATH, request.url)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    return url
}

interface GitHubTokenResponse {
    access_token: string
    token_type: string
    scope: string
    expires_in?: number
    refresh_token?: string
}

interface GitHubUserResponse {
    id: number
    login: string
    name: string | null
    email: string | null
    avatar_url: string
}

interface GitHubEmailResponse {
    email: string
    primary: boolean
    verified: boolean
    visibility: string | null
}

async function getGitHubUserEmails(accessToken: string): Promise<string[]> {
    const response = await fetch('https://api.github.com/user/emails', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    })
    
    if (!response.ok) return []
    
    const emails: Array<{ email: string; primary: boolean; verified: boolean; visibility: string | null }> = await response.json()
    return emails
        .filter(e => e.verified && e.primary)
        .map(e => e.email)
}

export async function GET(request: NextRequest) {
    try {
        const env = getServerEnv()
        const supabase = await createClient()
        const adminSupabase = await createAdminClient()

        // Verify state parameter
        const stateCookie = request.cookies.get('github_oauth_state')?.value
        const stateParam = request.nextUrl.searchParams.get('state')
        
        if (!stateCookie || !stateParam || stateCookie !== stateParam) {
            logger.warn('Invalid GitHub OAuth state parameter')
            return NextResponse.redirect(settingsUrl(request, { error: 'invalid_state' }))
        }

        let parsedState: { orgId: string; userId: string; timestamp: number }
        try {
            parsedState = JSON.parse(Buffer.from(stateCookie, 'base64url').toString())
        } catch {
            logger.warn('Failed to parse GitHub OAuth state')
            return NextResponse.redirect(settingsUrl(request, { error: 'invalid_state' }))
        }

        // Check state age (10 minutes)
        if (Date.now() - parsedState.timestamp > 600_000) {
            logger.warn('GitHub OAuth state expired')
            return NextResponse.redirect(settingsUrl(request, { error: 'state_expired' }))
        }

        const code = request.nextUrl.searchParams.get('code')
        if (!code) {
            const error = request.nextUrl.searchParams.get('error')
            logger.warn('GitHub OAuth failed', { error })
            return NextResponse.redirect(settingsUrl(request, { error: error || 'no_code' }))
        }

        const clientId = env.GITHUB_CLIENT_ID
        const clientSecret = env.GITHUB_CLIENT_SECRET
        
        if (!clientId || !clientSecret) {
            logger.error('GitHub OAuth credentials not configured')
            return NextResponse.redirect(settingsUrl(request, { error: 'github_not_configured' }))
        }

        // Exchange code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`,
            }),
        })

        const tokenData: GitHubTokenResponse = await tokenResponse.json()
        
        if (!tokenResponse.ok || !tokenData.access_token) {
            logger.error('Failed to exchange GitHub OAuth code', tokenData)
            return NextResponse.redirect(settingsUrl(request, { error: 'token_exchange_failed' }))
        }

        // Get GitHub user info
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
            },
        })

        if (!userResponse.ok) {
            logger.error('Failed to fetch GitHub user', await userResponse.text())
            return NextResponse.redirect(
                settingsUrl(request, { error: 'user_fetch_failed' })
            )
        }

        const githubUser: GitHubUserResponse = await userResponse.json()

        // Get verified primary email
        const emails = await getGitHubUserEmails(tokenData.access_token)
        const primaryEmail = emails[0] || githubUser.email

        // Encrypt the access token for storage. When ENCRYPTION_KEY is not
        // configured we still connect the account (webhook-only mode: events
        // are ingested, but token-backed sync/enrichment is disabled) rather
        // than failing the flow — and surface that in last_error.
        let encryptedToken: string | null = null
        try {
            encryptedToken = encryptToken(tokenData.access_token)
        } catch (err) {
            if (err instanceof EncryptionKeyMissingError) {
                logger.warn('ENCRYPTION_KEY missing — connecting account in webhook-only mode')
            } else {
                throw err
            }
        }
        const tokenExpiresAt = tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            : null

        // Check if this GitHub account is already connected to another employee in this org
        const { data: existingAccount } = await adminSupabase
            .from('git_accounts')
            .select('id, employee_id')
            .eq('organization_id', parsedState.orgId)
            .eq('github_user_id', githubUser.id)
            .single()

        if (existingAccount && existingAccount.employee_id) {
            // Check if it's the same employee
            const { data: currentEmployee } = await adminSupabase
                .from('org_employees')
                .select('id')
                .eq('user_id', parsedState.userId)
                .eq('organization_id', parsedState.orgId)
                .single()

            if (currentEmployee && existingAccount.employee_id !== currentEmployee.id) {
                logger.warn('GitHub account already connected to another employee')
                return NextResponse.redirect(
                    settingsUrl(request, { error: 'github_account_conflict' })
                )
            }
        }

        // Get or create employee record for this user
        let { data: employee } = await adminSupabase
            .from('org_employees')
            .select('id')
            .eq('user_id', parsedState.userId)
            .eq('organization_id', parsedState.orgId)
            .single()

        if (!employee) {
            // Create employee record if it doesn't exist
            const { data: profile } = await adminSupabase.auth.admin.getUserById(parsedState.userId)
            const { data: newEmployee, error: empError } = await adminSupabase
                .from('org_employees')
                .insert({
                    organization_id: parsedState.orgId,
                    user_id: parsedState.userId,
                    full_name: profile.user?.user_metadata?.full_name || githubUser.name || githubUser.login,
                    email: profile.user?.email || primaryEmail || `${githubUser.login}@github.local`,
                })
                .select('id')
                .single()

            if (empError || !newEmployee) {
                logger.error('Failed to create employee record', empError)
                return NextResponse.redirect(
                    settingsUrl(request, { error: 'employee_creation_failed' })
                )
            }
            employee = newEmployee
        }

        // Upsert GitHub account
        const { error: upsertError } = await adminSupabase
            .from('git_accounts')
            .upsert({
                organization_id: parsedState.orgId,
                employee_id: employee.id,
                user_id: parsedState.userId,
                github_user_id: githubUser.id,
                github_username: githubUser.login,
                display_name: githubUser.name,
                email: primaryEmail,
                avatar_url: githubUser.avatar_url,
                access_token_encrypted: encryptedToken,
                token_scopes: tokenData.scope,
                token_expires_at: tokenExpiresAt,
                status: 'CONNECTED',
                sync_enabled: true,
                identity_source: 'oauth',
                last_error: encryptedToken
                    ? null
                    : 'ENCRYPTION_KEY not set — token not stored; running in webhook-only mode',
                last_synced_at: new Date().toISOString(),
            }, {
                onConflict: 'organization_id,github_user_id',
            })

        if (upsertError) {
            logger.error('Failed to upsert GitHub account', upsertError)
            return NextResponse.redirect(
                settingsUrl(request, { error: 'account_save_failed' })
            )
        }

        logger.info('GitHub account connected successfully', {
            orgId: parsedState.orgId,
            employeeId: employee.id,
            githubUsername: githubUser.login,
        })

        // Clear the state cookie and redirect to settings with success
        const response = NextResponse.redirect(
            settingsUrl(request, { connected: 'true' })
        )
        response.cookies.set('github_oauth_state', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 0,
            path: '/',
        })

        return response
    } catch (error) {
        logger.error('GitHub OAuth callback failed', error)
        return NextResponse.redirect(
            settingsUrl(request, { error: 'github_oauth_failed' })
        )
    }
}