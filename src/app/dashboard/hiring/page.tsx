import { createClient } from "@/lib/supabase/server"
import { UploadDialog } from "./upload-dialog"
import { CreateJobDialog } from "./create-job-dialog"
import { HiringInbox } from "./hiring-inbox"
import { Users, Sparkles, Search, TrendingUp } from "lucide-react"
import { GradientStatCard, SoftCard } from "@/components/ui/gradient-stat-card"

export const dynamic = 'force-dynamic'

async function getApplications() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })
    return data || []
}

export default async function HiringDashboard() {
    const applications = await getApplications()
    const activeCandidates = applications.filter(a => a.status !== 'HIRED')

    const counts = {
        total: activeCandidates.length,
        screening: activeCandidates.filter(a => a.status === 'TEST_PENDING').length,
        interview: activeCandidates.filter(a => a.status === 'INTERVIEW').length,
        offer: activeCandidates.filter(a => a.status === 'offer').length,
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* ═══════════════════════════════════════════════════════════
                HEADER
            ═══════════════════════════════════════════════════════════ */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Hiring Pipeline</h1>
                    <p className="text-gray-500 mt-1">{counts.total} active candidates in the pipeline</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search candidates..."
                            className="search-input pl-11 w-64"
                        />
                    </div>

                    <CreateJobDialog />
                    <UploadDialog />
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                STATS ROW - Pipeline Overview
            ═══════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <GradientStatCard
                    title="Total Candidates"
                    value={counts.total}
                    icon={<Users size={18} />}
                    variant="pink"
                />
                <GradientStatCard
                    title="Screening"
                    value={counts.screening}
                    subtitle="Awaiting test"
                    variant="peach"
                />
                <GradientStatCard
                    title="Interview Stage"
                    value={counts.interview}
                    trend={counts.interview > 0 ? "Active" : undefined}
                    variant="blue"
                />
                <GradientStatCard
                    title="Offer Pending"
                    value={counts.offer}
                    variant="mint"
                />
            </div>

            {/* ═══════════════════════════════════════════════════════════
                HIRING INBOX - Tabbed List View
            ═══════════════════════════════════════════════════════════ */}
            <HiringInbox applications={activeCandidates} />
        </div>
    )
}
