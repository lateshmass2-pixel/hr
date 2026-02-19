// =============================================================================
// Stripe Integration — Checkout & Portal
// =============================================================================
// Install Stripe when ready: npm install stripe
// Set env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// =============================================================================

let stripe: any = null;

try {
    if (process.env.STRIPE_SECRET_KEY) {
        // Dynamic import to avoid crash if stripe package isn't installed yet
        const Stripe = require('stripe');
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: '2024-12-18.acacia',
            typescript: true,
        });
    }
} catch {
    console.warn('[Billing] stripe package not installed. Run: npm install stripe');
}

export { stripe };

/**
 * Create a Stripe Checkout Session for subscription
 */
export async function createCheckoutSession(params: {
    organizationId: string;
    organizationName: string;
    priceId: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
    stripeCustomerId?: string;
}): Promise<string | null> {
    if (!stripe) throw new Error('Stripe not configured. Install stripe and set STRIPE_SECRET_KEY.');

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: params.stripeCustomerId || undefined,
        customer_email: params.stripeCustomerId ? undefined : params.customerEmail,
        line_items: [{ price: params.priceId, quantity: 1 }],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        subscription_data: {
            metadata: {
                organization_id: params.organizationId,
            },
        },
        metadata: {
            organization_id: params.organizationId,
        },
    });

    return session.url;
}

/**
 * Create a Stripe Customer Portal session
 */
export async function createPortalSession(params: {
    stripeCustomerId: string;
    returnUrl: string;
}): Promise<string> {
    if (!stripe) throw new Error('Stripe not configured. Install stripe and set STRIPE_SECRET_KEY.');

    const session = await stripe.billingPortal.sessions.create({
        customer: params.stripeCustomerId,
        return_url: params.returnUrl,
    });

    return session.url;
}
