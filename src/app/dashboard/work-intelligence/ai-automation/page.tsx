import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WorkIntelligenceNav } from '../nav'
import { Sparkles, Bot } from 'lucide-react'

// =============================================================================
// AI & Automation — /dashboard/work-intelligence/ai-automation
// =============================================================================
// Explicitly-detected AI-agent and bot/automation activity (spec §18 §8-9).
// Only provenance-backed detections are shown; nothing is inferred from
// code style.
// =============================================================================

export default async function AiAutomationPage() {
    const session = await getSession()
    if (!session) redirect('/login')

    const supabase = await createClient()

    const [{ data: agentEvents }, { data: automationEvents }] = await Promise.all([
        supabase
            .from('agent_events')
            .select(`
                id, agent_type, agent_name, detection_basis, confidence, created_at,
                commit_id, pull_request_id,
                git_commits ( sha, message )
            `)
            .eq('organization_id', session.organizationId)
            .order('created_at', { ascending: false })
            .limit(50),
        supabase
            .from('automation_events')
            .select(`
                id, bot_type, bot_name, automation_source, source_kind, created_at,
                commit_id, push_event_id, pull_request_id
            `)
            .eq('organization_id', session.organizationId)
            .order('created_at', { ascending: false })
            .limit(50),
    ])

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-[#0a3b2a] flex items-center gap-2">
                    <Sparkles className="h-6 w-6" /> AI & Automation
                </h1>
                <WorkIntelligenceNav />
            </div>

            <p className="text-sm text-[#14532d]/70 -mt-2">
                HEMS records AI/automation involvement only when GitHub metadata explicitly
                shows it — co-author trailers (e.g. Claude Code, Copilot), GitHub App
                identities, or bot accounts. AI-assisted development is legitimate and is
                never treated as fraud. Nothing here is inferred from how the code looks.
            </p>

            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-blue-600" /> AI Agent Activity
                </h2>
                {!agentEvents || agentEvents.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4">
                        No AI-agent provenance detected in recent activity. This does not mean
                        AI was or was not used — only that no explicit provenance (co-author
                        trailer / app identity) was present.
                    </p>
                ) : (
                    <ul className="divide-y divide-slate-50">
                        {(agentEvents as Array<{
                            id: string
                            agent_type: string
                            agent_name: string | null
                            detection_basis: string
                            confidence: string
                            created_at: string
                            git_commits: { sha: string; message: string } | { sha: string; message: string }[] | null
                        }>).map((e) => {
                            const commit = Array.isArray(e.git_commits)
                                ? e.git_commits[0]
                                : e.git_commits
                            return (
                                <li key={e.id} className="py-2 flex items-center gap-3 flex-wrap text-sm">
                                    <Badge variant="outline" className="bg-blue-50 text-blue-800">
                                        {e.agent_name ?? e.agent_type}
                                    </Badge>
                                    <Badge variant="secondary">{e.agent_type}</Badge>
                                    <span className="text-xs text-slate-500">
                                        basis: {e.detection_basis.replaceAll('_', ' ')} · confidence: {e.confidence}
                                    </span>
                                    {commit && (
                                        <span className="text-xs text-slate-400 font-mono">
                                            {commit.sha.slice(0, 7)} — {commit.message.split('\n')[0].slice(0, 70)}
                                        </span>
                                    )}
                                    <span className="text-xs text-slate-400 ml-auto">
                                        {new Date(e.created_at).toLocaleString()}
                                    </span>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </Card>

            <Card className="p-6">
                <h2 className="text-lg font-semibold text-[#14532d] flex items-center gap-2 mb-3">
                    <Bot className="h-5 w-5 text-slate-600" /> Bots & Automation
                </h2>
                {!automationEvents || automationEvents.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4">No bot activity recorded yet.</p>
                ) : (
                    <ul className="divide-y divide-slate-50">
                        {(automationEvents as Array<{
                            id: string
                            bot_type: string
                            bot_name: string
                            automation_source: string | null
                            source_kind: string
                            created_at: string
                        }>).map((e) => (
                            <li key={e.id} className="py-2 flex items-center gap-3 flex-wrap text-sm">
                                <Badge variant="secondary">{e.bot_type}</Badge>
                                <span className="font-medium text-[#0a3b2a]">{e.bot_name}</span>
                                <span className="text-xs text-slate-500">on {e.source_kind}</span>
                                <span className="text-xs text-slate-400 ml-auto">
                                    {new Date(e.created_at).toLocaleString()}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    )
}
