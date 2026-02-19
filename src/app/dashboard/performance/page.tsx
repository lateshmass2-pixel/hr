import { getAllEmployees, getAllReviews } from '@/app/actions/performance'
import { PerformanceReviewPanel } from './review-panel'
import { Users, FileText } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHero } from '@/components/layout/PageHero'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function PerformancePage() {
    const employees = await getAllEmployees()
    const reviews = employees.length > 0 ? await getAllReviews(employees.map(e => e.id)) : []

    // Create a map for faster lookup
    const reviewsMap = new Map(reviews.map(r => [r.employee_id, r]))

    return (
        <PageContainer>
            <PageHero
                title="Performance Reviews"
                subtitle="Generate and view AI-powered performance reviews for employees"
            />

            {employees.length === 0 ? (
                <Card className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-16 h-16 bg-[#f8faf6] rounded-2xl flex items-center justify-center mb-4 border border-green-100">
                        <Users className="h-8 w-8 text-green-300 mx-auto" />
                    </div>
                    <p className="text-slate-500">No employees found.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Side: Employee List */}
                    <div className="lg:col-span-1">
                        <Card noPadding className="sticky top-6 overflow-hidden">
                            <div className="p-5 border-b border-green-100 bg-[#f8faf6]">
                                <h3 className="font-semibold text-[#14532d] flex items-center gap-2">
                                    <Users className="h-5 w-5 text-green-600" />
                                    Employees <span className="text-slate-400 font-normal">({employees.length})</span>
                                </h3>
                            </div>
                            <div className="divide-y divide-green-50 max-h-[calc(100vh-200px)] overflow-y-auto">
                                {employees.map((employee) => (
                                    <a
                                        key={employee.id}
                                        href={`#employee-${employee.id}`}
                                        className="block p-4 hover:bg-green-50/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#14532d] to-[#166534] flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm transition-all group-hover:scale-105">
                                                {(employee.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-[#14532d] group-hover:text-green-700 transition-colors truncate">
                                                    {employee.full_name}
                                                </div>
                                                <div className="text-xs text-slate-500 truncate font-medium">{employee.position || 'Employee'}</div>
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </Card>
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
        </PageContainer>
    )
}
