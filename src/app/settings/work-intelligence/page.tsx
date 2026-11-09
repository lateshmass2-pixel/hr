import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { isRoleAtLeast } from '@/lib/rbac/types'
import Link from 'next/link'
import { Settings2 } from 'lucide-react'

// =============================================================================
// Settings → Work Intelligence — /settings/work-intelligence
// =============================================================================
// Admin configuration (spec §30): thresholds are stored in
// work_intelligence_settings (RBAC: hr+ via the settings write policy).
// This page renders the current configuration and the env-based feature
// states. Threshold editing is performed via the database row (server
// action) — kept read-only here to avoid a second write path diverging
// from the audited settings table.
// =============================================================================

export default async function WorkIntelligenceSettingsPage() {
    const session = await getSession()
    if (!session) redirect('/login')
    if (!isRoleAtLeast(session.role, 'hr')) {
        redirect('/dashboard/work-intelligence')
    }

    const supabase = await createClient()
    const { data: settings } = await supabase
        .from('work_intelligence_settings')
        .select('*')
        .eq('organization_id', session.organizationId)
        .maybeSingle()

    const thresholds = (settings?.anomaly_thresholds ?? {
        commit_burst_window_minutes: 15,
        commit_burst_threshold: 20,
        tiny_commit_threshold: 3,
        generated_file_ratio: 0.8,
    }) as Record<string, number>
    const enabledSources = (settings?.enabled_sources ?? {}) as Record<string, boolean>

    const featureStates = [
        {
            name: 'GitHub OAuth (account connection)',
            ready: Boolean(process.env.GITHUB_CLIENT_ID),
            env: 'GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET',
        },
        {
            name: 'Webhook ingestion',
            ready: Boolean(process.env.GITHUB_WEBHOOK_SECRET),
            env: 'GITHUB_WEBHOOK_SECRET',
        },
        {
            name: 'Token encryption at rest',
            ready: Boolean(process.env.ENCRYPTION_KEY),
            env: 'ENCRYPTION_KEY',
        },
        {
            name: 'AI summaries (Groq)',
            ready: Boolean(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY),
            env: 'GROQ_API_KEY',
        },
        {
            name: 'Scheduled sync (cron)',
            ready: Boolean(process.env.CRON_SECRET),
            env: 'CRON_SECRET',
        },
    ]

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#0a3b2a] flex items-center gap-2">
                    <Settings2 className="h-6 w-6" /> Work Intelligence Settings
                </h1>
                <p className="text-sm text-[#14532d]/70">
                    Organization-level configuration for evidence collection, anomaly rules and
                    AI analysis. Historical evidence is append-only and can never be edited
                    here — by design.
                </p>
            </div>

            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] mb-3">Anomaly Thresholds</h2>
                {!settings ? (
                    <p className="text-sm text-slate-500">
                        No settings row yet — defaults are in effect. A row is created on
                        first write. Defaults shown below.
                    </p>
                ) : null}
                <ul className="space-y-2 text-sm">
                    <li className="flex items-center justify-between border-b border-slate-50 pb-2">
                        <span className="text-slate-600">Commit burst window</span>
                        <Badge variant="secondary">{thresholds.commit_burst_window_minutes} minutes</Badge>
                    </li>
                    <li className="flex items-center justify-between border-b border-slate-50 pb-2">
                        <span className="text-slate-600">Commit burst threshold</span>
                        <Badge variant="secondary">{thresholds.commit_burst_threshold} commits</Badge>
                    </li>
                    <li className="flex items-center justify-between border-b border-slate-50 pb-2">
                        <span className="text-slate-600">Tiny commit threshold</span>
                        <Badge variant="secondary">≤ {thresholds.tiny_commit_threshold} lines</Badge>
                    </li>
                    <li className="flex items-center justify-between">
                        <span className="text-slate-600">Generated-file ratio</span>
                        <Badge variant="secondary">{thresholds.generated_file_ratio}</Badge>
                    </li>
                </ul>
                <p className="text-xs text-slate-400 mt-3">
                    Thresholds live in <code>work_intelligence_settings.anomaly_thresholds</code>
                    {' '}(JSONB) and can be updated by hr+ roles via the database policy
                    {' '}<code>wi_settings_write</code>.
                </p>
            </Card>

            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] mb-3">Feature Readiness</h2>
                <ul className="space-y-2 text-sm">
                    {featureStates.map((f) => (
                        <li key={f.name} className="flex items-center justify-between gap-3">
                            <span className="text-slate-600">{f.name}</span>
                            <span className="flex items-center gap-2">
                                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{f.env}</code>
                                <Badge variant="outline" className={f.ready ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}>
                                    {f.ready ? 'configured' : 'not configured'}
                                </Badge>
                            </span>
                        </li>
                    ))}
                </ul>
                <p className="text-xs text-slate-400 mt-3">
                    Unconfigured features degrade gracefully: OAuth fails closed with a clear
                    error; webhooks are rejected; token-backed sync switches to webhook-only
                    mode; AI summaries fall back to a deterministic text builder.
                </p>
            </Card>

            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] mb-3">Evidence Sources</h2>
                <ul className="flex flex-wrap gap-2 text-sm">
                    {Object.entries({ github: true, tasks: true, ci: true, reviews: true, ...enabledSources }).map(([k, v]) => (
                        <li key={k}>
                            <Badge variant={v ? 'default' : 'secondary'}>{k}: {v ? 'enabled' : 'disabled'}</Badge>
                        </li>
                    ))}
                </ul>
                <p className="text-xs text-slate-400 mt-3">
                    AI analysis: {settings?.ai_analysis_enabled ? 'enabled' : 'disabled'} ·
                    Task auto-correlation: {settings?.auto_correlate_tasks ? 'enabled' : 'disabled'} ·
                    Retention: {settings?.retention_days ?? 365} days
                </p>
            </Card>

            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] mb-2">Related</h2>
                <ul className="space-y-1 text-sm">
                    <li>
                        <Link href="/settings/integrations/github" className="text-blue-700 hover:underline">
                            GitHub accounts & repositories →
                        </Link>
                    </li>
                    <li>
                        <Link href="/dashboard/work-intelligence/anomalies" className="text-blue-700 hover:underline">
                            Anomaly review board →
                        </Link>
                    </li>
                </ul>
                <p className="text-xs text-slate-400 mt-3">
                    Role permissions follow the existing HEMS RBAC matrix: employees see their
                    own evidence; managers see their organization; hr+ manage integrations and
                    review anomalies; raw webhook payloads (git_events) are manager+ only.
                </p>
            </Card>
        </div>
    )
}
