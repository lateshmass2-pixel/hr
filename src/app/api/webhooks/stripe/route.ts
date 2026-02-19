// =============================================================================
// Stripe Webhook Handler — Next.js Route Handler
// =============================================================================
// Endpoint: POST /api/webhooks/stripe
// Handles: checkout.session.completed, invoice.paid, customer.subscription.*
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/billing/stripe';
import { PLAN_CONFIGS, type Plan } from '@/lib/billing/plans';
import { createClient } from '@supabase/supabase-js';

// Use service role for webhook processing (bypasses RLS)
function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST(request: NextRequest) {
    if (!stripe) {
        return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err: any) {
        console.error('[Stripe Webhook] Signature verification failed:', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = getAdminClient();

    try {
        switch (event.type) {
            // =====================================================================
            // Checkout completed — user just subscribed
            // =====================================================================
            case 'checkout.session.completed': {
                const session = event.data.object as any;
                const orgId = session.metadata?.organization_id;
                const customerId = session.customer;
                const subscriptionId = session.subscription;

                if (!orgId) {
                    console.error('[Stripe Webhook] Missing organization_id in metadata');
                    break;
                }

                // Determine plan from the price
                const plan = await determinePlanFromSubscription(subscriptionId as string);

                await supabase
                    .from('organizations')
                    .update({
                        stripe_customer_id: customerId,
                        stripe_subscription_id: subscriptionId,
                        plan: plan,
                        subscription_status: 'active',
                        max_employees: PLAN_CONFIGS[plan].maxEmployees,
                    })
                    .eq('id', orgId);

                console.log(`[Stripe Webhook] Org ${orgId} subscribed to ${plan}`);
                break;
            }

            // =====================================================================
            // Invoice paid — recurring payment succeeded
            // =====================================================================
            case 'invoice.paid': {
                const invoice = event.data.object as any;
                const subscriptionId = invoice.subscription;

                if (subscriptionId) {
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                    const orgId = subscription.metadata?.organization_id;

                    if (orgId) {
                        await supabase
                            .from('organizations')
                            .update({
                                subscription_status: 'active',
                                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                            })
                            .eq('id', orgId);
                    }
                }
                break;
            }

            // =====================================================================
            // Invoice payment failed
            // =====================================================================
            case 'invoice.payment_failed': {
                const invoice = event.data.object as any;
                const subscriptionId = invoice.subscription;

                if (subscriptionId) {
                    const { data: org } = await supabase
                        .from('organizations')
                        .select('id')
                        .eq('stripe_subscription_id', subscriptionId)
                        .single();

                    if (org) {
                        await supabase
                            .from('organizations')
                            .update({ subscription_status: 'past_due' })
                            .eq('id', org.id);
                    }
                }
                break;
            }

            // =====================================================================
            // Subscription updated (upgrade/downgrade)
            // =====================================================================
            case 'customer.subscription.updated': {
                const subscription = event.data.object as any;
                const orgId = subscription.metadata?.organization_id;

                if (orgId) {
                    const plan = await determinePlanFromSubscription(subscription.id);

                    await supabase
                        .from('organizations')
                        .update({
                            plan,
                            subscription_status: subscription.status === 'active' ? 'active' : subscription.status,
                            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                            max_employees: PLAN_CONFIGS[plan].maxEmployees,
                        })
                        .eq('id', orgId);

                    console.log(`[Stripe Webhook] Org ${orgId} plan updated to ${plan}`);
                }
                break;
            }

            // =====================================================================
            // Subscription cancelled
            // =====================================================================
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as any;

                const { data: org } = await supabase
                    .from('organizations')
                    .select('id')
                    .eq('stripe_subscription_id', subscription.id)
                    .single();

                if (org) {
                    await supabase
                        .from('organizations')
                        .update({
                            plan: 'starter',
                            subscription_status: 'canceled',
                            max_employees: PLAN_CONFIGS.starter.maxEmployees,
                        })
                        .eq('id', org.id);

                    console.log(`[Stripe Webhook] Org ${org.id} subscription cancelled → starter`);
                }
                break;
            }

            default:
                console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }
    } catch (error) {
        console.error('[Stripe Webhook] Processing error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}

// =============================================================================
// Helper: Determine plan from Stripe subscription price
// =============================================================================

async function determinePlanFromSubscription(subscriptionId: string): Promise<Plan> {
    if (!stripe) return 'starter';

    try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id;

        // Match price ID to plan
        for (const [planName, config] of Object.entries(PLAN_CONFIGS)) {
            if (
                config.stripePriceIdMonthly === priceId ||
                config.stripePriceIdYearly === priceId
            ) {
                return planName as Plan;
            }
        }

        // Fallback: check price amount
        const amount = subscription.items.data[0]?.price?.unit_amount ?? 0;
        if (amount >= 14000) return 'ai_pro';
        if (amount >= 4000) return 'growth';
        return 'starter';
    } catch {
        return 'starter';
    }
}
