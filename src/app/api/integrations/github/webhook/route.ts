import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getServerEnv } from '@/lib/env'
import { logger } from '@/lib/observability/logger'
import { verifyWebhookSignature } from '@/lib/work-intelligence/crypto'
import { ingestWebhookEvent } from '@/lib/work-intelligence/ingest'

// =============================================================================
// GitHub Webhook Endpoint — /api/integrations/github/webhook
// =============================================================================
// Security: every request is verified against GITHUB_WEBHOOK_SECRET
// (HMAC-SHA256 over the raw body, timing-safe compare) BEFORE anything is
// parsed or stored. Unverified payloads are rejected with 401 and never
// touch the database.
//
// Idempotency: delivery ids (X-GitHub-Delivery) are unique in git_events;
// replays are marked 'duplicate' and short-circuit before any insert.
//
// The raw body is read ONCE (text) — the same string is used for signature
// verification and JSON.parse, fixing the double-consume bug in the
// previous implementation.
// =============================================================================

export async function POST(request: NextRequest) {
    try {
        const env = getServerEnv()
        const secret = env.GITHUB_WEBHOOK_SECRET
        if (!secret) {
            logger.error('GITHUB_WEBHOOK_SECRET not configured; rejecting webhook')
            return new NextResponse('Webhook secret not configured', { status: 500 })
        }

        // Read the raw body exactly once.
        const rawBody = await request.text()

        // Verify signature over the raw body.
        const signature = request.headers.get('x-hub-signature-256')
        if (!verifyWebhookSignature(rawBody, signature, secret)) {
            logger.warn('Invalid GitHub webhook signature — rejecting', {
                hasSignature: Boolean(signature),
            })
            return new NextResponse('Invalid signature', { status: 401 })
        }

        const eventType = request.headers.get('x-github-event')
        const deliveryId = request.headers.get('x-github-delivery')
        if (!eventType || !deliveryId) {
            return new NextResponse('Missing required headers', { status: 400 })
        }

        let payload: Record<string, unknown>
        try {
            payload = JSON.parse(rawBody)
        } catch {
            logger.warn('Malformed webhook payload', { deliveryId, eventType })
            return new NextResponse('Malformed payload', { status: 400 })
        }

        const senderLogin =
            (payload.sender as { login?: string } | undefined)?.login
            ?? (payload.pusher as { name?: string } | undefined)?.name
            ?? null
        const action = typeof payload.action === 'string' ? payload.action : null

        logger.info('Received GitHub webhook', {
            eventType,
            deliveryId,
            repo: (payload.repository as { full_name?: string } | undefined)?.full_name,
        })

        const supabase = await createAdminClient()

        const result = await ingestWebhookEvent({
            supabase,
            deliveryId,
            eventType,
            action,
            senderLogin,
            payload,
        })

        // 'duplicate' and 'ignored' return 200 so GitHub stops redelivering.
        return NextResponse.json(
            { status: result.status, detail: result.detail ?? null },
            { status: 200 }
        )
    } catch (error) {
        logger.error('GitHub webhook processing failed', error)
        // 500 makes GitHub retry — safe because processing is idempotent.
        return new NextResponse('Internal server error', { status: 500 })
    }
}

// GitHub sends a ping on webhook creation — acknowledge.
export async function GET() {
    return NextResponse.json({ ok: true, endpoint: 'github-webhook' })
}
