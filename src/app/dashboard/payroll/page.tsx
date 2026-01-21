"use client"

import { useHems } from "@/context/HemsContext"
import { Wallet, TrendingUp, DollarSign, Users, Calendar, Download, AlertCircle, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { GradientStatCard, SoftCard } from "@/components/ui/gradient-stat-card"
import { format, addDays, endOfMonth } from "date-fns"

export default function PayrollPage() {
    const { employees } = useHems()

    // Calculate real stats from employee data
    const employeeCount = employees.length
    const avgSalary = employeeCount > 0 ? Math.round(45000 / 12) : 0 // Placeholder until salary field exists
    const totalPayroll = employeeCount * avgSalary

    // Calculate next payroll date (end of current month)
    const today = new Date()
    const nextPayrollDate = endOfMonth(today)
    const daysUntilPayroll = Math.ceil((nextPayrollDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payroll</h1>
                    <p className="text-gray-500 mt-1">Manage employee compensation and benefits</p>
                </div>
                <button className="pill-button-primary flex items-center gap-2">
                    <Download size={16} />
                    Export Report
                </button>
            </div>

            {/* Stats Grid - Using Real Employee Count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <GradientStatCard
                    title="Total Payroll"
                    value={`$${totalPayroll.toLocaleString()}`}
                    subtitle="Monthly estimate"
                    icon={<DollarSign size={18} />}
                    variant="mint"
                />
                <GradientStatCard
                    title="Employees"
                    value={employeeCount}
                    subtitle="On payroll"
                    icon={<Users size={18} />}
                    variant="pink"
                />
                <GradientStatCard
                    title="Next Run"
                    value={format(nextPayrollDate, 'MMM d')}
                    subtitle={`${daysUntilPayroll} days`}
                    icon={<Calendar size={18} />}
                    variant="peach"
                />
                <GradientStatCard
                    title="Avg. Salary"
                    value={`$${avgSalary.toLocaleString()}`}
                    subtitle="Per month"
                    icon={<TrendingUp size={18} />}
                    variant="peach"
                />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Employee List for Payroll */}
                <SoftCard className="lg:col-span-2">
                    <h3 className="font-bold text-gray-900 mb-4">Employees on Payroll</h3>

                    {employees.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                                        <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Position</th>
                                        <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                                        <th className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {employees.map((emp: any, i: number) => (
                                        <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-3">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                                        style={{ background: ['#F97316', '#14B8A6', '#F59E0B', '#EC4899'][i % 4] }}
                                                    >
                                                        {emp.full_name?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-gray-900">{emp.full_name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 text-gray-600">{emp.position || '-'}</td>
                                            <td className="py-3 text-gray-600">{emp.department || '-'}</td>
                                            <td className="py-3">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-full text-xs font-medium",
                                                    emp.status === 'Active'
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-gray-100 text-gray-600"
                                                )}>
                                                    {emp.status || 'Active'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h4 className="font-medium text-gray-900 mb-1">No Employees</h4>
                            <p className="text-sm text-gray-500">Add employees to manage payroll</p>
                        </div>
                    )}
                </SoftCard>

                {/* Quick Actions Card */}
                <SoftCard>
                    <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <button className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left group">
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                                <DollarSign size={20} />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">Run Payroll</p>
                                <p className="text-xs text-gray-500">Process monthly payments</p>
                            </div>
                        </button>
                        <button className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left group">
                            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                                <BarChart3 size={20} />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">View Reports</p>
                                <p className="text-xs text-gray-500">Detailed analytics</p>
                            </div>
                        </button>
                        <button className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left group">
                            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Users size={20} />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">Manage Benefits</p>
                                <p className="text-xs text-gray-500">Employee perks & plans</p>
                            </div>
                        </button>
                    </div>
                </SoftCard>
            </div>
        </div>
    )
}
