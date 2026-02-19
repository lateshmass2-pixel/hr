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
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHero } from "@/components/layout/PageHero"
import { Card } from "@/components/ui/card"
import { theme } from "@/lib/theme"

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
        <Card noPadding className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
            {/* Calendar Header */}
            <div className="p-6 border-b border-green-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-[#14532d]">
                        {format(currentDate, "MMMM yyyy")}
                    </h2>
                    <div className="flex items-center gap-1 bg-[#f8faf6] rounded-lg p-1 border border-green-100">
                        <button onClick={prevMonth} className="p-1 hover:bg-white hover:text-[#14532d] hover:shadow-sm rounded-md transition-all text-slate-500">
                            <ChevronLeft size={16} />
                        </button>
                        <button onClick={nextMonth} className="p-1 hover:bg-white hover:text-[#14532d] hover:shadow-sm rounded-md transition-all text-slate-500">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-[#f8faf6] px-3 py-1.5 rounded-full border border-green-100">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        Sick Leave
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-[#f8faf6] px-3 py-1.5 rounded-full border border-green-100">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        Annual Leave
                    </span>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 border-b border-green-100 bg-[#f8faf6]/50">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-3 text-center text-xs font-semibold text-[#15803d] uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 flex-1 overflow-y-auto bg-white">
                {/* Empty cells for start of month */}
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-[120px] p-2 border-b border-r border-green-50" />
                ))}

                {/* Days */}
                {daysInMonth.map(day => {
                    const activeLeaves = currentMonthLeaves.filter(leave => {
                        const start = new Date(leave.start_date)
                        const end = new Date(leave.end_date)
                        return (day >= start && day <= end) || isSameDay(day, start) || isSameDay(day, end)
                    })
                    const isTodayDate = isToday(day)

                    return (
                        <div
                            key={day.toISOString()}
                            className={cn(
                                "min-h-[120px] p-3 border-b border-r border-green-50 hover:bg-[#f8faf6]/50 transition-colors group relative",
                                isTodayDate && "bg-[#f8faf6]"
                            )}
                        >
                            <span className={cn(
                                "text-sm font-medium inline-flex w-7 h-7 items-center justify-center rounded-full mb-2",
                                isTodayDate ? "bg-[#14532d] text-white" : "text-slate-400 group-hover:text-[#14532d]"
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
                                                    ? "bg-amber-50 text-amber-700 border-amber-100"
                                                    : "bg-orange-50 text-orange-700 border-orange-100"
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
        </Card>
    )

    const PlaceholderView = ({ title, icon: Icon }: any) => (
        <Card className="p-12 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 min-h-[500px]">
            <div className="w-16 h-16 bg-[#f8faf6] rounded-2xl flex items-center justify-center mb-4 border border-green-100">
                <Icon size={32} className="text-green-300" />
            </div>
            <h3 className="text-xl font-bold text-[#14532d] mb-2">{title}</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
                This module is currently under development. Please check back later for full functionality.
            </p>
        </Card>
    )

    return (
        <PageContainer>
            <PageHero
                title="Leave Management"
                subtitle="Track employee leave, approve requests, and manage workforce availability."
                action={
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-green-100 rounded-xl text-sm font-medium text-slate-600 hover:bg-[#f8faf6] hover:text-[#14532d] transition-colors">
                            <Filter size={16} />
                            Filter
                        </button>
                        {currentUser?.role !== 'HR_ADMIN' && (
                            <button
                                className={cn(theme.primaryButton, "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-green-900/10")}
                                onClick={() => {
                                    // Demo add leave
                                    const randomEmployee = employees[Math.floor(Math.random() * employees.length)]
                                    if (randomEmployee) {
                                        const date = new Date(2026, 0, Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0]
                                        addLeave({
                                            user_id: randomEmployee.id,
                                            type: Math.random() > 0.5 ? 'Sick' : 'Annual',
                                            start_date: date,
                                            end_date: date,
                                            status: 'approved'
                                        })
                                    }
                                }}
                            >
                                <Plus size={18} />
                                Request Leave
                            </button>
                        )}
                    </div>
                }
            />

            {/* Tabs */}
            <div className="flex bg-[#f8faf6] p-1 rounded-xl border border-green-100 w-fit">
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
                                ? "bg-white text-[#14532d] shadow-sm border border-green-100/50 font-semibold"
                                : "text-slate-500 hover:text-[#14532d]"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 pt-4">
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
        </PageContainer>
    )
}
