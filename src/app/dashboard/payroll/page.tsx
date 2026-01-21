"use client"

import { Wallet, TrendingUp, DollarSign, Users, Calendar, Download, ArrowUpRight, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function PayrollPage() {
    // Mock payroll data
    const stats = [
        { title: "Total Payroll", value: "$125,400", change: "+5.2%", changeUp: true, icon: DollarSign, color: "bg-emerald-50 text-emerald-600" },
        { title: "Employees", value: "48", change: "+3", changeUp: true, icon: Users, color: "bg-blue-50 text-blue-600" },
        { title: "Next Run", value: "Jan 31", change: "11 days", changeUp: null, icon: Calendar, color: "bg-purple-50 text-purple-600" },
        { title: "Avg. Salary", value: "$2,612", change: "+2.1%", changeUp: true, icon: TrendingUp, color: "bg-amber-50 text-amber-600" },
    ]

    const recentPayrolls = [
        { month: "January 2026", amount: "$125,400", employees: 48, status: "Pending" },
        { month: "December 2025", amount: "$122,800", employees: 47, status: "Completed" },
        { month: "November 2025", amount: "$121,500", employees: 46, status: "Completed" },
        { month: "October 2025", amount: "$119,200", employees: 45, status: "Completed" },
    ]

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center shadow-lg">
                        <Wallet className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#1a1a1a]">Payroll</h2>
                        <p className="text-[#6b6b6b] text-sm mt-1">Manage employee compensation and benefits.</p>
                    </div>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] text-white rounded-xl text-sm font-medium hover:bg-black transition-colors shadow-lg shadow-black/10">
                    <Download size={18} />
                    Export Report
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 border border-[#e8e4e0] shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn("p-3 rounded-xl", stat.color)}>
                                <stat.icon size={20} />
                            </div>
                            {stat.changeUp !== null && (
                                <div className={cn(
                                    "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
                                    stat.changeUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                )}>
                                    <ArrowUpRight size={14} className={!stat.changeUp ? "rotate-90" : ""} />
                                    {stat.change}
                                </div>
                            )}
                            {stat.changeUp === null && (
                                <span className="text-xs font-medium text-[#6b6b6b] bg-gray-100 px-2 py-1 rounded-full">
                                    {stat.change}
                                </span>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-bold text-[#1a1a1a]">{stat.value}</h3>
                            <p className="text-[#6b6b6b] text-sm font-medium">{stat.title}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Payrolls Table */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-[#e8e4e0] shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-[#e8e4e0]">
                        <h3 className="font-semibold text-[#1a1a1a]">Payroll History</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#faf8f5] border-b border-[#e8e4e0]">
                                    <th className="p-4 text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">Period</th>
                                    <th className="p-4 text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">Amount</th>
                                    <th className="p-4 text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">Employees</th>
                                    <th className="p-4 text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e8e4e0]">
                                {recentPayrolls.map((payroll, i) => (
                                    <tr key={i} className="hover:bg-[#faf8f5] transition-colors">
                                        <td className="p-4 font-medium text-[#1a1a1a]">{payroll.month}</td>
                                        <td className="p-4 font-semibold text-[#1a1a1a]">{payroll.amount}</td>
                                        <td className="p-4 text-[#6b6b6b]">{payroll.employees}</td>
                                        <td className="p-4">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-xs font-medium border",
                                                payroll.status === "Completed"
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                            )}>
                                                {payroll.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions Card */}
                <div className="bg-white rounded-3xl border border-[#e8e4e0] shadow-sm p-6">
                    <h3 className="font-semibold text-[#1a1a1a] mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <button className="w-full flex items-center gap-3 p-4 bg-[#faf8f5] rounded-xl hover:bg-[#f5f3f0] transition-colors text-left group">
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                                <DollarSign size={20} />
                            </div>
                            <div>
                                <p className="font-medium text-[#1a1a1a]">Run Payroll</p>
                                <p className="text-xs text-[#6b6b6b]">Process monthly payments</p>
                            </div>
                        </button>
                        <button className="w-full flex items-center gap-3 p-4 bg-[#faf8f5] rounded-xl hover:bg-[#f5f3f0] transition-colors text-left group">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                                <BarChart3 size={20} />
                            </div>
                            <div>
                                <p className="font-medium text-[#1a1a1a]">View Reports</p>
                                <p className="text-xs text-[#6b6b6b]">Detailed analytics</p>
                            </div>
                        </button>
                        <button className="w-full flex items-center gap-3 p-4 bg-[#faf8f5] rounded-xl hover:bg-[#f5f3f0] transition-colors text-left group">
                            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Users size={20} />
                            </div>
                            <div>
                                <p className="font-medium text-[#1a1a1a]">Manage Benefits</p>
                                <p className="text-xs text-[#6b6b6b]">Employee perks & plans</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
