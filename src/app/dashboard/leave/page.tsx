import { getAllLeaveRequests } from '@/app/actions/leave'
import { createClient } from '@/lib/supabase/server'
import { ApprovalActions } from './approval-actions'
import { Clock, TrendingUp, TrendingDown, UserX, Plane, Search, Calendar } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

export const dynamic = 'force-dynamic'

async function getProfiles() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
    return data || []
}

export default async function LeavePage() {
    const allRequests = await getAllLeaveRequests()
    const profiles = await getProfiles()

    const pendingRequests = allRequests.filter(r => r.status === 'pending')
    const approvedRequests = allRequests.filter(r => r.status === 'approved')

    // Calculate stats from real data
    const totalEmployees = profiles.length
    const onLeaveToday = approvedRequests.filter(r => {
        const today = new Date()
        const start = new Date(r.start_date)
        const end = new Date(r.end_date)
        return today >= start && today <= end
    })

    function getInitials(name: string) {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??'
    }

    function getDayCount(startDate: string, endDate: string) {
        return differenceInDays(new Date(endDate), new Date(startDate)) + 1
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white">Leave Management</h2>
                <p className="text-zinc-400 text-sm mt-1">Track attendance and manage leave requests</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Employees */}
                <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-5 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <Clock size={20} className="text-emerald-400" />
                        </div>
                        <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                            <TrendingUp size={14} />
                            Active
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-white">{totalEmployees}</div>
                    <div className="text-sm text-zinc-400 mt-1">Total Employees</div>
                </div>

                {/* Pending Requests */}
                <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-5 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                            <Calendar size={20} className="text-violet-400" />
                        </div>
                        {pendingRequests.length > 0 && (
                            <div className="flex items-center gap-1 text-violet-400 text-xs font-medium">
                                <TrendingUp size={14} />
                                Action Needed
                            </div>
                        )}
                    </div>
                    <div className="text-3xl font-bold text-white">{pendingRequests.length}</div>
                    <div className="text-sm text-zinc-400 mt-1">Pending Requests</div>
                </div>

                {/* Approved Leaves */}
                <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-5 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <UserX size={20} className="text-blue-400" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-white">{approvedRequests.length}</div>
                    <div className="text-sm text-zinc-400 mt-1">Approved Leaves</div>
                </div>

                {/* On Leave Today */}
                <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-5 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Plane size={20} className="text-purple-400" />
                        </div>
                    </div>
                    {onLeaveToday.length > 0 ? (
                        <>
                            <div className="flex items-center gap-1 mb-2">
                                {onLeaveToday.slice(0, 3).map((request, i) => (
                                    <div
                                        key={request.id}
                                        className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-400 flex items-center justify-center text-white text-xs font-bold border-2 border-[#1a1a1a]"
                                        style={{ marginLeft: i > 0 ? '-8px' : 0, zIndex: 3 - i }}
                                        title={request.profile?.full_name}
                                    >
                                        {getInitials(request.profile?.full_name || '')}
                                    </div>
                                ))}
                                {onLeaveToday.length > 3 && (
                                    <span className="text-sm text-zinc-400 ml-2">+{onLeaveToday.length - 3}</span>
                                )}
                            </div>
                            <div className="text-sm text-zinc-400">On Leave Today</div>
                        </>
                    ) : (
                        <>
                            <div className="text-3xl font-bold text-white">0</div>
                            <div className="text-sm text-zinc-400 mt-1">On Leave Today</div>
                        </>
                    )}
                </div>
            </div>

            {/* Pending Requests */}
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-white">Pending Requests</h3>
                    <span className="px-2.5 py-1 bg-violet-500/20 text-violet-400 rounded-full text-xs font-semibold border border-violet-500/30">
                        {pendingRequests.length} Pending
                    </span>
                </div>

                {pendingRequests.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">
                        No pending leave requests 🎉
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingRequests.map(request => (
                            <div
                                key={request.id}
                                className="border border-[#2a2a2a] bg-[#0d0d0d] rounded-xl p-4 hover:border-violet-500/50 transition-all"
                            >
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-400 flex items-center justify-center text-white text-sm font-bold">
                                        {getInitials(request.profile?.full_name || '')}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-white text-sm">
                                            {request.profile?.full_name || 'Unknown'}
                                        </h4>
                                        <span className="px-2 py-0.5 bg-[#2a2a2a] text-zinc-400 rounded text-xs">
                                            Leave Request
                                        </span>
                                    </div>
                                </div>

                                {/* Date */}
                                <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                                    <Calendar size={14} className="text-zinc-500" />
                                    <span>
                                        {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                                    </span>
                                    <span className="text-zinc-600">•</span>
                                    <span className="font-medium text-white">
                                        {getDayCount(request.start_date, request.end_date)} Day{getDayCount(request.start_date, request.end_date) > 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Reason */}
                                <p className="text-sm text-zinc-500 line-clamp-2 mb-4">
                                    {request.reason}
                                </p>

                                {/* Actions */}
                                <ApprovalActions requestId={request.id} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Approved Leave Calendar */}
            <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] shadow-lg">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
                    <h3 className="text-base font-semibold text-white">Approved Leaves</h3>
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold border border-emerald-500/30">
                        {approvedRequests.length} Approved
                    </span>
                </div>

                {approvedRequests.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                        No approved leaves yet
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#0d0d0d] border-b border-[#2a2a2a]">
                                    <th className="text-left py-3 px-6 font-medium text-zinc-500 text-xs uppercase tracking-wider">Employee</th>
                                    <th className="text-left py-3 px-6 font-medium text-zinc-500 text-xs uppercase tracking-wider">Dates</th>
                                    <th className="text-left py-3 px-6 font-medium text-zinc-500 text-xs uppercase tracking-wider">Duration</th>
                                    <th className="text-left py-3 px-6 font-medium text-zinc-500 text-xs uppercase tracking-wider">Reason</th>
                                    <th className="text-left py-3 px-6 font-medium text-zinc-500 text-xs uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2a2a2a]">
                                {approvedRequests.map(request => (
                                    <tr key={request.id} className="hover:bg-[#222] transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white text-xs font-bold">
                                                    {getInitials(request.profile?.full_name || '')}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">{request.profile?.full_name || 'Unknown'}</p>
                                                    <p className="text-xs text-zinc-500">{request.profile?.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-zinc-300">
                                                {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="font-medium text-white">
                                                {getDayCount(request.start_date, request.end_date)} Day{getDayCount(request.start_date, request.end_date) > 1 ? 's' : ''}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-zinc-400 line-clamp-1 max-w-[200px]">{request.reason}</p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                Approved
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
