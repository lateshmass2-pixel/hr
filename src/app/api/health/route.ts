/**
 * GET /api/health — liveness probe.
 *
 * Answers one question: is this process running and able to serve HTTP?
 *
 * Deliberately checks NO dependencies. A liveness probe that fails when the
 * database is briefly unreachable causes an orchestrator to kill and restart
 * healthy application instances, turning a dependency blip into an outage.
 * Dependency checks belong in /api/ready.
 *
 * Public and unauthenticated by design — load balancers and orchestrators
 * cannot present credentials. It exposes no information beyond "up", so there
 * is nothing here worth authenticating.
 */

import { NextResponse } from 'next/server';

// Never cache: a cached health check tells you about the past.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const startedAt = Date.now();

export async function GET() {
    return NextResponse.json(
        {
            status: 'ok',
            uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
            timestamp: new Date().toISOString(),
        },
        {
            status: 200,
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
        }
    );
}
