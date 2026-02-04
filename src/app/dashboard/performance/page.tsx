import { getAllEmployees, getAllReviews } from '@/app/actions/performance'
import { PerformanceReviewPanel } from './review-panel'
import { Users, Sparkles, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PerformancePage() {
    const employees = await getAllEmployees()
    const reviews = employees.length > 0 ? await getAllReviews(employees.map(e => e.id)) : []

    // Create a map for faster lookup
    const reviewsMap = new Map(reviews.map(r => [r.employee_id, r]))

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <FileText className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Performance Reviews</h2>
                        <p className="text-gray-500 text-sm mt-1">Generate and view AI-powered performance reviews for employees</p>
                    </div>
                </div>
            </div>

            {employees.length === 0 ? (
                <div className="rounded-3xl bg-white border border-gray-100 p-12 text-center shadow-sm">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No employees found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Side: Employee List */}
                    <div className="lg:col-span-1">
                        <div className="rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden sticky top-6">
                            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Users className="h-5 w-5 text-orange-500" />
                                    Employees <span className="text-gray-400 font-normal">({employees.length})</span>
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-100 max-h-[calc(100vh-200px)] overflow-y-auto">
                                {employees.map((employee) => (
                                    <a
                                        key={employee.id}
                                        href={`#employee-${employee.id}`}
                                        className="block p-4 hover:bg-orange-50/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 text-sm font-bold shrink-0 shadow-sm group-hover:from-orange-500 group-hover:to-amber-500 group-hover:text-white transition-all">
                                                {(employee.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                                                    {employee.full_name}
                                                </div>
                                                <div className="text-xs text-gray-500 truncate font-medium">{employee.position || 'Employee'}</div>
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
                            <div key={employee.id} id={`employee-${employee.id}`} className="scroll-mt-6">
                                <PerformanceReviewPanel
                                    employee={employee}
                                    review={reviewsMap.get(employee.id)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
