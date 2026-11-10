import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WorkIntelligenceNav } from '../nav'
import { AlertTriangle } from 'lucide-react'
import { isRoleAtLeast } from '@/lib/rbac/types'

// =============================================================================
// Anomalies — /dashboard/work-intelligence/anomalies
// =============================================================================
// Transparent anomaly list (spec §15): each row shows rule, evidence and the
// neutral explanation. UNUSUAL/REVIEW_REQUIRED are review signals, NOT
// misconduct findings.
// =============================================================================

const STATUS_STYLES: Record<string, string> = {
    NORMAL: 'bg-slate-100 text-slate-600',
    UNUSUAL: 'bg-amber-100 text-amber-800',
    REVIEW_REQUIRED: 'bg-orange-100 text-orange-800',
    INSUFFICIENT_EVIDENCE: 'bg-gray-100 text-gray-600',
}

export default async function AnomaliesPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const supabase = await createClient()
    const isManager = isRoleAtLeast(session.role, 'manager')
    if (!isManager) redirect('/dashboard/work-intelligence/git-activity')

    let query = supabase
        .from('activity_anomalies')
        .select(`
            id, employee_id, severity, rule_code, reason, explanation,
            evidence, status, detected_at,
            org_employees ( full_name )
        `)
        .eq('organization_id', session.organizationId)
        .order('detected_at', { ascending: false })
        .limit(50)

    if (!isManager) {
        const { data: myEmployee } = await supabase
            .from('org_employees')
            .select('id')
            .eq('organization_id', session.organizationId)
            .eq('user_id', session.userId)
            .maybeSingle()
        query = myEmployee
            ? query.eq('employee_id', myEmployee.id)
            : query.eq('employee_id', '00000000-0000-0000-0000-000000000000')
    }

    const { data: anomalies } = await query

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-[#0a3b2a] flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6" /> Anomalies
                </h1>
                <WorkIntelligenceNav />
            </div>

            <p className="text-sm text-[#14532d]/70 -mt-2">
                Anomalies are statistical patterns worth a look — bursts, tiny-commit ratios,
                generated-only changes, baseline deviations. They are explicitly NOT proof of
                misconduct. Every entry lists the rule, the evidence, and a neutral
                explanation.
            </p>

            <Card className="p-6">
                {!anomalies || anomalies.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4">
                        No anomalies recorded. This means no rule triggered — not that work was
                        &ldquo;perfect&rdquo;.
                    </p>
                ) : (
                    <ul className="divide-y divide-slate-50">
                        {(anomalies as Array<{
                            id: string
                            employee_id: string | null
                            severity: string
                            rule_code: string
                            reason: string
                            explanation: string
                            evidence: unknown
                            status: string
                            detected_at: string
                            org_employees: { full_name: string } | { full_name: string }[] | null
                        }>).map((a) => {
                            const name = a.employee_id
                                ? (Array.isArray(a.org_employees)
                                    ? a.org_employees[0]?.full_name ?? 'Unknown'
                                    : a.org_employees?.full_name ?? 'Unknown')
                                : 'Unattributed'
                            const evidence = Array.isArray(a.evidence)
                                ? (a.evidence as string[])
                                : []
                            return (
                                <li key={a.id} className="py-3 space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-[#0a3b2a]">{name}</span>
                                        <Badge variant="outline" className={STATUS_STYLES[a.severity] ?? ''}>
                                            {a.severity.replaceAll('_', ' ')}
                                        </Badge>
                                        <Badge variant="secondary">{a.rule_code}</Badge>
                                        <span className="text-xs text-slate-400">
                                            {new Date(a.detected_at).toLocaleString()} · status: {a.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700">{a.reason}</p>
                                    <p className="text-sm text-slate-600">{a.explanation}</p>
                                    {evidence.length > 0 && (
                                        <details className="text-xs text-slate-500">
                                            <summary className="cursor-pointer select-none">Evidence ({evidence.length})</summary>
                                            <ul className="mt-1 space-y-0.5 list-disc list-inside">
                                                {evidence.slice(0, 15).map((ev, i) => (
                                                    <li key={i}>{ev}</li>
                                                ))}
                                            </ul>
                                        </details>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                )}
            </Card>
        </div>
    )
}
