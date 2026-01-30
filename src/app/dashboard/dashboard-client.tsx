'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
    Users, TrendingUp, Calendar, ArrowRight, Plus,
    GraduationCap, Video, UserCheck, AlertCircle, FileText,
    ChevronDown, Megaphone, Bell, ClipboardList, Sun, Sunset,
    CheckCircle, Briefcase, FolderKanban
} from 'lucide-react'
import { format, subDays, isAfter, startOfMonth } from 'date-fns'
import { ApprovalActions } from './leave/approval-actions'
import { useHems } from '@/context/HemsContext'
import { GradientStatCard, SoftCard } from '@/components/ui/gradient-stat-card'
import { DonutChartCard } from '@/components/ui/dashboard-charts'
import { cn } from '@/lib/utils'

interface DashboardClientProps {
    pendingTasks: number
    teamMembers: number
    employees: any[]
    applicationsData: any[]
    pendingLeaveRequests: any[]
    userName: string
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

function getTimeBasedGreeting(): { greeting: string; icon: React.ReactNode } {
    const hour = new Date().getHours()
    if (hour < 12) return { greeting: 'Good Morning', icon: <Sun className="w-5 h-5" /> }
    if (hour < 17) return { greeting: 'Good Afternoon', icon: <Sun className="w-5 h-5" /> }
    return { greeting: 'Good Evening', icon: <Sunset className="w-5 h-5" /> }
}

const avatarColors = [
    '#FB923C', '#14B8A6', '#F59E0B', '#EC4899', '#8B5CF6', '#10B981'
]

export default function DashboardClient({
    pendingTasks,
    teamMembers,
    employees,
    applicationsData,
    pendingLeaveRequests,
    userName
}: DashboardClientProps) {
    const router = useRouter()
    const { announcements, projects } = useHems()
    const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false)

    const { greeting, icon: greetingIcon } = getTimeBasedGreeting()

    // Derived Data - Using REAL data only
    const funnelCounts = {
        applied: applicationsData.length,
        screening: applicationsData.filter(a => a.status === 'screening' || a.status === 'TEST_PENDING').length,
        interview: applicationsData.filter(a => a.status === 'interview' || a.status === 'INTERVIEW').length,
        offer: applicationsData.filter(a => a.status === 'offer').length,
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

    const thirtyDaysAgo = subDays(new Date(), 30)
    const recentHires = employees.filter(e => e.created_at && isAfter(new Date(e.created_at), thirtyDaysAgo))
    const onboardingCount = recentHires.length

    // Real interview candidates from applications data
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

    return (
        <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* ═══════════════════════════════════════════════════════════
                WELCOME HEADER
            ═══════════════════════════════════════════════════════════ */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        {greeting}, {userName} 👋
                    </h1>
                    <p className="text-gray-500 mt-1">
                        You have <span className="text-orange-600 font-semibold">{pendingTasks} pending tasks</span> to review
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="relative">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                        className="pill-button-primary flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Quick Actions
                        <ChevronDown size={14} className={`transition-transform ${isQuickActionsOpen ? 'rotate-180' : ''}`} />
                    </motion.button>

                    <AnimatePresence>
                        {isQuickActionsOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-hover py-2 z-50"
                            >
                                {[
                                    { icon: Briefcase, label: 'Post Job', href: '/dashboard/hiring' },
                                    { icon: Users, label: 'Add Employee', href: '/dashboard/team' },
                                    { icon: ClipboardList, label: 'New Project', href: '/dashboard/projects' },
                                ].map(({ icon: Icon, label, href }) => (
                                    <button
                                        key={label}
                                        onClick={() => { router.push(href); setIsQuickActionsOpen(false) }}
                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center gap-3"
                                    >
                                        <Icon size={16} /> {label}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* ═══════════════════════════════════════════════════════════
                GRADIENT STATS ROW - Real Data
            ═══════════════════════════════════════════════════════════ */}
            {/* <motion.div
                variants={containerVariants}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            >
                <motion.div variants={itemVariants}>
                    <Link href="/dashboard/team">
                        <GradientStatCard
                            title="Total Employees"
                            value={teamMembers}
                            trend={newEmployeesThisMonth > 0 ? `+${newEmployeesThisMonth} this month` : undefined}
                            trendDirection="up"
                            icon={<Users size={20} />}
                            variant="pink"
                        />
                    </Link>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Link href="/dashboard/hiring">
                        <GradientStatCard
                            title="Hiring Pipeline"
                            value={applicationsData.length}
                            trend={funnelCounts.interview > 0 ? `${funnelCounts.interview} in interview` : undefined}
                            icon={<UserCheck size={20} />}
                            variant="peach"
                        />
                    </Link>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Link href="/dashboard/hired">
                        <GradientStatCard
                            title="New Hires"
                            value={onboardingCount}
                            subtitle="Last 30 days"
                            icon={<GraduationCap size={20} />}
                            variant="blue"
                        />
                    </Link>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Link href="/dashboard/projects">
                        <GradientStatCard
                            title="Active Projects"
                            value={activeProjects}
                            subtitle={`${projects.length} total`}
                            icon={<FolderKanban size={20} />}
                            variant="mint"
                        />
                    </Link>
                </motion.div>
            </motion.div> */}

            {/* ═══════════════════════════════════════════════════════════
                CHARTS ROW - Real Data
            ═══════════════════════════════════════════════════════════ */}
            <motion.div
                variants={itemVariants}
                className="grid grid-cols-1 lg:grid-cols-3 gap-5"
            >
                {/* Interview Candidates - Real Data */}
                <SoftCard className="lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                        <Video size={18} className="text-purple-500" />
                        Interview Candidates
                    </h3>

                    {interviewCandidates.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {interviewCandidates.map((candidate) => (
                                <div key={candidate.id} className="text-center">
                                    <div
                                        className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-lg shadow-lg"
                                        style={{ background: candidate.color }}
                                    >
                                        {candidate.initials}
                                    </div>
                                    <p className="mt-2 font-semibold text-gray-900 text-sm truncate">{candidate.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{candidate.role}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Video className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">No candidates in interview stage</p>
                        </div>
                    )}
                </SoftCard>

                <DonutChartCard
                    title="Hiring Funnel"
                    data={hiringFunnelData}
                />
            </motion.div>

            {/* ═══════════════════════════════════════════════════════════
                ACTION CENTER - Real Data
            ═══════════════════════════════════════════════════════════ */}
            <motion.div
                variants={itemVariants}
                className="grid grid-cols-1 lg:grid-cols-2 gap-5"
            >
                {/* Pending Actions */}
                <SoftCard>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                        <AlertCircle size={18} className="text-rose-500" />
                        Requires Action
                    </h3>

                    <div className="space-y-3">
                        {/* Real Pending Offer */}
                        {pendingOffer && (
                            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                                    <FileText size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 text-sm truncate">
                                        Offer: {pendingOffer.candidate_name || 'Candidate'}
                                    </h4>
                                    <p className="text-xs text-gray-500">{pendingOffer.offer_role || pendingOffer.position}</p>
                                </div>
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                                    Pending
                                </span>
                            </div>
                        )}

                        {/* Real Leave Requests */}
                        {pendingLeaveRequests.length > 0 ? (
                            pendingLeaveRequests.slice(0, 3).map((request: any, i: number) => (
                                <div key={request.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                        style={{ background: avatarColors[i % avatarColors.length] }}
                                    >
                                        {(request.profile?.full_name || 'U').charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-900 text-sm truncate">
                                            {request.profile?.full_name} • {request.type}
                                        </h4>
                                        <p className="text-xs text-gray-500">
                                            {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d')}
                                        </p>
                                    </div>
                                    <ApprovalActions requestId={request.id} />
                                </div>
                            ))
                        ) : !pendingOffer ? (
                            <div className="text-center py-8">
                                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">All caught up! No pending actions.</p>
                            </div>
                        ) : null}
                    </div>
                </SoftCard>

                {/* Recent Employees */}
                <SoftCard>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Users size={18} className="text-orange-500" />
                            Recent Employees
                        </h3>
                        <Link href="/dashboard/team" className="text-sm text-orange-600 font-medium flex items-center gap-1 hover:gap-2 transition-all">
                            View all <ArrowRight size={14} />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {employees.slice(0, 4).map((emp: any, i: number) => (
                            <div key={emp.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                    style={{ background: avatarColors[i % avatarColors.length] }}
                                >
                                    {emp.full_name?.substring(0, 2).toUpperCase() || '??'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 text-sm truncate">{emp.full_name}</h4>
                                    <p className="text-xs text-gray-500 truncate">{emp.position || emp.department}</p>
                                </div>
                                <span className="text-xs text-gray-400">
                                    {emp.created_at ? format(new Date(emp.created_at), 'MMM d') : ''}
                                </span>
                            </div>
                        ))}

                        {employees.length === 0 && (
                            <div className="text-center py-6">
                                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">No employees yet</p>
                            </div>
                        )}
                    </div>
                </SoftCard>
            </motion.div>

            {/* ═══════════════════════════════════════════════════════════
                ANNOUNCEMENTS - Real Data
            ═══════════════════════════════════════════════════════════ */}
            <motion.div variants={itemVariants}>
                <SoftCard>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Megaphone size={18} className="text-orange-500" />
                            Announcements
                        </h3>
                        <Link href="/dashboard/announcements" className="text-sm text-orange-600 font-medium flex items-center gap-1 hover:gap-2 transition-all">
                            View all <ArrowRight size={14} />
                        </Link>
                    </div>

                    {announcements.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {announcements.slice(0, 3).map((announcement, index) => (
                                <motion.div
                                    key={announcement.id}
                                    whileHover={{ y: -2 }}
                                    className={cn(
                                        "p-4 rounded-2xl cursor-pointer transition-colors",
                                        index === 0 ? 'gradient-pink' :
                                            index === 1 ? 'gradient-blue' : 'gradient-mint'
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-gray-600 bg-white/60 px-2 py-0.5 rounded-full">
                                            {announcement.priority}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {format(new Date(announcement.date), 'MMM d')}
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
                                        {announcement.title}
                                    </h4>
                                    <p className="text-xs text-gray-600 line-clamp-2">
                                        {announcement.content}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">No announcements yet</p>
                        </div>
                    )}
                </SoftCard>
            </motion.div>
        </motion.div>
    )
}
