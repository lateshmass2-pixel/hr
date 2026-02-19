// =============================================================================
// Billing API Route — Create Checkout Session / Customer Portal
// =============================================================================
// POST /api/billing/checkout  → Create Stripe Checkout session
// POST /api/billing/portal    → Create Stripe Customer Portal session
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/rbac/guard';
import { createCheckoutSession, createPortalSession } from '@/lib/billing/stripe';
import { getOrganizationById } from '@/lib/organization';
import { getAppUrl, checkRateLimit, RATE_LIMITS } from '@/lib/security';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, organizationId, priceId } = body;

        // Rate limiting
        const rateCheck = checkRateLimit(`billing:${organizationId}`, RATE_LIMITS.heavy);
        if (!rateCheck.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Try again later.' },
                { status: 429, headers: { 'Retry-After': String(rateCheck.resetIn) } }
            );
        }

        // RBAC: Only owners can manage billing
        const ctx = await requirePermission(organizationId, 'billing:manage');

        const org = await getOrganizationById(organizationId);
        if (!org) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        const appUrl = getAppUrl();

        if (action === 'checkout') {
            if (!priceId) {
                return NextResponse.json({ error: 'Price ID required' }, { status: 400 });
            }

            const url = await createCheckoutSession({
                organizationId,
                organizationName: org.name,
                priceId,
                customerEmail: ctx.email,
                stripeCustomerId: org.stripe_customer_id ?? undefined,
                successUrl: `${appUrl}/dashboard/billing?success=true`,
                cancelUrl: `${appUrl}/dashboard/billing?canceled=true`,
            });

            return NextResponse.json({ url });
        }

        if (action === 'portal') {
            if (!org.stripe_customer_id) {
                return NextResponse.json({ error: 'No billing account found' }, { status: 400 });
            }

            const url = await createPortalSession({
                stripeCustomerId: org.stripe_customer_id,
                returnUrl: `${appUrl}/dashboard/billing`,
            });

            return NextResponse.json({ url });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('[Billing API]', error);
        return NextResponse.json(
            { error: error.message ?? 'Internal error' },
            { status: error.message?.includes('Forbidden') ? 403 : 500 }
        );
    }
}
