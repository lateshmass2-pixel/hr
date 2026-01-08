'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
    Briefcase, Users, TrendingUp, Calendar, ArrowRight,
    CheckCircle, XCircle, Clock, Plus, GraduationCap, Video,
    UserCheck, AlertCircle, FileText, ChevronDown, MoreHorizontal,
    Megaphone, Bell, ClipboardList
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
        { name: 'Applied', value: funnelCounts.applied, fill: '#60a5fa' },
        { name: 'Screening', value: funnelCounts.screening, fill: '#818cf8' },
        { name: 'Interview', value: funnelCounts.interview, fill: '#a78bfa' },
        { name: 'Offer', value: funnelCounts.offer, fill: '#f472b6' },
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
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Good Morning, {userName} 👋</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        You have <span className="font-semibold text-orange-600">{pendingTasks} urgent tasks</span> today.
                    </p>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors shadow-sm"
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
                                className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 origin-top-right overflow-hidden"
                            >
                                <button
                                    onClick={() => {
                                        router.push('/dashboard/hiring')
                                        setIsQuickActionsOpen(false)
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors flex items-center gap-2"
                                >
                                    <Briefcase size={16} /> Post Job
                                </button>
                                <button
                                    onClick={() => {
                                        router.push('/dashboard/team')
                                        setIsQuickActionsOpen(false)
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors flex items-center gap-2"
                                >
                                    <Users size={16} /> Add Employee
                                </button>
                                <button
                                    onClick={() => {
                                        // Placeholder for documents/policy
                                        router.push('/dashboard/settings')
                                        setIsQuickActionsOpen(false)
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors flex items-center gap-2"
                                >
                                    <ClipboardList size={16} /> Draft Policy
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Pulse Stats - Connected to Modules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Employees */}
                <Link href="/dashboard/team">
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-200 transition-all cursor-pointer group h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                <Users size={20} />
                            </div>
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <TrendingUp size={10} /> {growthTrend}
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{teamMembers}</div>
                        <div className="text-sm text-gray-500">Total Employees</div>
                    </div>
                </Link>

                {/* Hiring */}
                <Link href="/dashboard/hiring">
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <UserCheck size={20} />
                            </div>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                {applicationsData.length} Total
                            </span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{funnelCounts.interview}</div>
                        <div className="text-sm text-gray-500">Hiring Pipeline</div>
                    </div>
                </Link>

                {/* Onboarding */}
                <Link href="/dashboard/onboarding">
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <GraduationCap size={20} />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{onboardingCount}</div>
                        <div className="text-sm text-gray-500">
                            {latestHire ? `Latest: ${latestHire.full_name?.split(' ')[0]}` : 'New Hires (30 days)'}
                        </div>
                    </div>
                </Link>

                {/* Pending Approvals */}
                <Link href="/dashboard/leave">
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-200 transition-all cursor-pointer group h-full">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                <Bell size={20} />
                            </div>
                            {pendingLeaveRequests.length > 0 && (
                                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                                    Needs review
                                </span>
                            )}
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{pendingLeaveRequests.length}</div>
                        <div className="text-sm text-gray-500">Pending Approvals</div>
                    </div>
                </Link>
            </div>

            {/* Action Center - Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Requires Action */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <AlertCircle size={18} className="text-orange-500" />
                        Requires Action
                    </h3>

                    {/* 1. Offer Pending (Real Data) */}
                    {pendingOffer && (
                        <motion.div
                            whileHover={{ scale: 1.01 }}
                            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 cursor-pointer"
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                <FileText size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">Offer Pending: {pendingOffer.candidate_name || 'Candidate'}</h4>
                                <p className="text-sm text-gray-500">{pendingOffer.position} • Waiting for response</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Offer Sent</span>
                                <MoreHorizontal size={16} className="text-gray-400" />
                            </div>
                        </motion.div>
                    )}

                    {/* 2. Leave Requests (Real Data) */}
                    {pendingLeaveRequests && pendingLeaveRequests.length > 0 ? (
                        pendingLeaveRequests.map((request: any) => (
                            <motion.div
                                key={request.id}
                                whileHover={{ scale: 1.01 }}
                                className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4"
                            >
                                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0 font-bold">
                                    {(request.profile?.full_name || 'U').charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900">{request.profile?.full_name} • {request.type}</h4>
                                    <p className="text-sm text-gray-500">
                                        {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d')} • {request.reason}
                                    </p>
                                </div>
                                <ApprovalActions requestId={request.id} />
                            </motion.div>
                        ))
                    ) : (
                        <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <p className="text-gray-500 text-sm">No pending leave requests</p>
                        </div>
                    )}

                    {/* 3. Interview (Real Data) */}
                    {nextInterview && (
                        <motion.div
                            whileHover={{ scale: 1.01 }}
                            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4 cursor-pointer"
                        >
                            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                                <Video size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">Interview: {nextInterview.candidate_name || 'Candidate'}</h4>
                                <p className="text-sm text-gray-500">{nextInterview.position} • Contact to schedule</p>
                            </div>
                            <Link href="/dashboard/hiring" className="px-3 py-1.5 border border-purple-200 text-purple-600 text-xs font-medium rounded hover:bg-purple-50">
                                View
                            </Link>
                        </motion.div>
                    )}
                </div>

                {/* Right Column - Hiring Funnel */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-6">Hiring Funnel</h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelData} layout="vertical" barSize={32}>
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#6b7280' }}
                                    width={70}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
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
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Megaphone size={18} className="text-orange-500" />
                    Company Announcements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {announcements.map((announcement) => (
                        <motion.div
                            key={announcement.id}
                            whileHover={{ y: -2 }}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${announcement.priority === 'High'
                                ? 'bg-orange-50 border-orange-200 hover:border-orange-300'
                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${announcement.priority === 'High'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-gray-200 text-gray-600'
                                    }`}>
                                    {announcement.priority}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {format(new Date(announcement.date), 'MMM d')}
                                </span>
                            </div>
                            <h4 className="font-semibold text-gray-900 mb-1">{announcement.title}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2">{announcement.content}</p>
                            <p className="text-xs text-gray-400 mt-2">— {announcement.author}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

        </div>
    )
}
