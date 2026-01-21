'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
    Briefcase, Users, TrendingUp, Calendar, ArrowRight,
    CheckCircle, XCircle, Clock, Plus, GraduationCap, Video,
    UserCheck, AlertCircle, FileText, ChevronDown, MoreHorizontal,
    Megaphone, Bell, ClipboardList, Sparkles, Sun, Moon, Sunset
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { format, subDays, isAfter, startOfMonth } from 'date-fns'
import { ApprovalActions } from './leave/approval-actions'
import { useHems } from '@/context/HemsContext'
import { ProStatCard } from '@/components/ui/pro-stat-card'

interface DashboardClientProps {
    pendingTasks: number
    teamMembers: number
    employees: any[]
    applicationsData: any[]
    pendingLeaveRequests: any[]
    userName: string
}

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
    }
}

// Get time-based greeting
function getTimeBasedGreeting(): { greeting: string; icon: React.ReactNode; gradient: string } {
    const hour = new Date().getHours()
    if (hour < 12) {
        return {
            greeting: 'Good Morning',
            icon: <Sun className="w-6 h-6" />,
            gradient: 'from-amber-500/20 via-orange-400/10 to-yellow-300/5'
        }
    } else if (hour < 17) {
        return {
            greeting: 'Good Afternoon',
            icon: <Sun className="w-6 h-6" />,
            gradient: 'from-blue-500/15 via-cyan-400/10 to-sky-300/5'
        }
    } else {
        return {
            greeting: 'Good Evening',
            icon: <Sunset className="w-6 h-6" />,
            gradient: 'from-purple-500/20 via-indigo-400/10 to-violet-300/5'
        }
    }
}

export default function DashboardClient({
    pendingTasks,
    teamMembers,
    employees,
    applicationsData,
    pendingLeaveRequests,
    userName
}: DashboardClientProps) {
    const router = useRouter()
    const { announcements } = useHems()
    const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false)

    // Time-based greeting
    const { greeting, icon: greetingIcon, gradient: greetingGradient } = getTimeBasedGreeting()

    // Derived Real Data
    // ------------------------------------------------------------------

    // 1. Hiring Funnel
    const funnelCounts = {
        applied: applicationsData.length,
        screening: applicationsData.filter(a => a.status === 'screening').length,
        interview: applicationsData.filter(a => a.status === 'interview').length,
        offer: applicationsData.filter(a => a.status === 'offer').length,
        hired: applicationsData.filter(a => a.status === 'hired').length
    }

    const funnelData = [
        { name: 'Applied', value: funnelCounts.applied, fill: '#e07850' },
        { name: 'Screening', value: funnelCounts.screening, fill: '#e8936f' },
        { name: 'Interview', value: funnelCounts.interview, fill: '#f0b090' },
        { name: 'Offer', value: funnelCounts.offer, fill: '#f5c8b0' },
    ]

    // 2. Employee Growth (This Month)
    const newEmployeesThisMonth = employees.filter(e =>
        e.created_at && isAfter(new Date(e.created_at), startOfMonth(new Date()))
    ).length
    const growthTrend = newEmployeesThisMonth > 0 ? `+${newEmployeesThisMonth} this month` : 'No change'

    // Sparkline data (simulated trend over last 7 periods)
    const teamSparkline = [teamMembers - 5, teamMembers - 3, teamMembers - 4, teamMembers - 2, teamMembers - 1, teamMembers, teamMembers]
    const hiringSparkline = [2, 4, 3, 5, 7, 6, funnelCounts.interview]
    const onboardingSparkline = [1, 2, 1, 3, 2, 4, newEmployeesThisMonth || 2]

    // 3. Action Center Items
    const pendingOffer = applicationsData.find(a => a.status === 'offer')
    const nextInterview = applicationsData.find(a => a.status === 'interview')

    // 4. Onboarding Stats (Employees joined in last 30 days)
    const thirtyDaysAgo = subDays(new Date(), 30)
    const recentHires = employees.filter(e => e.created_at && isAfter(new Date(e.created_at), thirtyDaysAgo))
    const onboardingCount = recentHires.length
    const latestHire = recentHires[0]

    // 5. Calendar Events (Derived from recent hires + static recurring)
    const recentHiresEvents = employees.slice(0, 2).map(e => ({
        date: format(new Date(e.created_at || new Date()), 'MMM d'),
        title: `${e.full_name?.split(' ')[0]} Start Date`,
        type: 'onboarding'
    }))

    const upcomingEvents = [
        { date: format(new Date(), 'MMM d'), title: 'Team Sync', type: 'event' },
        ...recentHiresEvents,
        { date: 'Next Mon', title: 'Payroll Run', type: 'finance' },
    ].slice(0, 3)

    // ------------------------------------------------------------------

    return (
        <motion.div
            className="space-y-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Smart Greeting Card with Time-Based Gradient */}
            <motion.div
                variants={itemVariants}
                className="relative overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-200 via-orange-100 to-white border border-white/60 shadow-sm"
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-[18px] bg-white shadow-sm flex items-center justify-center text-orange-600 ring-1 ring-black/5">
                            {greetingIcon}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{greeting}, {userName}</h1>
                            <p className="text-gray-500 text-sm mt-1 font-medium">
                                You have <span className="text-orange-600 font-semibold">{pendingTasks} urgent tasks</span> today.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <button
                                onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                                className="flex items-center gap-2 px-5 py-3 bg-white/40 backdrop-blur-md border border-white/50 text-gray-900 rounded-full font-semibold hover:bg-white/60 transition-all shadow-sm active:scale-95"
                            >
                                <Plus size={18} className="text-orange-600" />
                                Quick Actions
                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isQuickActionsOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isQuickActionsOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-[#e8e4e0]/60 py-1 z-50 origin-top-right overflow-hidden"
                                    >
                                        <button
                                            onClick={() => {
                                                router.push('/dashboard/hiring')
                                                setIsQuickActionsOpen(false)
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-[#6b6b6b] hover:bg-[#e07850]/10 hover:text-[#e07850] transition-colors flex items-center gap-2"
                                        >
                                            <Briefcase size={16} /> Post Job
                                        </button>
                                        <button
                                            onClick={() => {
                                                router.push('/dashboard/team')
                                                setIsQuickActionsOpen(false)
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-[#6b6b6b] hover:bg-[#e07850]/10 hover:text-[#e07850] transition-colors flex items-center gap-2"
                                        >
                                            <Users size={16} /> Add Employee
                                        </button>
                                        <button
                                            onClick={() => {
                                                router.push('/dashboard/settings')
                                                setIsQuickActionsOpen(false)
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-[#6b6b6b] hover:bg-[#e07850]/10 hover:text-[#e07850] transition-colors flex items-center gap-2"
                                        >
                                            <ClipboardList size={16} /> Draft Policy
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Decorative Subtle Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-200/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/60 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
            </motion.div>

            {/* Pulse Stats - Pro Cards with Sparklines */}
            <motion.div
                variants={containerVariants}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
                <motion.div variants={itemVariants}>
                    <ProStatCard
                        title="Total Employees"
                        value={teamMembers}
                        icon={<Users size={20} />}
                        iconGradient="bg-orange-100 text-orange-600"
                        trend={{ value: newEmployeesThisMonth, label: growthTrend, isPositive: newEmployeesThisMonth > 0 }}
                        sparklineData={teamSparkline}
                        href="/dashboard/team"
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <ProStatCard
                        title="Hiring Pipeline"
                        value={funnelCounts.interview}
                        icon={<UserCheck size={20} />}
                        iconGradient="bg-blue-100 text-blue-600"
                        badge={`${applicationsData.length} Total`}
                        badgeColor="blue"
                        sparklineData={hiringSparkline}
                        href="/dashboard/hiring"
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <ProStatCard
                        title="New Hires (30d)"
                        value={onboardingCount}
                        icon={<GraduationCap size={20} />}
                        iconGradient="bg-emerald-100 text-emerald-600"
                        sparklineData={onboardingSparkline}
                        href="/dashboard/onboarding"
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <ProStatCard
                        title="Pending Reviews"
                        value={pendingLeaveRequests.length}
                        icon={<Bell size={20} />}
                        iconGradient="bg-purple-100 text-purple-600"
                        badge={pendingLeaveRequests.length > 0 ? 'Action' : undefined}
                        badgeColor="purple"
                        href="/dashboard/leave"
                    />
                </motion.div>
            </motion.div>

            {/* Action Center - Split View */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Requires Action */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-semibold text-[#1a1a1a] flex items-center gap-2">
                        <AlertCircle size={18} className="text-[#e07850]" />
                        Requires Action
                    </h3>

                    {/* 1. Offer Pending (Real Data) */}
                    {pendingOffer && (
                        <motion.div
                            whileHover={{ scale: 1.01, y: -2 }}
                            className="bg-white p-4 rounded-2xl border border-[#e8e4e0] shadow-md flex items-center gap-4 cursor-pointer hover:shadow-lg transition-all"
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                <FileText size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-[#1a1a1a]">Offer Pending: {pendingOffer.candidate_name || 'Candidate'}</h4>
                                <p className="text-sm text-[#6b6b6b]">{pendingOffer.position} • Waiting for response</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">Offer Sent</span>
                                <MoreHorizontal size={16} className="text-[#a0a0a0]" />
                            </div>
                        </motion.div>
                    )}

                    {/* 2. Leave Requests (Real Data) */}
                    {pendingLeaveRequests && pendingLeaveRequests.length > 0 ? (
                        pendingLeaveRequests.map((request: any) => (
                            <motion.div
                                key={request.id}
                                whileHover={{ scale: 1.01, y: -2 }}
                                className="bg-white p-4 rounded-2xl border border-[#e8e4e0] shadow-md flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-lg transition-all"
                            >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center text-white shrink-0 font-bold shadow-md">
                                    {(request.profile?.full_name || 'U').charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-[#1a1a1a]">{request.profile?.full_name} • {request.type}</h4>
                                    <p className="text-sm text-[#6b6b6b]">
                                        {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d')} • {request.reason}
                                    </p>
                                </div>
                                <ApprovalActions requestId={request.id} />
                            </motion.div>
                        ))
                    ) : (
                        <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-[#e8e4e0]">
                            <p className="text-[#a0a0a0] text-sm">No pending leave requests</p>
                        </div>
                    )}

                    {/* 3. Interview (Real Data) */}
                    {nextInterview && (
                        <motion.div
                            whileHover={{ scale: 1.01, y: -2 }}
                            className="bg-white p-4 rounded-2xl border border-[#e8e4e0] shadow-md flex items-center gap-4 cursor-pointer hover:shadow-lg transition-all"
                        >
                            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                                <Video size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-[#1a1a1a]">Interview: {nextInterview.candidate_name || 'Candidate'}</h4>
                                <p className="text-sm text-[#6b6b6b]">{nextInterview.position} • Contact to schedule</p>
                            </div>
                            <Link href="/dashboard/hiring" className="px-3 py-1.5 border border-purple-200 text-purple-700 text-xs font-medium rounded-full hover:bg-purple-50 transition-colors">
                                View
                            </Link>
                        </motion.div>
                    )}
                </div>

                {/* Right Column - Hiring Funnel */}
                <div className="bg-white rounded-3xl border border-[#e8e4e0] shadow-md p-6">
                    <h3 className="font-semibold text-[#1a1a1a] mb-6">Hiring Funnel</h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelData} layout="vertical" barSize={32}>
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#6b6b6b' }}
                                    width={70}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: '1px solid #e8e4e0',
                                        backgroundColor: '#ffffff',
                                        color: '#1a1a1a',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                    }}
                                />
                                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                    {funnelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </motion.div>

            {/* Company Announcements */}
            <motion.div variants={itemVariants} className="bg-white rounded-3xl border border-[#e8e4e0] shadow-md p-6">
                <h3 className="font-semibold text-[#1a1a1a] mb-4 flex items-center gap-2">
                    <Megaphone size={18} className="text-[#e07850]" />
                    Company Announcements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {announcements.map((announcement) => (
                        <motion.div
                            key={announcement.id}
                            whileHover={{ y: -4, scale: 1.01 }}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${announcement.priority === 'High'
                                ? 'bg-[#e07850]/5 border-[#e07850]/30 hover:border-[#e07850]/50 hover:shadow-md'
                                : 'bg-[#faf8f5] border-[#e8e4e0] hover:border-[#d9d5d0] hover:shadow-md'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${announcement.priority === 'High'
                                    ? 'bg-[#e07850]/10 text-[#e07850] border border-[#e07850]/20'
                                    : 'bg-[#f5f3f0] text-[#6b6b6b]'
                                    }`}>
                                    {announcement.priority === 'High' && <span className="w-1.5 h-1.5 bg-[#e07850] rounded-full" />}
                                    {announcement.priority}
                                </span>
                                <span className="text-xs text-[#a0a0a0]">
                                    {format(new Date(announcement.date), 'MMM d')}
                                </span>
                            </div>
                            <h4 className="font-semibold text-[#1a1a1a] mb-1">{announcement.title}</h4>
                            <p className="text-sm text-[#6b6b6b] line-clamp-2">{announcement.content}</p>
                            <p className="text-xs text-[#a0a0a0] mt-2">— {announcement.author}</p>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

        </motion.div>
    )
}
