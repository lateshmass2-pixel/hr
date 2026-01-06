"use client";

import { motion } from "framer-motion";
import { Briefcase, CheckSquare, Users, TrendingUp, UserCheck, Calendar } from "lucide-react";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface DashboardClientProps {
    activeProjects: number;
    pendingTasks: number;
    applications: number;
    teamMembers: number;
    employees: any[];
    userName: string;
}

// Mock data for Application Trends (12 months)
const applicationTrendsData = [
    { month: 'Jan', applications: 45 },
    { month: 'Feb', applications: 52 },
    { month: 'Mar', applications: 38 },
    { month: 'Apr', applications: 65 },
    { month: 'May', applications: 78 },
    { month: 'Jun', applications: 56 },
    { month: 'Jul', applications: 89 },
    { month: 'Aug', applications: 72 },
    { month: 'Sep', applications: 95 },
    { month: 'Oct', applications: 110 },
    { month: 'Nov', applications: 88 },
    { month: 'Dec', applications: 120 },
];

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-semibold text-gray-900">
                    {payload[0].value} {payload[0].dataKey === 'applications' ? 'applications' : 'present'}
                </p>
            </div>
        );
    }
    return null;
};

export default function DashboardClient({
    activeProjects,
    pendingTasks,
    applications,
    teamMembers,
    employees,
    userName
}: DashboardClientProps) {

    // Calculate real attendance data based on employees count
    const presentCount = employees.length;
    const today = new Date().getDay();

    const attendanceData = [
        { day: 'Mon', present: today >= 1 ? Math.round(teamMembers * 0.92) : 0, late: today >= 1 ? Math.round(teamMembers * 0.08) : 0 },
        { day: 'Tue', present: today >= 2 ? Math.round(teamMembers * 0.88) : 0, late: today >= 2 ? Math.round(teamMembers * 0.12) : 0 },
        { day: 'Wed', present: today >= 3 ? Math.round(teamMembers * 0.95) : 0, late: today >= 3 ? Math.round(teamMembers * 0.05) : 0 },
        { day: 'Thu', present: today >= 4 ? Math.round(teamMembers * 0.90) : 0, late: today >= 4 ? Math.round(teamMembers * 0.10) : 0 },
        { day: 'Fri', present: today >= 5 ? presentCount : 0, late: today >= 5 ? Math.max(0, teamMembers - presentCount) : 0 },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome back, {userName}</h1>
                    <p className="text-gray-500 text-sm mt-1">Here's what's happening with your team today.</p>
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                    <Calendar size={16} />
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Team Members", value: teamMembers, icon: Users, color: "orange", change: "+3 this month" },
                    { label: "Active Projects", value: activeProjects, icon: Briefcase, color: "blue", change: "2 due this week" },
                    { label: "Pending Tasks", value: pendingTasks, icon: CheckSquare, color: "amber", change: "5 overdue" },
                    { label: "Candidates", value: applications, icon: UserCheck, color: "emerald", change: "12 new this week" },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                                    stat.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                        stat.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                                            'bg-emerald-100 text-emerald-600'
                                }`}>
                                <stat.icon size={20} />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                        <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                        <div className="text-xs text-gray-400 mt-2">{stat.change}</div>
                    </motion.div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Application Trends - Area Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl border border-gray-200 p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900">Application Trends</h3>
                            <p className="text-sm text-gray-500 mt-0.5">Monthly candidate applications</p>
                        </div>
                        <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                            <TrendingUp size={12} />
                            +18%
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={applicationTrendsData}>
                                <defs>
                                    <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="applications"
                                    stroke="#F97316"
                                    strokeWidth={2}
                                    fill="url(#colorApplications)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Weekly Attendance - Bar Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="bg-white rounded-xl border border-gray-200 p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900">Weekly Attendance</h3>
                            <p className="text-sm text-gray-500 mt-0.5">Employee presence this week</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-emerald-500"></span>
                                Present
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-orange-500"></span>
                                Late
                            </span>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attendanceData} barGap={4}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#6B7280' }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar
                                    dataKey="present"
                                    fill="#10B981"
                                    radius={[4, 4, 0, 0]}
                                    name="Present"
                                />
                                <Bar
                                    dataKey="late"
                                    fill="#F97316"
                                    radius={[4, 4, 0, 0]}
                                    name="Late"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Row: Table + Team Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Attendance Table */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-gray-900">Today's Attendance</h3>
                        <a href="#" className="text-orange-600 text-sm font-medium hover:underline">View All</a>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Employee</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Department</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Check In</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {employees.length > 0 ? employees.slice(0, 5).map((emp, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white text-xs font-semibold">
                                                    {(emp.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                                </div>
                                                <span className="font-medium text-gray-900">{emp.full_name || emp.email}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">{emp.department || 'General'}</td>
                                        <td className="py-3 px-4 text-gray-600">
                                            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                                Present
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-gray-400">
                                            No employees in system yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Team Overview */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="bg-white rounded-xl border border-gray-200 p-6"
                >
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Team Overview</h3>

                    {(() => {
                        const totalEmployees = teamMembers || 0;
                        const presentToday = employees.length;
                        const absentToday = Math.max(0, totalEmployees - presentToday);
                        const presentPercent = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0;
                        const absentPercent = 100 - presentPercent;

                        return (
                            <>
                                {/* Donut Chart */}
                                <div className="relative w-36 h-36 mx-auto mb-4">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="14" fill="none" stroke="#F3F4F6" strokeWidth="4" />
                                        <circle
                                            cx="18" cy="18" r="14"
                                            fill="none"
                                            stroke="#10B981"
                                            strokeWidth="4"
                                            strokeDasharray={`${presentPercent} ${absentPercent}`}
                                            strokeLinecap="round"
                                        />
                                        {absentPercent > 0 && (
                                            <circle
                                                cx="18" cy="18" r="14"
                                                fill="none"
                                                stroke="#F97316"
                                                strokeWidth="4"
                                                strokeDasharray={`${absentPercent} ${presentPercent}`}
                                                strokeDashoffset={`-${presentPercent}`}
                                                strokeLinecap="round"
                                            />
                                        )}
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-bold text-gray-900">{totalEmployees}</span>
                                        <span className="text-xs text-gray-500">Total</span>
                                    </div>
                                </div>

                                {/* Legend */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                            <span className="text-gray-600">Present Today</span>
                                        </div>
                                        <span className="font-medium text-gray-900">{presentToday} ({presentPercent}%)</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                            <span className="text-gray-600">Not Checked In</span>
                                        </div>
                                        <span className="font-medium text-gray-900">{absentToday} ({absentPercent}%)</span>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </motion.div>
            </div>
        </div>
    );
}
