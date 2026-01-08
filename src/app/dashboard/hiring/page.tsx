import { createClient } from "@/lib/supabase/server"
import { UploadDialog } from "./upload-dialog"
import { DeleteApplicationButton } from "./delete-button"
import { ScheduleInterviewDialog } from "./schedule-interview-dialog"
import { DecisionFooter } from "./decision-footer"
import { CreateJobDialog } from "./create-job-dialog"
import { Badge } from "@/components/ui/badge"
import { Search, ExternalLink, Mail, CheckCircle2, Eye } from "lucide-react"
import Link from "next/link"
import { extractSkills } from "@/utils/skill-extractor"

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

    // Filter out hired candidates - they have their own page
    const activeCandidates = applications.filter(a => a.status !== 'HIRED')
    const totalCandidates = activeCandidates.length

    // Group applications by status (excluding HIRED)
    const columns = {
        'TEST_PENDING': activeCandidates.filter(a => a.status === 'TEST_PENDING'),
        'INTERVIEW': activeCandidates.filter(a => a.status === 'INTERVIEW'),
        'REJECTED': activeCandidates.filter(a => a.status === 'REJECTED'),
        'NEW': activeCandidates.filter(a => a.status === 'NEW'),
    }

    return (
        <div className="h-full flex flex-col">
            {/* Control Bar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Hiring Pipeline</h2>
                    <Badge className="bg-orange-50 text-orange-700 border border-orange-200 font-medium">
                        {totalCandidates} Candidates
                    </Badge>
                </div>
                <div className="flex items-center gap-3">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search candidates..."
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all w-64 placeholder-gray-400"
                        />
                    </div>
                    <CreateJobDialog />
                    <UploadDialog />
                </div>
            </div>

            {/* Board - Column Trays */}
            <div className="flex gap-6 flex-1 overflow-x-auto pb-4">
                {/* Screening Column */}
                <StatusColumn title="Screening" count={columns['TEST_PENDING'].length}>
                    {columns['TEST_PENDING'].map(app => (
                        <CandidateCard key={app.id} app={app} showScheduleButton />
                    ))}
                </StatusColumn>

                {/* Interview Column */}
                <StatusColumn title="Interview" count={columns['INTERVIEW'].length}>
                    {columns['INTERVIEW'].map(app => (
                        <CandidateCard key={app.id} app={app} showDecisionButtons />
                    ))}
                </StatusColumn>

                {/* Rejected Column */}
                <StatusColumn title="Rejected" count={columns['REJECTED'].length}>
                    {columns['REJECTED'].map(app => (
                        <CandidateCard key={app.id} app={app} />
                    ))}
                </StatusColumn>

                {/* Unprocessed Column (conditional) */}
                {columns['NEW'].length > 0 && (
                    <StatusColumn title="Unprocessed" count={columns['NEW'].length}>
                        {columns['NEW'].map(app => (
                            <CandidateCard key={app.id} app={app} />
                        ))}
                    </StatusColumn>
                )}
            </div>
        </div>
    )
}

function StatusColumn({ title, count, children }: { title: string, count: number, children: React.ReactNode }) {
    const isEmpty = count === 0

    return (
        <div className="flex-1 min-w-[300px] flex flex-col gap-3 h-full max-h-[calc(100vh-240px)]">
            {/* Column Header */}
            <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 tracking-wider uppercase">{title}</h3>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                    {count}
                </span>
            </div>

            {/* Scrollable Card Area */}
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 bg-gray-100/50 rounded-xl p-3">
                {isEmpty ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl h-32 flex items-center justify-center text-gray-400 text-xs">
                        No candidates
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    )
}

function CandidateCard({ app, showScheduleButton, showDecisionButtons, isHired }: { app: any, showScheduleButton?: boolean, showDecisionButtons?: boolean, isHired?: boolean }) {
    const score = app.test_score ?? app.score
    const hasScore = score !== null && score !== undefined
    const isHighScore = score >= 70

    // Get initials for avatar
    const initials = app.candidate_name
        ? app.candidate_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        : '??'

    // Extract skills from AI reasoning (mock - you can enhance this)
    // Extract real skills from resume text and AI reasoning
    const resumeContent = [
        app.resume_text || '',
        app.ai_reasoning || '',
        app.raw_text || '',
        app.offer_role || ''
    ].join(' ');
    const skills = extractSkills(resumeContent, 4);

    return (
        <div className={`group bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-200 transition-all duration-300 cursor-grab ${isHired
            ? 'border-orange-300 bg-orange-50/50'
            : ''
            }`}>

            {/* Top Row: Avatar + Name + Hired Icon */}
            <div className="flex items-start gap-3 mb-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {initials}
                </div>

                {/* Name + Score */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        {isHired && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        )}
                        <h4 className="font-semibold text-gray-900 text-sm truncate" title={app.candidate_name}>
                            {app.candidate_name || "Unknown"}
                        </h4>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">
                        {app.offer_role || "Software Engineer"}
                    </p>
                </div>
            </div>

            {/* Score Progress Bar */}
            {hasScore && (
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">AI Match Score</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isHighScore
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-orange-100 text-orange-700'}`}>
                            {score}%
                        </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${isHighScore ? 'bg-emerald-500' : 'bg-orange-500'}`}
                            style={{ width: `${score}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Skill Tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
                {skills.map((skill, i) => (
                    <span key={i} className="bg-orange-50 text-orange-700 text-[10px] px-2 py-1 rounded font-medium">
                        {skill}
                    </span>
                ))}
            </div>

            {/* Footer: Email + Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 truncate flex-1">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{app.candidate_email}</span>
                </div>

                {/* Hover Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {app.status === 'TEST_PENDING' && (
                        <Link href={`/assessment/${app.id}`} target="_blank">
                            <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900" title="View Test">
                                <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                        </Link>
                    )}
                    {showScheduleButton && app.test_score !== null && app.test_score >= 70 && (
                        <ScheduleInterviewDialog application={{
                            id: app.id,
                            candidate_name: app.candidate_name,
                            candidate_email: app.candidate_email,
                            offer_role: app.offer_role
                        }} />
                    )}
                    {app.resume_url && (
                        <Link href={app.resume_url} target="_blank">
                            <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-900" title="View Resume">
                                <Eye className="h-3.5 w-3.5" />
                            </button>
                        </Link>
                    )}
                    {(app.status === 'TEST_PENDING' || app.status === 'REJECTED' || app.status === 'NEW') && (
                        <DeleteApplicationButton
                            applicationId={app.id}
                            candidateName={app.candidate_name || 'Unknown'}
                        />
                    )}
                </div>
            </div>

            {/* Decision Footer for Interview candidates */}
            {showDecisionButtons && (
                <DecisionFooter application={{
                    id: app.id,
                    candidate_name: app.candidate_name,
                    candidate_email: app.candidate_email,
                    offer_role: app.offer_role
                }} />
            )}
        </div>
    )
}
