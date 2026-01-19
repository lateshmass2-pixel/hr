'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
    Briefcase, Users, TrendingUp, Calendar, ArrowRight,
    CheckCircle, XCircle, Clock, Plus, GraduationCap, Video,
    UserCheck, AlertCircle, FileText, ChevronDown, MoreHorizontal,
    Megaphone, Bell, ClipboardList, Sparkles
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { format, subDays, isAfter, startOfMonth } from 'date-fns'
import { ApprovalActions } from './leave/approval-actions'
import { useHems } from '@/context/HemsContext'

interface DashboardClientProps {
    pendingTasks: number
    teamMembers: number
    employees: any[]
    applicationsData: any[]
    pendingLeaveRequests: any[]
    userName: string
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
        <div className="space-y-6">
            {/* Smart Greeting & Quick Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center shadow-lg">
                        <Calendar className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#1a1a1a]">Good Morning, {userName} 👋</h1>
                        <p className="text-[#6b6b6b] text-sm mt-1">
                            You have <span className="font-semibold text-[#e07850]">{pendingTasks} urgent tasks</span> today.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Help Bubble */}
                    <div className="hidden md:flex items-center gap-2 bg-white rounded-full px-5 py-3 shadow-md border border-[#e8e4e0]">
                        <Sparkles className="w-5 h-5 text-[#e07850]" />
                        <span className="text-[#1a1a1a] font-medium">Hey, Need help?</span>
                        <span className="text-2xl">👋</span>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#e07850] to-[#d45a3a] text-white rounded-full font-semibold hover:from-[#d45a3a] hover:to-[#c04a2a] transition-all shadow-lg"
                        >
                            <Plus size={18} />
                            Quick Actions
                            <ChevronDown size={16} className={`transition-transform ${isQuickActionsOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isQuickActionsOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#e8e4e0] py-1 z-50 origin-top-right overflow-hidden"
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
                                            // Placeholder for documents/policy
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

            {/* Pulse Stats - Connected to Modules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Employees */}
                <Link href="/dashboard/team">
                    <div className="bg-white p-5 rounded-3xl border border-[#e8e4e0] shadow-md hover:shadow-lg transition-all cursor-pointer group h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-md">
                                <Users size={22} />
                            </div>
                            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                                <TrendingUp size={10} /> {growthTrend}
                            </span>
                        </div>
                        <div className="text-3xl font-bold text-[#1a1a1a] mt-3">{teamMembers}</div>
                        <div className="text-sm text-[#6b6b6b]">Total Employees</div>
                    </div>
                </Link>

                {/* Hiring */}
                <Link href="/dashboard/hiring">
                    <div className="bg-white p-5 rounded-3xl border border-[#e8e4e0] shadow-md hover:shadow-lg transition-all cursor-pointer group h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-md">
                                <UserCheck size={22} />
                            </div>
                            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
                                {applicationsData.length} Total
                            </span>
                        </div>
                        <div className="text-3xl font-bold text-[#1a1a1a] mt-3">{funnelCounts.interview}</div>
                        <div className="text-sm text-[#6b6b6b]">Hiring Pipeline</div>
                    </div>
                </Link>

                {/* Onboarding */}
                <Link href="/dashboard/onboarding">
                    <div className="bg-white p-5 rounded-3xl border border-[#e8e4e0] shadow-md hover:shadow-lg transition-all cursor-pointer group h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-md">
                                <GraduationCap size={22} />
                            </div>
                        </div>
                        <div className="text-3xl font-bold text-[#1a1a1a] mt-3">{onboardingCount}</div>
                        <div className="text-sm text-[#6b6b6b]">
                            {latestHire ? `Latest: ${latestHire.full_name?.split(' ')[0]}` : 'New Hires (30 days)'}
                        </div>
                    </div>
                </Link>

                {/* Pending Approvals */}
                <Link href="/dashboard/leave">
                    <div className="bg-white p-5 rounded-3xl border border-[#e8e4e0] shadow-md hover:shadow-lg transition-all cursor-pointer group h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-md">
                                <Bell size={22} />
                            </div>
                            {pendingLeaveRequests.length > 0 && (
                                <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded-full border border-purple-200">
                                    Needs review
                                </span>
                            )}
                        </div>
                        <div className="text-3xl font-bold text-[#1a1a1a] mt-3">{pendingLeaveRequests.length}</div>
                        <div className="text-sm text-[#6b6b6b]">Pending Approvals</div>
                    </div>
                </Link>
            </div>

            {/* Action Center - Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Requires Action */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-semibold text-[#1a1a1a] flex items-center gap-2">
                        <AlertCircle size={18} className="text-[#e07850]" />
                        Requires Action
                    </h3>

                    {/* 1. Offer Pending (Real Data) */}
                    {pendingOffer && (
                        <motion.div
                            whileHover={{ scale: 1.01 }}
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
                                whileHover={{ scale: 1.01 }}
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
                            whileHover={{ scale: 1.01 }}
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
            </div>

            {/* Company Announcements */}
            <div className="bg-white rounded-3xl border border-[#e8e4e0] shadow-md p-6">
                <h3 className="font-semibold text-[#1a1a1a] mb-4 flex items-center gap-2">
                    <Megaphone size={18} className="text-[#e07850]" />
                    Company Announcements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {announcements.map((announcement) => (
                        <motion.div
                            key={announcement.id}
                            whileHover={{ y: -2 }}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${announcement.priority === 'High'
                                ? 'bg-[#e07850]/5 border-[#e07850]/30 hover:border-[#e07850]/50'
                                : 'bg-[#faf8f5] border-[#e8e4e0] hover:border-[#d9d5d0]'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${announcement.priority === 'High'
                                    ? 'bg-[#e07850]/10 text-[#e07850] border border-[#e07850]/20'
                                    : 'bg-[#f5f3f0] text-[#6b6b6b]'
                                    }`}>
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
            </div>

        </div>
    )
}
