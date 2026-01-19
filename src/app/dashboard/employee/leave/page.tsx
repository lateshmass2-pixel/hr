import { getMyLeaveRequests } from '@/app/actions/leave'
import { LeaveRequestForm } from './leave-request-form'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function EmployeeLeavePage() {
    const leaveRequests = await getMyLeaveRequests()

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">Leave Management</h2>
                <p className="text-zinc-400 mt-1">Request time off and view your leave history</p>
            </div>

            {/* Leave Request Form */}
            <div className="rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] shadow-lg overflow-hidden">
                <div className="p-6 border-b border-[#2a2a2a] bg-[#0d0d0d]">
                    <h3 className="text-lg font-semibold text-white">Request Leave</h3>
                    <p className="text-sm text-zinc-400 mt-1">Submit a new leave request for approval</p>
                </div>
                <div className="p-6">
                    <LeaveRequestForm />
                </div>
            </div>

            {/* Leave History */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-violet-500/20">
                        <Calendar className="h-5 w-5 text-violet-400" />
                    </div>
                    My Leave History
                </h3>

                {leaveRequests.length === 0 ? (
                    <div className="rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] p-12 text-center shadow-lg">
                        <p className="text-zinc-500">No leave requests yet.</p>
                    </div>
                ) : (
                    <div className="rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] overflow-hidden shadow-lg">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[#0d0d0d] border-b border-[#2a2a2a]">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                            Dates
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                            Reason
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                            Requested
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#2a2a2a]">
                                    {leaveRequests.map((request) => (
                                        <tr key={request.id} className="hover:bg-[#222] transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm text-white">
                                                    <Calendar className="h-4 w-4 text-zinc-500" />
                                                    {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-zinc-300 line-clamp-2">{request.reason}</p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge className={
                                                    request.status === 'approved'
                                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                                        : request.status === 'rejected'
                                                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                                }>
                                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-xs text-zinc-500">
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
