import { getMyLeaveRequests } from '@/app/actions/leave'
import { LeaveRequestForm } from './leave-request-form'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Sparkles } from 'lucide-react'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function EmployeeLeavePage() {
    const leaveRequests = await getMyLeaveRequests()

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center shadow-lg">
                        <Calendar className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#1a1a1a]">Leave Management</h2>
                        <p className="text-[#6b6b6b] text-sm mt-1">Request time off and view your leave history</p>
                    </div>
                </div>


            </div>

            {/* Leave Request Form */}
            <div className="rounded-3xl bg-white border border-[#e8e4e0] shadow-md overflow-hidden">
                <div className="p-6 border-b border-[#e8e4e0] bg-[#faf8f5]">
                    <h3 className="text-lg font-semibold text-[#1a1a1a]">Request Leave</h3>
                    <p className="text-sm text-[#6b6b6b] mt-1">Submit a new leave request for approval</p>
                </div>
                <div className="p-6">
                    <LeaveRequestForm />
                </div>
            </div>

            {/* Leave History */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#1a1a1a] flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-[#e07850]/10">
                        <Calendar className="h-5 w-5 text-[#e07850]" />
                    </div>
                    My Leave History
                </h3>

                {leaveRequests.length === 0 ? (
                    <div className="rounded-3xl bg-white border border-[#e8e4e0] p-12 text-center shadow-md">
                        <Calendar className="h-12 w-12 text-[#a0a0a0] mx-auto mb-4" />
                        <p className="text-[#6b6b6b]">No leave requests yet.</p>
                    </div>
                ) : (
                    <div className="rounded-3xl bg-white border border-[#e8e4e0] overflow-hidden shadow-md">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[#faf8f5] border-b border-[#e8e4e0]">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">
                                            Dates
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">
                                            Reason
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">
                                            Requested
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e8e4e0]">
                                    {leaveRequests.map((request) => (
                                        <tr key={request.id} className="hover:bg-[#faf8f5] transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm text-[#1a1a1a]">
                                                    <Calendar className="h-4 w-4 text-[#a0a0a0]" />
                                                    {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-[#6b6b6b] line-clamp-2">{request.reason}</p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge className={
                                                    request.status === 'approved'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : request.status === 'rejected'
                                                            ? 'bg-red-50 text-red-700 border-red-200'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }>
                                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-xs text-[#a0a0a0]">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(request.created_at), 'MMM d, yyyy')}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
