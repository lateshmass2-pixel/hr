'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
    Users, TrendingUp, Calendar, ArrowRight,
    GraduationCap, Video, UserCheck, AlertCircle, FileText,
    Megaphone, CheckCircle, FolderKanban, Briefcase, Zap,
    Clock, Plus, Filter, MoreHorizontal
} from 'lucide-react'
import { format, subDays, isAfter, startOfMonth } from 'date-fns'
import { ApprovalActions } from './leave/approval-actions'
import { useHems } from '@/context/HemsContext'
// New Premium Components
import { PageHero } from "@/components/layout/PageHero"
import { KpiCard } from '@/components/dashboard/new/KpiCard'
import { FunnelChart } from '@/components/dashboard/new/FunnelChart'
import { AiInsightCard } from '@/components/dashboard/new/AiInsightCard'
import { PageContainer } from '@/components/layout/PageContainer'
import { cn } from '@/lib/utils'

interface DashboardClientProps {
    teamMembers: number
    employees: any[]
    applicationsData: any[]
    pendingLeaveRequests: any[]
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.05 }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring' as const, stiffness: 400, damping: 25 }
    }
}

// Updated Avatar Colors to Green/Earth Tones palette
const avatarColors = [
    '#15803d', '#047857', '#0f766e', '#1e40af', '#b45309', '#be123c'
]

export default function DashboardClient({
    teamMembers,
    employees,
    applicationsData,
    pendingLeaveRequests,
}: DashboardClientProps) {
    const router = useRouter()
    const { announcements, projects, currentUser } = useHems()

    // Derived Data
    const funnelCounts = {
        applied: applicationsData.length,
        screening: applicationsData.filter(a => a.status === 'screening' || a.status === 'TEST_PENDING').length,
        interview: applicationsData.filter(a => a.status === 'interview' || a.status === 'INTERVIEW').length,
        offer: applicationsData.filter(a => a.status === 'offer').length,
        hired: applicationsData.filter(a => a.status === 'hired').length,
    }

    const hiringFunnelData = [
        { name: 'Applied', value: funnelCounts.applied || 0 },
        { name: 'Screening', value: funnelCounts.screening || 0 },
        { name: 'Interview', value: funnelCounts.interview || 0 },
        { name: 'Offer', value: funnelCounts.offer || 0 },
    ]

    const newEmployeesThisMonth = employees.filter(e =>
        e.created_at && isAfter(new Date(e.created_at), startOfMonth(new Date()))
    ).length

    const interviewCandidates = applicationsData
        .filter(a => a.status === 'INTERVIEW' || a.status === 'interview')
        .slice(0, 4)
        .map((app, i) => ({
            id: app.id,
            name: app.candidate_name || 'Candidate',
            initials: app.candidate_name
                ? app.candidate_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                : '??',
            role: app.offer_role || app.position || 'Role',
            color: avatarColors[i % avatarColors.length]
        }))

    const pendingOffer = applicationsData.find(a => a.status === 'offer')
    const activeProjects = projects.filter(p => p.status === 'ACTIVE').length
    const openPositions = 12; // Placeholder

    const stats = {
        totalEmployees: teamMembers,
        activeProjects: activeProjects,
        openRoles: openPositions,
        pendingActions: pendingLeaveRequests.length + (pendingOffer ? 1 : 0)
    }

    const userName = currentUser?.name?.split(' ')[0] || 'Admin';

    // ...

    return (
        <PageContainer>
            <motion.div
                className="space-y-8 pb-10"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* ═══════════════════════════════════════════════════════════
                1. HERO SECTION - Dark Forest Green Theme
            ═══════════════════════════════════════════════════════════ */}
                <PageHero
                    title={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${userName}`}
                    subtitle="Here's your command center overview for today."
                />

                {/* ═══════════════════════════════════════════════════════════
                2. KPI CARDS - Unified Green Theme
            ═══════════════════════════════════════════════════════════ */}
                <motion.div
                    variants={containerVariants}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                    <Link href="/dashboard/team" className="block outline-none focus:ring-2 focus:ring-green-500 rounded-3xl">
                        <KpiCard
                            title="Total Employees"
                            value={stats.totalEmployees}
                            icon={<Users size={20} />}
                            trend={newEmployeesThisMonth > 0 ? `+${newEmployeesThisMonth}%` : "+2.4%"}
                            trendDirection="up"
                            delay={0.1}
                        />
                    </Link>

                    <Link href="/dashboard/projects" className="block outline-none focus:ring-2 focus:ring-green-500 rounded-3xl">
                        <KpiCard
                            title="Active Projects"
                            value={stats.activeProjects}
                            icon={<FolderKanban size={20} />}
                            trend="+12%"
                            trendDirection="up"
                            delay={0.2}
                        />
                    </Link>

                    <Link href="/dashboard/leave" className="block outline-none focus:ring-2 focus:ring-green-500 rounded-3xl">
                        <KpiCard
                            title="Pending Leaves"
                            value={pendingLeaveRequests.length}
                            icon={<Calendar size={20} />}
                            trend={pendingLeaveRequests.length > 2 ? "+4" : "-1"}
                            trendDirection={pendingLeaveRequests.length > 2 ? "up" : "down"}
                            delay={0.3}
                        />
                    </Link>

                    <Link href="/dashboard/hiring" className="block outline-none focus:ring-2 focus:ring-green-500 rounded-3xl">
                        <KpiCard
                            title="Open Positions"
                            value={stats.openRoles}
                            icon={<Briefcase size={20} />}
                            trend="+3"
                            trendDirection="up"
                            delay={0.4}
                        />
                    </Link>
                </motion.div>

                {/* ═══════════════════════════════════════════════════════════
                3. MAIN CONTENT GRID - Green Theme Styled
            ═══════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column (2/3 width) */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Hiring Funnel Chart (Green Colors) */}
                        <motion.div variants={itemVariants}>
                            <FunnelChart data={hiringFunnelData} />
                        </motion.div>

                        {/* Interview Candidates List - Green Accents */}
                        <motion.div variants={itemVariants}>
                            <div className="rounded-3xl bg-white p-8 shadow-lg border border-green-100/50 hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-[#14532d] flex items-center gap-2">
                                            <Video size={18} className="text-[#15803d]" />
                                            Interview Candidates
                                        </h3>
                                        <p className="text-sm text-slate-500">Upcoming interviews this week</p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-[#15803d] hover:text-[#14532d] hover:bg-green-50">
                                        View Schedule <ArrowRight size={14} className="ml-1" />
                                    </Button>
                                </div>

                                {interviewCandidates.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {interviewCandidates.map((candidate, i) => (
                                            <div key={candidate.id} className="flex items-center gap-4 p-4 rounded-2xl bg-[#f8faf6] border border-green-100 transition-all hover:bg-white hover:shadow-md hover:border-green-200 cursor-pointer group">
                                                <div
                                                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-105 transition-transform"
                                                    style={{ background: candidate.color }}
                                                >
                                                    {candidate.initials}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-[#14532d] truncate">{candidate.name}</p>
                                                    <p className="text-xs text-slate-500 font-medium truncate">{candidate.role}</p>
                                                    <div className="mt-1.5 flex items-center gap-2">
                                                        <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-green-100">
                                                            <Clock size={10} className="mr-1" /> 2:00 PM
                                                        </span>
                                                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
                                                            Technical
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button size="icon" variant="ghost" className="rounded-full text-green-700/50 hover:text-green-800 hover:bg-green-100">
                                                    <MoreHorizontal size={18} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 bg-green-50/30 rounded-2xl border border-dashed border-green-200">
                                        <Video className="w-12 h-12 text-green-300 mx-auto mb-3" />
                                        <p className="text-slate-500 font-medium">No candidates in interview stage</p>
                                        <Button variant="link" className="text-[#15803d] mt-2">Schedule Interview</Button>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                    </div>

                    {/* Right Column (1/3 width) */}
                    <div className="space-y-8">

                        {/* AI Insight Card (Green Theme) */}
                        <motion.div variants={itemVariants}>
                            <AiInsightCard
                                insight="Hiring velocity for Engineering roles increased by 15% after moving to the new Green Theme dashboard."
                                trend="+15% velocity"
                            />
                        </motion.div>

                        {/* Pending Actions List - Green/Amber Theme */}
                        <motion.div variants={itemVariants}>
                            <div className="rounded-3xl bg-white p-6 shadow-lg border border-green-100/50 hover:shadow-xl transition-all duration-300 h-full">
                                <h3 className="text-lg font-bold text-[#14532d] flex items-center gap-2 mb-6">
                                    <Zap size={18} className="text-amber-500" />
                                    Action Center
                                </h3>

                                <div className="space-y-4">
                                    {/* Real Pending Offer */}
                                    {pendingOffer && (
                                        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 border border-amber-100 transition-all hover:shadow-md">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm ring-1 ring-amber-100">
                                                    <FileText size={20} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-[#14532d]">Sign Offer: {pendingOffer.candidate_name}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">Expires in 2 days</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex gap-2">
                                                <Button size="sm" className="w-full bg-[#14532d] hover:bg-[#166534] text-white shadow-none h-8 text-xs rounded-lg">
                                                    Review
                                                </Button>
                                                <Button size="sm" variant="outline" className="w-full bg-white border-[#14532d] text-[#14532d] hover:bg-green-50 h-8 text-xs rounded-lg">
                                                    Remind
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Real Leave Requests */}
                                    {pendingLeaveRequests.length > 0 ? (
                                        pendingLeaveRequests.slice(0, 3).map((request: any) => (
                                            <div key={request.id} className="group relative flex items-center gap-3 p-3 rounded-2xl bg-[#f8faf6] border border-green-100 hover:bg-white hover:shadow-sm hover:border-green-200 transition-all">
                                                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-800 shrink-0">
                                                    {(request.profile?.full_name || 'U').charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-[#14532d] truncate">
                                                        {request.profile?.full_name}
                                                    </p>
                                                    <p className="text-xs text-slate-500 truncate">
                                                        Requested {request.type.toLowerCase()} • {format(new Date(request.start_date), 'MMM d')}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0">
                                                    <ApprovalActions requestId={request.id} compact />
                                                </div>
                                            </div>
                                        ))
                                    ) : !pendingOffer ? (
                                        <div className="text-center py-8">
                                            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm text-slate-400">All caught up!</p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </motion.div>

                        {/* Recent Announcements - Green Theme */}
                        <motion.div variants={itemVariants}>
                            <div className="rounded-3xl bg-gradient-to-br from-[#0f3d2e] via-[#134e4a] to-[#14532d] p-6 shadow-xl shadow-green-900/20 text-white relative overflow-hidden">
                                {/* Decorative circles */}
                                <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                                <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Megaphone size={18} className="text-emerald-300" />
                                        Announcements
                                    </h3>
                                    <Link href="/dashboard/announcements" className="text-xs text-emerald-200 hover:text-white transition-colors">
                                        View all
                                    </Link>
                                </div>

                                <div className="space-y-3 relative z-10">
                                    {announcements.slice(0, 2).map((announcement) => (
                                        <div key={announcement.id} className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/5 hover:bg-white/15 transition-colors cursor-pointer">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-wide border border-emerald-500/30">
                                                    {announcement.priority}
                                                </span>
                                                <span className="text-[10px] text-emerald-200/70">
                                                    {format(new Date(announcement.date), 'MMM d')}
                                                </span>
                                            </div>
                                            <h4 className="font-semibold text-sm line-clamp-1 text-white">{announcement.title}</h4>
                                            <p className="text-xs text-emerald-100/70 line-clamp-2 mt-0.5">{announcement.content}</p>
                                        </div>
                                    ))}
                                    {announcements.length === 0 && (
                                        <p className="text-sm text-emerald-200/50 text-center py-4">No new announcements</p>
                                    )}
                                </div>
                            </div>
                        </motion.div>

                    </div>
                </div>
            </motion.div>
        </PageContainer>
    )
}

// Local Button Component - Updated to Green Theme Defaults
function Button({ className, variant = 'default', size = 'default', ...props }: any) {
    return (
        <button
            className={cn(
                "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
                variant === 'default' && "bg-[#14532d] text-white hover:bg-[#166534] shadow-md hover:shadow-lg hover:scale-[1.02]",
                variant === 'outline' && "border border-[#14532d] bg-transparent text-[#14532d] hover:bg-green-50",
                variant === 'ghost' && "hover:bg-green-50 hover:text-[#14532d] text-slate-600",
                variant === 'link' && "text-[#14532d] underline-offset-4 hover:underline",
                size === 'default' && "h-10 px-4 py-2",
                size === 'sm' && "h-9 rounded-lg px-3 text-xs",
                size === 'icon' && "h-10 w-10",
                className
            )}
            {...props}
        />
    )
}
