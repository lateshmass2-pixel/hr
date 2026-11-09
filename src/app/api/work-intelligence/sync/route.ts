import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/observability/logger'
import { syncRepository } from '@/lib/work-intelligence/sync'
import { generateDailyReport } from '@/lib/work-intelligence/reports'

// =============================================================================
// Scheduled Sync — /api/work-intelligence/sync
// =============================================================================
// Called by a cron scheduler (e.g. GitHub Actions scheduled job, Vercel
// cron, or an external uptime monitor) with:
//   Authorization: Bearer <CRON_SECRET>
//
// Performs:
//   1. Incremental repo sync for every active repository (webhook-first;
//      this is the catch-up path, §25)
//   2. Daily report generation for every active employee with a connected
//      account (for yesterday, so the day is complete)
//
// Bounded: repositories are capped by the sync engine; failures update
// sync_status and never abort the whole run (§26).
// =============================================================================

export async function POST(request: NextRequest) {
    try {
        const cronSecret = process.env.CRON_SECRET
        const auth = request.headers.get('authorization')
        if (!cronSecret) {
            // No CRON_SECRET configured — refuse rather than run open.
            logger.error('CRON_SECRET not configured; refusing scheduled sync')
            return new NextResponse('Not configured', { status: 500 })
        }
        if (auth !== `Bearer ${cronSecret}`) {
            logger.warn('Unauthorized scheduled sync attempt')
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const adminSupabase = await createAdminClient()

        // 1. Sync repositories
        const { data: repos } = await adminSupabase
            .from('git_repositories')
            .select('id, organization_id')
            .eq('is_active', true)
            .limit(50)

        const syncResults = []
        for (const repo of (repos ?? []) as Array<{ id: string }>) {
            const outcome = await syncRepository(adminSupabase, repo.id)
            syncResults.push(outcome)
        }

        // 2. Generate daily reports for yesterday for all employees with
        //    connected accounts.
        const yesterday = new Date(Date.now() - 24 * 3600 * 1000)
            .toISOString()
            .slice(0, 10)

        const { data: orgAccounts } = await adminSupabase
            .from('git_accounts')
            .select('organization_id, employee_id')
            .not('employee_id', 'is', null)
            .eq('sync_enabled', true)

        const seen = new Set<string>()
        let reportsGenerated = 0
        const reportErrors: string[] = []
        for (const acc of (orgAccounts ?? []) as Array<{
            organization_id: string
            employee_id: string | null
        }>) {
            if (!acc.employee_id) continue
            const key = `${acc.organization_id}|${acc.employee_id}`
            if (seen.has(key)) continue
            seen.add(key)
            try {
                await generateDailyReport(adminSupabase, {
                    organizationId: acc.organization_id,
                    employeeId: acc.employee_id,
                    date: yesterday,
                })
                reportsGenerated++
            } catch (err) {
                reportErrors.push(String(err))
            }
        }

        logger.info('Scheduled sync completed', {
            repositories: syncResults.length,
            reportsGenerated,
            reportErrors: reportErrors.length,
        })

        return NextResponse.json({
            repositories: syncResults.map((r) => ({
                repositoryId: r.repositoryId,
                status: r.status,
                commitsIngested: r.commitsIngested,
                prsIngested: r.prsIngested,
                runsIngested: r.runsIngested,
            })),
            reportsGenerated,
            reportErrorCount: reportErrors.length,
        })
    } catch (error) {
        logger.error('Scheduled sync failed', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
