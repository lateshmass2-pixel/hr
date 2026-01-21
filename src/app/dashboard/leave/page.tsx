"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import {
    Calendar as CalendarIcon,
    Clock,
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
    Plus,
    Filter,
    Download,
    CheckCircle2,
    XCircle,
    AlertCircle,
    PartyPopper,
    Thermometer
} from "lucide-react"
import { useHems } from "@/context/HemsContext"
import { cn } from "@/lib/utils"
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    getDay,
    isToday,
    areIntervalsOverlapping
} from "date-fns"

export default function LeavePage() {
    const { leaves, employees, addLeave } = useHems()
    const [activeTab, setActiveTab] = useState<"calendar" | "requested" | "balances">("calendar")
    const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)) // Default to Jan 2026 for demo

    const [currentUser, setCurrentUser] = useState<any>(null)

    useEffect(() => {
        const supabase = createClient()
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
                setCurrentUser({ ...user, ...profile })
            }
        }
        getUser()
    }, [])

    // Calendar Calculations
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const startDayOfWeek = getDay(monthStart) // 0 = Sunday

    // Filter leaves based on role
    const visibleLeaves = (currentUser?.role === 'HR_ADMIN')
        ? leaves
        : leaves.filter(l => l.user_id === currentUser?.id)

    // Get leaves that overlap with the current month
    const currentMonthLeaves = visibleLeaves.filter(leave => {
        const leaveStart = new Date(leave.start_date)
        const leaveEnd = new Date(leave.end_date)

        return areIntervalsOverlapping(
            { start: leaveStart, end: leaveEnd },
            { start: monthStart, end: monthEnd }
        ) && leave.status === 'approved'
    })

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

    const getEmployee = (id: string) => employees.find(e => e.id === id)

    // Components
    const CalendarView = () => (
        <div className="bg-white rounded-3xl border border-[#e8e4e0] shadow-sm overflow-hidden flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
            {/* Calendar Header */}
            <div className="p-6 border-b border-[#e8e4e0] flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-[#1a1a1a]">
                        {format(currentDate, "MMMM yyyy")}
                    </h2>
                    <div className="flex items-center gap-1 bg-[#faf8f5] rounded-lg p-1 border border-[#e8e4e0]">
                        <button onClick={prevMonth} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-[#6b6b6b]">
                            <ChevronLeft size={16} />
                        </button>
                        <button onClick={nextMonth} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-[#6b6b6b]">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-[#6b6b6b] bg-[#faf8f5] px-3 py-1.5 rounded-full border border-[#e8e4e0]">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        Sick Leave
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-[#6b6b6b] bg-[#faf8f5] px-3 py-1.5 rounded-full border border-[#e8e4e0]">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        Annual Leave
                    </span>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 border-b border-[#e8e4e0] bg-[#faf8f5]">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-3 text-center text-xs font-semibold text-[#a0a0a0] uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 flex-1 overflow-y-auto bg-white">
                {/* Empty cells for start of month */}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[120px] p-2 border-b border-r border-[#f5f3f0]" />
                ))}

                {/* Days */}
                {daysInMonth.map(day => {
                    const activeLeaves = currentMonthLeaves.filter(leave => {
                        const start = new Date(leave.start_date)
                        const end = new Date(leave.end_date)
                        // Check if 'day' is within start and end inclusive
                        // Normalize dates to ignore time for comparison if needed, or rely on date objects
                        return (day >= start && day <= end) || isSameDay(day, start) || isSameDay(day, end)
                    })
                    const isTodayDate = isToday(day)

                    return (
                        <div
                            key={day.toISOString()}
                            className={cn(
                                "min-h-[120px] p-3 border-b border-r border-[#f5f3f0] hover:bg-[#faf8f5]/50 transition-colors group relative",
                                isTodayDate && "bg-[#faf8f5]"
                            )}
                        >
                            <span className={cn(
                                "text-sm font-medium inline-flex w-7 h-7 items-center justify-center rounded-full mb-2",
                                isTodayDate ? "bg-[#1a1a1a] text-white" : "text-[#6b6b6b] group-hover:text-[#1a1a1a]"
                            )}>
                                {format(day, "d")}
                            </span>

                            <div className="space-y-1.5">
                                {activeLeaves.map(leave => {
                                    const employee = getEmployee(leave.user_id)
                                    if (!employee) return null

                                    const isSick = leave.type === 'Sick'

                                    return (
                                        <motion.div
                                            key={leave.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={cn(
                                                "px-2 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 shadow-sm cursor-pointer hover:scale-[1.02] transition-transform",
                                                isSick
                                                    ? "bg-amber-50 text-gray-600 border-amber-100" // Yellow Emoji + Gray Text
                                                    : "bg-orange-50 text-orange-700 border-orange-100" // Orange Emoji + Orange Text
                                            )}
                                        >
                                            {isSick ? <Thermometer className="w-3 h-3 text-amber-500" /> : <PartyPopper className="w-3 h-3 text-orange-500" />}
                                            <span className="truncate max-w-[80px]">{employee.full_name.split(' ')[0]}</span>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )

    const PlaceholderView = ({ title, icon: Icon }: any) => (
        <div className="bg-white rounded-3xl border border-[#e8e4e0] p-12 text-center shadow-sm min-h-[500px] flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-[#faf8f5] rounded-2xl flex items-center justify-center mb-4">
                <Icon size={32} className="text-[#a0a0a0]" />
            </div>
            <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">{title}</h3>
            <p className="text-[#6b6b6b] max-w-sm mx-auto">
                This module is currently under development. Please check back later for full functionality.
            </p>
        </div>
    )

    return (
        <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                <div className="flex bg-[#faf8f5] p-1 rounded-xl border border-[#e8e4e0]">
                    {(currentUser?.role === 'HR_ADMIN' ? [
                        { id: 'requested', label: 'Requested' },
                        { id: 'balances', label: 'Balances' },
                        { id: 'calendar', label: 'Calendar' },
                    ] : [
                        { id: 'calendar', label: 'Calendar' }
                    ]).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "px-6 py-2.5 rounded-lg text-sm font-medium transition-all",
                                activeTab === tab.id
                                    ? "bg-white text-[#1a1a1a] shadow-sm border border-[#e8e4e0]/50"
                                    : "text-[#6b6b6b] hover:text-[#1a1a1a]"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e8e4e0] rounded-xl text-sm font-medium text-[#6b6b6b] hover:bg-[#faf8f5] transition-colors">
                        <Filter size={16} />
                        Filter
                    </button>
                    <button
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] text-white rounded-xl text-sm font-medium hover:bg-black transition-colors shadow-lg shadow-black/10"
                        onClick={() => {
                            // Demo add leave
                            const randomEmployee = employees[Math.floor(Math.random() * employees.length)]
                            const date = new Date(2026, 0, Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0]
                            addLeave({
                                user_id: randomEmployee.id,
                                type: Math.random() > 0.5 ? 'Sick' : 'Annual',
                                start_date: date,
                                end_date: date,
                                status: 'approved'
                            })
                        }}
                    >
                        <Plus size={18} />
                        Request Leave
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0">
                <AnimatePresence mode="wait">
                    {activeTab === 'calendar' && (
                        <CalendarView key="calendar" />
                    )}
                    {activeTab === 'requested' && (
                        <PlaceholderView key="requested" title="Leave Requests" icon={Clock} />
                    )}
                    {activeTab === 'balances' && (
                        <PlaceholderView key="balances" title="Leave Balances" icon={CheckCircle2} />
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
