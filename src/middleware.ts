// =============================================================================
// Next.js Middleware — Auth + Multi-Tenant Route Protection
// =============================================================================
// This middleware:
// 1. Refreshes Supabase auth session on every request
// 2. Protects /dashboard/* routes (require authentication)
// 3. Redirects unauthenticated users to /login
// 4. Allows /api/webhooks/* to pass through (Stripe, etc.)
// =============================================================================

import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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

    // ==========================================================================
    // 1. Allow webhooks to pass through without auth (they use signatures)
    // ==========================================================================
    if (path.startsWith('/api/webhooks/')) {
        return supabaseResponse;
    }

    // ==========================================================================
    // 2. Allow public routes
    // ==========================================================================
    const publicRoutes = ['/login', '/signup', '/api/invite/accept', '/assessment'];
    const isPublic = publicRoutes.some((route) => path.startsWith(route));
    if (isPublic || path === '/') {
        // Refresh session even on public routes (for navbar state etc.)
        await supabase.auth.getUser();
        return supabaseResponse;
    }

    // ==========================================================================
    // 3. Protected routes — require authentication
    // ==========================================================================
    const { data: { user } } = await supabase.auth.getUser();

    const isProtected = path.startsWith('/dashboard') || path.startsWith('/admin');

    if (isProtected && !user) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', path);
        return NextResponse.redirect(loginUrl);
    }

    // ==========================================================================
    // 4. If authenticated, check if user has an organization
    //    If not, redirect to onboarding
    // ==========================================================================
    if (user && path.startsWith('/dashboard') && !path.startsWith('/dashboard/onboarding')) {
        // We check org membership via a lightweight query
        // Note: This runs on every dashboard request — consider caching with cookies
        const { data: membership } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .limit(1)
            .single();

        if (!membership) {
            // User has no org — send to onboarding
            return NextResponse.redirect(new URL('/dashboard/onboarding', request.url));
        }
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
