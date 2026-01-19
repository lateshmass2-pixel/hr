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
                    <h2 className="text-2xl font-bold text-white tracking-tight">Onboarded Employees</h2>
                    <p className="text-sm text-zinc-400 mt-1">
                        {hiredEmployees.length} employees successfully hired
                    </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-300 hover:bg-[#222] hover:border-[#333] rounded-lg font-medium text-sm transition-colors">
                    <Download className="h-4 w-4" />
                    Export CSV
                </button>
            </div>

            {/* Table */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-lg overflow-hidden">
                {hiredEmployees.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500">
                        No hired employees yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#0d0d0d] border-b border-[#2a2a2a]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                        Employee
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                        Hired Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2a2a2a]">
                                {hiredEmployees.map((employee) => {
                                    const initials = employee.candidate_name
                                        ? employee.candidate_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                                        : '??'

                                    return (
                                        <tr key={employee.id} className="hover:bg-[#222] transition-colors">
                                            {/* Employee Name + Avatar */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-400 text-white text-sm font-bold flex items-center justify-center ring-2 ring-[#1a1a1a]">
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-white">
                                                            {employee.candidate_name || 'Unknown'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                                    <Briefcase className="h-4 w-4 text-zinc-500" />
                                                    {employee.offer_role || 'Software Engineer'}
                                                </div>
                                            </td>

                                            {/* Email */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                                    <Mail className="h-4 w-4 text-zinc-500" />
                                                    {employee.candidate_email}
                                                </div>
                                            </td>

                                            {/* Hired Date */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                                    <Calendar className="h-4 w-4 text-zinc-500" />
                                                    {format(new Date(employee.updated_at), 'MMM d, yyyy')}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-medium">
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
