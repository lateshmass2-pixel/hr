// =============================================================================
// Next.js Middleware — Auth + Multi-Tenant Route Protection
// =============================================================================
// Responsibilities:
//   1. Refresh the Supabase auth session on every request
//   2. Gate /dashboard/* and /admin/* behind authentication
//   3. Route authenticated-but-tenant-less users to onboarding
//
// This middleware is an OPTIMIZATION and a first line of defence, not the
// authorization boundary. The authority is src/lib/auth/session.ts
// (`requireSession` / `requirePermissionFromSession`), which every page and
// server action goes through and which fails closed. That layering matters:
// middleware runs on the edge with a partial view, so anything it cannot
// determine must be deferred to the server-side guard rather than guessed.
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { logger } from '@/lib/observability/logger';

/**
 * Paths reachable without a session.
 *
 * - webhooks authenticate by signature, not cookie
 * - health/ready are probed by load balancers, which cannot present credentials
 * - /assessment is the candidate-facing flow (external users, no account)
 */
const PUBLIC_PREFIXES = [
    '/login',
    '/signup',
    '/assessment',
    '/api/webhooks/',
    '/api/invite/accept',
    '/api/health',
    '/api/ready',
] as const;

const PROTECTED_PREFIXES = ['/dashboard', '/admin'] as const;

const ONBOARDING_PATH = '/dashboard/onboarding';

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const path = request.nextUrl.pathname;

    // -------------------------------------------------------------------------
    // 1. Public paths
    // -------------------------------------------------------------------------
    const isPublic = PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));

    if (isPublic || path === '/') {
        // Refresh the session opportunistically so a logged-in visitor to a
        // public page keeps a fresh token. Failure is genuinely non-fatal here:
        // the page does not require a session either way.
        try {
            await supabase.auth.getUser();
        } catch (error) {
            logger.warn('Session refresh failed on a public path', {
                route: path,
                errorMessage: error instanceof Error ? error.message : 'unknown',
            });
        }
        return supabaseResponse;
    }

    const isProtected = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));

    // -------------------------------------------------------------------------
    // 2. Authentication
    // -------------------------------------------------------------------------
    let userId: string | null = null;
    let authFailed = false;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id ?? null;
    } catch (error) {
        // FAIL CLOSED. If we cannot establish who the caller is, a protected
        // route must not be served. Previously this logged a warning and let
        // the request continue.
        authFailed = true;
        logger.error('Could not determine the authenticated user', error, { route: path });
    }

    if (isProtected && (authFailed || !userId)) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', path);
        return NextResponse.redirect(loginUrl);
    }

    // -------------------------------------------------------------------------
    // 3. Tenant membership
    // -------------------------------------------------------------------------
    // Authenticated users with no organization belong in onboarding, never in a
    // shared tenant (see src/lib/auth/session.ts).
    //
    // TODO(plan 4.5): this is a database round trip on EVERY dashboard request.
    // Replace with a signed cookie carrying org + role, refreshed on change.
    if (userId && path.startsWith('/dashboard') && !path.startsWith(ONBOARDING_PATH)) {
        const { data: membership, error } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

        if (error) {
            // Deliberately NOT redirected to onboarding: on a transient lookup
            // failure that would invite the user to create a duplicate
            // organization. Defer to requireSession(), which fails closed with
            // an error rather than guessing.
            logger.error('Organization membership check failed in middleware', error, {
                route: path,
                userId,
            });
        } else if (!membership) {
            return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url));
        }
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
