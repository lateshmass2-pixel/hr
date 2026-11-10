import { getSession } from '@/lib/auth/session'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WorkIntelligenceNav } from '../nav'
import { buildTimeline } from '@/lib/work-intelligence/timeline'
import { BarChart3 } from 'lucide-react'
import { isRoleAtLeast } from '@/lib/rbac/types'

// =============================================================================
// Work Timeline — /dashboard/work-intelligence/timeline
// =============================================================================
// Chronological evidence (spec §14). Shows observed events only; gaps are
// gaps — HEMS never claims continuous work between events.
// =============================================================================

const KIND_STYLES: Record<string, string> = {
    commit: 'bg-emerald-50 text-emerald-800',
    push: 'bg-blue-50 text-blue-800',
    pr_opened: 'bg-purple-50 text-purple-800',
    pr_merged: 'bg-purple-100 text-purple-900',
    review: 'bg-amber-50 text-amber-800',
    ci_started: 'bg-slate-50 text-slate-700',
    ci_completed: 'bg-slate-100 text-slate-800',
    anomaly: 'bg-orange-50 text-orange-800',
    branch_created: 'bg-teal-50 text-teal-800',
    test_signal: 'bg-lime-50 text-lime-800',
    task_activity: 'bg-indigo-50 text-indigo-800',
}

export default async function TimelinePage({
    searchParams,
}: {
    searchParams: Promise<{ employeeId?: string }>
}) {
    const session = await getSession()
    if (!session) redirect('/login')

    const params = await searchParams
    const supabase = await createClient()
    const adminSupabase = await createAdminClient()
    const isManager = isRoleAtLeast(session.role, 'manager')
    if (!isManager) redirect('/dashboard/work-intelligence/git-activity')

    // Resolve target employee: query param (manager viewing someone) or self.
    let employeeId: string | undefined
    let employeeName = 'Your work'
    if (params.employeeId) {
        if (!isManager) redirect('/dashboard/work-intelligence/timeline')
        const { data: emp } = await adminSupabase
            .from('org_employees')
            .select('id, full_name')
            .eq('organization_id', session.organizationId)
            .eq('id', params.employeeId)
            .maybeSingle()
        if (!emp) redirect('/dashboard/work-intelligence/timeline')
        employeeId = emp.id
        employeeName = `${emp.full_name}'s work`
    } else {
        const { data: myEmployee } = await adminSupabase
            .from('org_employees')
            .select('id')
            .eq('organization_id', session.organizationId)
            .eq('user_id', session.userId)
            .maybeSingle()
        employeeId = myEmployee?.id ?? undefined
    }

    const timeline = employeeId
        ? await buildTimeline(supabase, {
            organizationId: session.organizationId,
            employeeId,
            limit: 150,
        })
        : []

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-[#0a3b2a] flex items-center gap-2">
                    <BarChart3 className="h-6 w-6" /> Work Timeline
                </h1>
                <WorkIntelligenceNav />
            </div>

            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] mb-1">{employeeName}</h2>
                <p className="text-xs text-slate-400 mb-4">
                    Each entry is an observed, timestamped event from GitHub. Gaps between
                    events are gaps — this timeline does not claim continuous work.
                </p>

                {timeline.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6">
                        No timeline events yet. Events appear once GitHub is connected and a
                        repository is syncing.
                    </p>
                ) : (
                    <ol className="relative border-l-2 border-slate-100 ml-3 space-y-4">
                        {timeline.map((entry, i) => (
                            <li key={`${entry.sourceTable}-${entry.sourceId}-${i}`} className="ml-4">
                                <div className="absolute -left-[9px] mt-1.5 h-3 w-3 rounded-full border-2 border-white" style={{ background: 'var(--tw-emoji, #14532d)' }} />
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-slate-400 whitespace-nowrap">
                                        {new Date(entry.time).toLocaleString([], {
                                            month: 'short', day: 'numeric',
                                            hour: '2-digit', minute: '2-digit',
                                        })}
                                    </span>
                                    <Badge variant="outline" className={`${KIND_STYLES[entry.kind] ?? ''} capitalize`}>
                                        {entry.kind.replaceAll('_', ' ')}
                                    </Badge>
                                </div>
                                <p className="text-sm text-slate-700 mt-0.5">{entry.description}</p>
                            </li>
                        ))}
                    </ol>
                )}
            </Card>
        </div>
    )
}
