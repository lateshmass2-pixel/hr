import { getAllEmployees } from '@/app/actions/performance'
import { PerformanceReviewPanel } from './review-panel'
import { Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function PerformancePage() {
    const employees = await getAllEmployees()

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Performance Reviews</h2>
                <p className="text-gray-500 mt-1">Generate and view AI-powered performance reviews for employees</p>
            </div>

            {employees.length === 0 ? (
                <div className="rounded-xl bg-white border border-gray-200 p-12 text-center shadow-sm">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No employees found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Side: Employee List */}
                    <div className="lg:col-span-1">
                        <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden sticky top-6">
                            <div className="p-4 border-b border-gray-200 bg-gray-50">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Users className="h-5 w-5 text-orange-600" />
                                    Employees ({employees.length})
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-100 max-h-[calc(100vh-200px)] overflow-y-auto">
                                {employees.map((employee) => (
                                    <a
                                        key={employee.id}
                                        href={`#employee-${employee.id}`}
                                        className="block p-4 hover:bg-orange-50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                                                {(employee.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-medium text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                                                    {employee.full_name}
                                                </div>
                                                <div className="text-sm text-gray-500 truncate">{employee.position || 'Employee'}</div>
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
