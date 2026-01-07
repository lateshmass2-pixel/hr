"use client"

import { motion } from "framer-motion"
import { BarChart3, Users, CheckSquare, TrendingUp, FileText, DollarSign, GraduationCap, UserPlus } from "lucide-react"

export function HeroMockup() {
    return (
        <div className="perspective-1000">
            <motion.div
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                className="relative preserve-3d"
                style={{
                    animation: "float 6s ease-in-out infinite",
                }}
            >
                {/* Orange glow behind */}
                <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-3xl blur-2xl" />

                {/* Main mockup container */}
                <div className="relative bg-white rounded-2xl shadow-2xl p-6 border border-gray-100">
                    {/* Mock Browser Chrome */}
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-400" />
                            <div className="w-3 h-3 rounded-full bg-yellow-400" />
                            <div className="w-3 h-3 rounded-full bg-green-400" />
                        </div>
                        <div className="flex-1 bg-gray-100 rounded px-3 py-1 text-xs text-gray-500 font-medium">
                            hems.app/dashboard
                        </div>
                    </div>

                    {/* Mock Dashboard Content */}
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="text-sm font-bold text-gray-900">Good Morning, Sarah</div>
                                <div className="text-xs text-gray-500">Tuesday, Jan 6, 2026</div>
                            </div>
                            <div className="bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                                + Add
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { icon: Users, label: "Employees", value: "247", color: "bg-blue-50 text-blue-600" },
                                { icon: UserPlus, label: "New Hires", value: "12", color: "bg-green-50 text-green-600" },
                                { icon: DollarSign, label: "Payroll", value: "$1.2M", color: "bg-purple-50 text-purple-600" },
                                { icon: TrendingUp, label: "Growth", value: "+18%", color: "bg-orange-50 text-orange-600" }
                            ].map((stat, i) => (
                                <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-gray-500">{stat.label}</span>
                                        <div className={`${stat.color} rounded-lg p-1.5`}>
                                            <stat.icon className="h-3 w-3" />
                                        </div>
                                    </div>
                                    <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Mini Chart */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <div className="text-xs font-semibold text-gray-700 mb-3">Hiring Pipeline</div>
                            <div className="flex items-end gap-1.5 h-16">
                                {[40, 65, 45, 80, 55, 70, 90, 75, 60, 85].map((height, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${height}%` }}
                                        transition={{ duration: 0.5, delay: 0.8 + i * 0.05 }}
                                        className="flex-1 bg-gradient-to-t from-orange-500 to-orange-300 rounded-t"
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2">
                            {[
                                { icon: FileText, label: "Reports" },
                                { icon: GraduationCap, label: "Learning" },
                                { icon: CheckSquare, label: "Tasks" },
                            ].map((action, i) => (
                                <div key={i} className="flex-1 bg-white border border-gray-200 rounded-lg p-2 text-center">
                                    <action.icon className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                                    <span className="text-xs text-gray-600">{action.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
