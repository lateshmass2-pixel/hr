import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Download, Mail, Briefcase, Calendar, Users, Sparkles, CheckCircle2 } from "lucide-react"
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
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#1a1a1a] tracking-tight">Onboarded Employees</h2>
                        <p className="text-sm text-[#6b6b6b] mt-1">
                            {hiredEmployees.length} employees successfully hired
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Help Bubble */}
                    <div className="hidden md:flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-md border border-[#e8e4e0]">
                        <Sparkles className="w-4 h-4 text-[#e07850]" />
                        <span className="text-[#1a1a1a] text-sm font-medium">Need help?</span>
                        <span className="text-lg">👋</span>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e8e4e0] text-[#6b6b6b] hover:bg-[#faf8f5] hover:border-[#d9d5d0] rounded-full font-medium text-sm transition-colors shadow-sm">
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-[#e8e4e0] rounded-3xl shadow-md overflow-hidden">
                {hiredEmployees.length === 0 ? (
                    <div className="p-12 text-center">
                        <CheckCircle2 className="h-12 w-12 text-[#a0a0a0] mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">No hired employees yet</h3>
                        <p className="text-[#6b6b6b]">Candidates who accept offers will appear here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#faf8f5] border-b border-[#e8e4e0]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">
                                        Employee
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">
                                        Hired Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e8e4e0]">
                                {hiredEmployees.map((employee) => {
                                    const initials = employee.candidate_name
                                        ? employee.candidate_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                                        : '??'

                                    return (
                                        <tr key={employee.id} className="hover:bg-[#faf8f5] transition-colors">
                                            {/* Employee Name + Avatar */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e07850] to-[#d45a3a] text-white text-sm font-bold flex items-center justify-center ring-2 ring-white shadow-md">
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-[#1a1a1a]">
                                                            {employee.candidate_name || 'Unknown'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm text-[#6b6b6b]">
                                                    <Briefcase className="h-4 w-4 text-[#a0a0a0]" />
                                                    {employee.offer_role || 'Software Engineer'}
                                                </div>
                                            </td>

                                            {/* Email */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm text-[#6b6b6b]">
                                                    <Mail className="h-4 w-4 text-[#a0a0a0]" />
                                                    {employee.candidate_email}
                                                </div>
                                            </td>

                                            {/* Hired Date */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm text-[#6b6b6b]">
                                                    <Calendar className="h-4 w-4 text-[#a0a0a0]" />
                                                    {format(new Date(employee.updated_at), 'MMM d, yyyy')}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
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
