import { getAllLeaveRequests } from '@/app/actions/leave'
import { createClient } from '@/lib/supabase/server'
import { ApprovalActions } from './approval-actions'
import { Clock, TrendingUp, TrendingDown, UserX, Plane, Search, Calendar, Sparkles } from 'lucide-react'
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center shadow-lg">
                        <Calendar className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#1a1a1a]">Leave Management</h2>
                        <p className="text-[#6b6b6b] text-sm mt-1">Track attendance and manage leave requests</p>
                    </div>
                </div>

                {/* Help Bubble */}
                <div className="hidden md:flex items-center gap-2 bg-white rounded-full px-5 py-3 shadow-md border border-[#e8e4e0]">
                    <Sparkles className="w-5 h-5 text-[#e07850]" />
                    <span className="text-[#1a1a1a] font-medium">Hey, Need help?</span>
                    <span className="text-2xl">👋</span>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Employees */}
                <div className="bg-white rounded-3xl border border-[#e8e4e0] p-5 shadow-md hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
                            <Clock size={22} className="text-white" />
                        </div>
                        <div className="flex items-center gap-1 text-emerald-700 text-xs font-medium bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                            <TrendingUp size={14} />
                            Active
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-[#1a1a1a]">{totalEmployees}</div>
                    <div className="text-sm text-[#6b6b6b] mt-1">Total Employees</div>
                </div>

                {/* Pending Requests */}
                <div className="bg-white rounded-3xl border border-[#e8e4e0] p-5 shadow-md hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center shadow-md">
                            <Calendar size={22} className="text-white" />
                        </div>
                        {pendingRequests.length > 0 && (
                            <div className="flex items-center gap-1 text-[#e07850] text-xs font-medium bg-[#e07850]/10 px-2 py-1 rounded-full border border-[#e07850]/20">
                                <TrendingUp size={14} />
                                Action Needed
                            </div>
                        )}
                    </div>
                    <div className="text-3xl font-bold text-[#1a1a1a]">{pendingRequests.length}</div>
                    <div className="text-sm text-[#6b6b6b] mt-1">Pending Requests</div>
                </div>

                {/* Approved Leaves */}
                <div className="bg-white rounded-3xl border border-[#e8e4e0] p-5 shadow-md hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                            <UserX size={22} className="text-white" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-[#1a1a1a]">{approvedRequests.length}</div>
                    <div className="text-sm text-[#6b6b6b] mt-1">Approved Leaves</div>
                </div>

                {/* On Leave Today */}
                <div className="bg-white rounded-3xl border border-[#e8e4e0] p-5 shadow-md hover:shadow-lg transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                            <Plane size={22} className="text-white" />
                        </div>
                    </div>
                    {onLeaveToday.length > 0 ? (
                        <>
                            <div className="flex items-center gap-1 mb-2">
                                {onLeaveToday.slice(0, 3).map((request, i) => (
                                    <div
                                        key={request.id}
                                        className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-md"
                                        style={{ marginLeft: i > 0 ? '-8px' : 0, zIndex: 3 - i }}
                                        title={request.profile?.full_name}
                                    >
                                        {getInitials(request.profile?.full_name || '')}
                                    </div>
                                ))}
                                {onLeaveToday.length > 3 && (
                                    <span className="text-sm text-[#6b6b6b] ml-2">+{onLeaveToday.length - 3}</span>
                                )}
                            </div>
                            <div className="text-sm text-[#6b6b6b]">On Leave Today</div>
                        </>
                    ) : (
                        <>
                            <div className="text-3xl font-bold text-[#1a1a1a]">0</div>
                            <div className="text-sm text-[#6b6b6b] mt-1">On Leave Today</div>
                        </>
                    )}
                </div>
            </div>

            {/* Pending Requests */}
            <div className="bg-white rounded-3xl border border-[#e8e4e0] p-6 shadow-md">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-[#1a1a1a]">Pending Requests</h3>
                    <span className="px-2.5 py-1 bg-[#e07850]/10 text-[#e07850] rounded-full text-xs font-semibold border border-[#e07850]/20">
                        {pendingRequests.length} Pending
                    </span>
                </div>

                {pendingRequests.length === 0 ? (
                    <div className="text-center py-8 text-[#a0a0a0]">
                        No pending leave requests 🎉
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingRequests.map(request => (
                            <div
                                key={request.id}
                                className="border border-[#e8e4e0] bg-[#faf8f5] rounded-2xl p-4 hover:shadow-md hover:border-[#e07850]/30 transition-all"
                            >
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center text-white text-sm font-bold shadow-md">
                                        {getInitials(request.profile?.full_name || '')}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-[#1a1a1a] text-sm">
                                            {request.profile?.full_name || 'Unknown'}
                                        </h4>
                                        <span className="px-2 py-0.5 bg-[#f5f3f0] text-[#6b6b6b] rounded text-xs border border-[#e8e4e0]">
                                            Leave Request
                                        </span>
                                    </div>
                                </div>

                                {/* Date */}
                                <div className="flex items-center gap-2 text-sm text-[#6b6b6b] mb-2">
                                    <Calendar size={14} className="text-[#a0a0a0]" />
                                    <span>
                                        {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                                    </span>
                                    <span className="text-[#e8e4e0]">•</span>
                                    <span className="font-medium text-[#1a1a1a]">
                                        {getDayCount(request.start_date, request.end_date)} Day{getDayCount(request.start_date, request.end_date) > 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Reason */}
                                <p className="text-sm text-[#a0a0a0] line-clamp-2 mb-4">
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
            <div className="bg-white rounded-3xl border border-[#e8e4e0] shadow-md">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#e8e4e0]">
                    <h3 className="text-base font-semibold text-[#1a1a1a]">Approved Leaves</h3>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
                        {approvedRequests.length} Approved
                    </span>
                </div>

                {approvedRequests.length === 0 ? (
                    <div className="text-center py-12 text-[#a0a0a0]">
                        No approved leaves yet
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#faf8f5] border-b border-[#e8e4e0]">
                                    <th className="text-left py-3 px-6 font-medium text-[#6b6b6b] text-xs uppercase tracking-wider">Employee</th>
                                    <th className="text-left py-3 px-6 font-medium text-[#6b6b6b] text-xs uppercase tracking-wider">Dates</th>
                                    <th className="text-left py-3 px-6 font-medium text-[#6b6b6b] text-xs uppercase tracking-wider">Duration</th>
                                    <th className="text-left py-3 px-6 font-medium text-[#6b6b6b] text-xs uppercase tracking-wider">Reason</th>
                                    <th className="text-left py-3 px-6 font-medium text-[#6b6b6b] text-xs uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e8e4e0]">
                                {approvedRequests.map(request => (
                                    <tr key={request.id} className="hover:bg-[#faf8f5] transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                                                    {getInitials(request.profile?.full_name || '')}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-[#1a1a1a]">{request.profile?.full_name || 'Unknown'}</p>
                                                    <p className="text-xs text-[#a0a0a0]">{request.profile?.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-[#6b6b6b]">
                                                {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="font-medium text-[#1a1a1a]">
                                                {getDayCount(request.start_date, request.end_date)} Day{getDayCount(request.start_date, request.end_date) > 1 ? 's' : ''}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-[#6b6b6b] line-clamp-1 max-w-[200px]">{request.reason}</p>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
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
