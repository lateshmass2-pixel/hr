import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Download, Mail, Briefcase, Calendar } from "lucide-react"
import { format } from "date-fns"

export const dynamic = 'force-dynamic'

async function getHiredCandidates() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('applications')
        .select('*')
        .eq('status', 'HIRED')
        .order('updated_at', { ascending: false })
    return data || []
}

export default async function HiredPage() {
    const hiredEmployees = await getHiredCandidates()

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Onboarded Employees</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {hiredEmployees.length} employees successfully hired
                    </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium text-sm transition-colors">
                    <Download className="h-4 w-4" />
                    Export CSV
                </button>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {hiredEmployees.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        No hired employees yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Employee
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Hired Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-50">
                                {hiredEmployees.map((employee) => {
                                    const initials = employee.candidate_name
                                        ? employee.candidate_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                                        : '??'

                                    return (
                                        <tr key={employee.id} className="hover:bg-[#F8F9FC] transition-colors">
                                            {/* Employee Name + Avatar */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 text-purple-700 text-sm font-bold flex items-center justify-center ring-2 ring-white">
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">
                                                            {employee.candidate_name || 'Unknown'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Briefcase className="h-4 w-4 text-gray-400" />
                                                    {employee.offer_role || 'Software Engineer'}
                                                </div>
                                            </td>

                                            {/* Email */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Mail className="h-4 w-4 text-gray-400" />
                                                    {employee.candidate_email}
                                                </div>
                                            </td>

                                            {/* Hired Date */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                    {format(new Date(employee.updated_at), 'MMM d, yyyy')}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge className="bg-green-50 text-green-700 border-green-200 font-medium">
                                                    Active
                                                </Badge>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
