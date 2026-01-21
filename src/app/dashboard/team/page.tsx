"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
    Search,
    Filter,
    Download,
    Plus,
    MoreHorizontal,
    Users,
    UserCheck,
    UserX,
    UserPlus,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react"
import { useHems } from "@/context/HemsContext"
import { cn } from "@/lib/utils"

export default function TeamPage() {
    const { employees, addEmployee } = useHems()
    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 8

    // Stats Calculations
    const totalEmployees = employees.length
    const activeEmployees = employees.filter(e => e.status === "Active").length
    const inactiveEmployees = employees.filter(e => e.status === "Inactive").length
    const onboardingEmployees = employees.filter(e => e.status === "Onboarding").length

    // Filter Logic
    const filteredEmployees = employees.filter(employee =>
        employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.position.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Pagination Logic
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const currentEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage)

    const StatCard = ({ title, value, trend, trendUp, icon: Icon, colorClass }: any) => (
        <div className="bg-white rounded-2xl p-5 border border-[#e8e4e0] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-xl", colorClass)}>
                    <Icon size={20} className="text-current" />
                </div>
                {trend && (
                    <div className={cn(
                        "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
                        trendUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}>
                        {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {trend}
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <h3 className="text-2xl font-bold text-[#1a1a1a]">{value}</h3>
                <p className="text-[#6b6b6b] text-sm font-medium">{title}</p>
            </div>
        </div>
    )

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Employees"
                    value={totalEmployees}
                    trend="+12%"
                    trendUp={true}
                    icon={Users}
                    colorClass="bg-orange-50 text-orange-600"
                />
                <StatCard
                    title="Active"
                    value={activeEmployees}
                    trend="+5%"
                    trendUp={true}
                    icon={UserCheck}
                    colorClass="bg-emerald-50 text-emerald-600"
                />
                <StatCard
                    title="Inactive"
                    value={inactiveEmployees}
                    trend="-2%"
                    trendUp={false}
                    icon={UserX}
                    colorClass="bg-red-50 text-red-600"
                />
                <StatCard
                    title="Onboarding"
                    value={onboardingEmployees}
                    trend="+8%"
                    trendUp={true}
                    icon={UserPlus}
                    colorClass="bg-amber-50 text-amber-600"
                />
            </div>

            {/* Main Content Card */}
            <div className="bg-white border border-[#e8e4e0] rounded-3xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                {/* Toolbar */}
                <div className="p-5 border-b border-[#e8e4e0] flex flex-col md:flex-row justify-between gap-4 items-center bg-white sticky top-0 z-10">
                    {/* Search */}
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]" size={18} />
                        <input
                            type="text"
                            placeholder="Search employees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-[#faf8f5] border border-[#e8e4e0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e07850]/20 focus:border-[#e07850] transition-all"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e8e4e0] rounded-xl text-sm font-medium text-[#6b6b6b] hover:bg-[#faf8f5] transition-colors">
                            <Filter size={16} />
                            Filter
                        </button>
                        <button
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e8e4e0] rounded-xl text-sm font-medium text-[#6b6b6b] hover:bg-[#faf8f5] transition-colors"
                            onClick={() => {
                                // Create CSV content
                                const headers = ['Name', 'Email', 'ID', 'Position', 'Department', 'Created At', 'Status']
                                const csvContent = [
                                    headers.join(','),
                                    ...employees.map(e => [
                                        `"${e.full_name}"`,
                                        e.email,
                                        e.id.substring(0, 8),
                                        `"${e.position}"`,
                                        `"${e.department}"`,
                                        new Date(e.created_at).toLocaleDateString(),
                                        e.status
                                    ].join(','))
                                ].join('\n')

                                // Download
                                const blob = new Blob([csvContent], { type: 'text/csv' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`
                                a.click()
                                URL.revokeObjectURL(url)
                            }}
                        >
                            <Download size={16} />
                            Export
                        </button>
                        <button
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] text-white rounded-xl text-sm font-medium hover:bg-black transition-colors shadow-lg shadow-black/10 ml-auto md:ml-0"
                            onClick={() => {
                                // Add mock employee for demo
                                addEmployee({
                                    full_name: "New Employee",
                                    email: `new.user${Date.now()}@company.com`,
                                    position: "Onboarding Specialist",
                                    department: "HR",
                                    status: "Onboarding",
                                    created_at: new Date().toISOString(),
                                })
                            }}
                        >
                            <Plus size={18} />
                            Add New
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#faf8f5] border-b border-[#e8e4e0]">
                                <th className="p-4 pl-6 w-10">
                                    <input type="checkbox" className="rounded border-gray-300 text-[#e07850] focus:ring-[#e07850]" />
                                </th>
                                <th className="p-4 text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">Name</th>
                                <th className="p-4 text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">ID</th>
                                <th className="p-4 text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">Position</th>
                                <th className="p-4 text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">Department</th>
                                <th className="p-4 text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">Created At</th>
                                <th className="p-4 text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">Status</th>
                                <th className="p-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e8e4e0]">
                            {currentEmployees.length > 0 ? (
                                currentEmployees.map((employee) => (
                                    <tr key={employee.id} className="group hover:bg-[#faf8f5] transition-colors">
                                        <td className="p-4 pl-6">
                                            <input type="checkbox" className="rounded border-gray-300 text-[#e07850] focus:ring-[#e07850]" />
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                                    {employee.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-[#1a1a1a] text-sm">{employee.full_name}</div>
                                                    <div className="text-xs text-[#6b6b6b]">{employee.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-[#6b6b6b] font-mono">{employee.id.substring(0, 8)}...</td>
                                        <td className="p-4 text-sm font-medium text-[#1a1a1a]">{employee.position}</td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-[#6b6b6b] text-xs font-medium border border-gray-200">
                                                {employee.department}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-[#6b6b6b]">{new Date(employee.created_at).toLocaleDateString()}</td>
                                        <td className="p-4">
                                            <span className={cn(
                                                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                                                employee.status === "Active" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                                                employee.status === "Inactive" && "bg-red-50 text-red-700 border-red-200",
                                                employee.status === "Onboarding" && "bg-amber-50 text-amber-700 border-amber-200"
                                            )}>
                                                {employee.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <button className="p-2 text-[#a0a0a0] hover:text-[#1a1a1a] hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-[#faf8f5] rounded-full flex items-center justify-center">
                                                <Search className="text-[#a0a0a0]" size={32} />
                                            </div>
                                            <h3 className="text-[#1a1a1a] font-semibold">No employees found</h3>
                                            <p className="text-[#6b6b6b] text-sm">Try adjusting your search or filters</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-[#e8e4e0] flex items-center justify-between">
                    <div className="text-sm text-[#6b6b6b]">
                        Showing <span className="font-semibold text-[#1a1a1a]">{startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredEmployees.length)}</span> of <span className="font-semibold text-[#1a1a1a]">{filteredEmployees.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className="p-2 border border-[#e8e4e0] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#faf8f5] text-[#1a1a1a] transition-colors"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={cn(
                                        "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                                        currentPage === page
                                            ? "bg-[#1a1a1a] text-white"
                                            : "text-[#6b6b6b] hover:bg-[#faf8f5]"
                                    )}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                        <button
                            className="p-2 border border-[#e8e4e0] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#faf8f5] text-[#1a1a1a] transition-colors"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
