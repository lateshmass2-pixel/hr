import { getAllEmployees } from '@/app/actions/performance'
import { PerformanceReviewPanel } from './review-panel'
import { Users, Sparkles, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PerformancePage() {
    const employees = await getAllEmployees()

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center shadow-lg">
                        <FileText className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#1a1a1a]">Performance Reviews</h2>
                        <p className="text-[#6b6b6b] text-sm mt-1">Generate and view AI-powered performance reviews for employees</p>
                    </div>
                </div>

                {/* Help Bubble */}
                <div className="hidden md:flex items-center gap-2 bg-white rounded-full px-5 py-3 shadow-md border border-[#e8e4e0]">
                    <Sparkles className="w-5 h-5 text-[#e07850]" />
                    <span className="text-[#1a1a1a] font-medium">Hey, Need help?</span>
                    <span className="text-2xl">👋</span>
                </div>
            </div>

            {employees.length === 0 ? (
                <div className="rounded-3xl bg-white border border-[#e8e4e0] p-12 text-center shadow-md">
                    <Users className="h-12 w-12 text-[#a0a0a0] mx-auto mb-4" />
                    <p className="text-[#6b6b6b]">No employees found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Side: Employee List */}
                    <div className="lg:col-span-1">
                        <div className="rounded-3xl bg-white border border-[#e8e4e0] shadow-md overflow-hidden sticky top-6">
                            <div className="p-4 border-b border-[#e8e4e0] bg-[#faf8f5]">
                                <h3 className="font-semibold text-[#1a1a1a] flex items-center gap-2">
                                    <Users className="h-5 w-5 text-[#e07850]" />
                                    Employees ({employees.length})
                                </h3>
                            </div>
                            <div className="divide-y divide-[#e8e4e0] max-h-[calc(100vh-200px)] overflow-y-auto">
                                {employees.map((employee) => (
                                    <a
                                        key={employee.id}
                                        href={`#employee-${employee.id}`}
                                        className="block p-4 hover:bg-[#e07850]/5 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center text-white text-sm font-semibold shrink-0 shadow-md">
                                                {(employee.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-medium text-[#1a1a1a] group-hover:text-[#e07850] transition-colors truncate">
                                                    {employee.full_name}
                                                </div>
                                                <div className="text-sm text-[#a0a0a0] truncate">{employee.position || 'Employee'}</div>
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Performance Reports */}
                    <div className="lg:col-span-2 space-y-6">
                        {employees.map((employee) => (
                            <div key={employee.id} id={`employee-${employee.id}`}>
                                <PerformanceReviewPanel employee={employee} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
