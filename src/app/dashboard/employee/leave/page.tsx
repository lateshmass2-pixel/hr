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
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Leave Management</h2>
                <p className="text-gray-600 mt-1">Request time off and view your leave history</p>
            </div>

            {/* Leave Request Form */}
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">Request Leave</h3>
                    <p className="text-sm text-gray-600 mt-1">Submit a new leave request for approval</p>
                </div>
                <div className="p-6">
                    <LeaveRequestForm />
                </div>
            </div>

            {/* Leave History */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-50">
                        <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    My Leave History
                </h3>

                {leaveRequests.length === 0 ? (
                    <div className="rounded-xl bg-white border border-gray-200 p-12 text-center shadow-sm">
                        <p className="text-gray-600">No leave requests yet.</p>
                    </div>
                ) : (
                    <div className="rounded-xl bg-white border border-gray-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Dates
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Reason
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Requested
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {leaveRequests.map((request) => (
                                        <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm text-gray-900">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                    {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-gray-700 line-clamp-2">{request.reason}</p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge className={
                                                    request.status === 'approved'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : request.status === 'rejected'
                                                            ? 'bg-red-50 text-red-700 border-red-200'
                                                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                }>
                                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
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
