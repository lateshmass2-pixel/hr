'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
    CheckCircle, Clock, AlertCircle, Loader2, ChevronRight,
    Mail, Laptop, Gift, Package, Truck, User
} from 'lucide-react'

// Task state type definition
interface TasksState {
    signedOffer: boolean
    backgroundCheck: boolean | 'pending'
    companyEmail: boolean
    equipmentShipped: boolean | 'shipping'
    swagSent: boolean
}

// Onboarding Employees (fetched from Supabase)
const ONBOARDING_EMPLOYEES: {
    id: number
    name: string
    role: string
    startDate: string
    daysUntilStart: number
    progress: number
    avatar: string
    tasks: TasksState
}[] = []

export default function OnboardingPage() {
    const [selectedEmployee, setSelectedEmployee] = useState(ONBOARDING_EMPLOYEES[0])
    const [tasks, setTasks] = useState<TasksState>(selectedEmployee.tasks)

    // Calculate progress based on completed tasks
    function calculateProgress() {
        const taskValues = Object.values(tasks)
        const completed = taskValues.filter(t => t === true).length
        const pending = taskValues.filter(t => t === 'pending' || t === 'shipping').length
        return Math.round(((completed + pending * 0.5) / taskValues.length) * 100)
    }

    const progress = calculateProgress()

    function handleSelectEmployee(employee: typeof ONBOARDING_EMPLOYEES[0]) {
        setSelectedEmployee(employee)
        setTasks(employee.tasks)
    }

    function handleToggleTask(taskKey: string) {
        setTasks(prev => ({
            ...prev,
            [taskKey]: prev[taskKey as keyof typeof prev] === true ? false : true
        }))
    }

    // Circular Progress Ring Component
    function ProgressRing({ value }: { value: number }) {
        const radius = 80
        const stroke = 12
        const normalizedRadius = radius - stroke / 2
        const circumference = normalizedRadius * 2 * Math.PI
        const strokeDashoffset = circumference - (value / 100) * circumference

        return (
            <div className="relative">
                <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
                    {/* Background Circle */}
                    <circle
                        stroke="#f3f4f6"
                        fill="transparent"
                        strokeWidth={stroke}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                    {/* Progress Circle */}
                    <motion.circle
                        stroke="url(#gradient)"
                        fill="transparent"
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        style={{
                            strokeDasharray: circumference,
                        }}
                    />
                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f97316" />
                            <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">{value}%</span>
                    <span className="text-xs text-gray-500">Ready for Day 1</span>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header with Progress Ring */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Onboarding Hub</h2>
                    <p className="text-gray-500 text-sm mt-1">Track new hire preparation progress</p>
                </div>
                <ProgressRing value={progress} />
            </div>

            {/* New Hire Reel */}
            <div className="overflow-x-auto pb-2">
                <div className="flex gap-4 min-w-max">
                    {ONBOARDING_EMPLOYEES.map(employee => (
                        <motion.button
                            key={employee.id}
                            onClick={() => handleSelectEmployee(employee)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`flex-shrink-0 w-56 bg-white rounded-xl p-5 text-left transition-all ${selectedEmployee.id === employee.id
                                ? 'border-2 border-orange-400 shadow-md'
                                : 'border border-gray-200 shadow-sm hover:shadow-md'
                                }`}
                        >
                            {/* Avatar */}
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white text-lg font-bold mx-auto mb-3">
                                {employee.avatar}
                            </div>

                            {/* Name & Role */}
                            <h3 className="font-semibold text-gray-900 text-center">{employee.name}</h3>
                            <p className="text-sm text-gray-500 text-center">{employee.role}</p>

                            {/* Start Date */}
                            <p className={`text-xs text-center mt-2 font-medium ${employee.daysUntilStart <= 3 ? 'text-emerald-600' : 'text-gray-500'
                                }`}>
                                Starts in {employee.daysUntilStart} day{employee.daysUntilStart !== 1 ? 's' : ''}
                            </p>

                            {/* Progress Bar */}
                            <div className="mt-3">
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-400 to-red-400 rounded-full transition-all"
                                        style={{ width: `${employee.progress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-400 text-center mt-1">{employee.progress}% complete</p>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Task Command Center - Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Checklist */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <User size={18} className="text-orange-500" />
                        Onboarding Checklist - {selectedEmployee.name}
                    </h3>

                    {/* Pre-boarding Group */}
                    <div className="mb-6">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Pre-boarding</h4>
                        <div className="space-y-3">
                            {/* Signed Offer Letter */}
                            <div
                                onClick={() => handleToggleTask('signedOffer')}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${tasks.signedOffer ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                                    }`}
                            >
                                {tasks.signedOffer ? (
                                    <CheckCircle size={20} className="text-green-600" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                                )}
                                <span className={`flex-1 ${tasks.signedOffer ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                                    Signed Offer Letter
                                </span>
                                {tasks.signedOffer && (
                                    <span className="text-xs text-green-600 font-medium">Completed</span>
                                )}
                            </div>

                            {/* Background Check */}
                            <div className={`flex items-center gap-3 p-3 rounded-lg ${tasks.backgroundCheck === true ? 'bg-green-50' :
                                tasks.backgroundCheck === 'pending' ? 'bg-orange-50' : 'bg-gray-50'
                                }`}>
                                {tasks.backgroundCheck === true ? (
                                    <CheckCircle size={20} className="text-green-600" />
                                ) : tasks.backgroundCheck === 'pending' ? (
                                    <Loader2 size={20} className="text-orange-500 animate-spin" />
                                ) : (
                                    <Clock size={20} className="text-gray-400" />
                                )}
                                <span className={`flex-1 ${tasks.backgroundCheck === true ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                                    Background Check
                                </span>
                                {tasks.backgroundCheck === 'pending' && (
                                    <span className="text-xs text-orange-600 font-medium">In Progress</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Day 1 Logistics Group */}
                    <div className="mb-6">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Day 1 Logistics</h4>
                        <div className="space-y-3">
                            {/* Company Email */}
                            <div className={`flex items-center gap-3 p-3 rounded-lg ${tasks.companyEmail ? 'bg-green-50' : 'bg-gray-50'
                                }`}>
                                {tasks.companyEmail ? (
                                    <CheckCircle size={20} className="text-green-600" />
                                ) : (
                                    <Mail size={20} className="text-gray-400" />
                                )}
                                <span className={`flex-1 ${tasks.companyEmail ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                                    Assign Company Email
                                </span>
                                {!tasks.companyEmail && (
                                    <button
                                        onClick={() => handleToggleTask('companyEmail')}
                                        className="px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition-colors"
                                    >
                                        Auto-Generate
                                    </button>
                                )}
                            </div>

                            {/* Equipment */}
                            <div className={`flex items-center gap-3 p-3 rounded-lg ${tasks.equipmentShipped === true ? 'bg-green-50' :
                                tasks.equipmentShipped === 'shipping' ? 'bg-blue-50' : 'bg-gray-50'
                                }`}>
                                {tasks.equipmentShipped === true ? (
                                    <CheckCircle size={20} className="text-green-600" />
                                ) : tasks.equipmentShipped === 'shipping' ? (
                                    <Truck size={20} className="text-blue-500" />
                                ) : (
                                    <Laptop size={20} className="text-gray-400" />
                                )}
                                <span className={`flex-1 ${tasks.equipmentShipped === true ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                                    Ship MacBook Pro
                                </span>
                                {!tasks.equipmentShipped && (
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                setTasks(prev => ({ ...prev, equipmentShipped: 'shipping' }))
                                            }
                                        }}
                                        className="px-3 py-1.5 border border-gray-300 text-xs rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    >
                                        <option value="">Select Device</option>
                                        <option value="mbp14">MacBook Pro 14" M3</option>
                                        <option value="mbp16">MacBook Pro 16" M3</option>
                                        <option value="mba">MacBook Air M2</option>
                                    </select>
                                )}
                                {tasks.equipmentShipped === 'shipping' && (
                                    <span className="text-xs text-blue-600 font-medium">Shipping</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Swag & Welcome Kit */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Welcome Kit</h4>
                        <div className="space-y-3">
                            <div
                                onClick={() => handleToggleTask('swagSent')}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${tasks.swagSent ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                                    }`}
                            >
                                {tasks.swagSent ? (
                                    <CheckCircle size={20} className="text-green-600" />
                                ) : (
                                    <Gift size={20} className="text-gray-400" />
                                )}
                                <span className={`flex-1 ${tasks.swagSent ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                                    Send Welcome Swag Box
                                </span>
                                {tasks.swagSent && (
                                    <span className="text-xs text-green-600 font-medium">Sent</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Visual Status */}
                <div className="space-y-4">
                    {/* Device Status Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Laptop size={16} className="text-blue-500" />
                            Device Status
                        </h4>
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center mb-3">
                                <Laptop size={40} className="text-gray-500" />
                            </div>
                            {tasks.equipmentShipped === 'shipping' ? (
                                <>
                                    <p className="font-medium text-gray-900">Shipping Label Created</p>
                                    <p className="text-xs text-gray-500 mt-1">Tracking #12345678</p>
                                    <div className="flex items-center justify-center gap-1 mt-2 text-blue-600 text-xs">
                                        <Truck size={12} />
                                        In Transit
                                    </div>
                                </>
                            ) : tasks.equipmentShipped === true ? (
                                <>
                                    <p className="font-medium text-green-700">Delivered</p>
                                    <p className="text-xs text-gray-500 mt-1">Received by employee</p>
                                </>
                            ) : (
                                <>
                                    <p className="font-medium text-gray-600">Not Assigned</p>
                                    <p className="text-xs text-gray-400 mt-1">Select device from checklist</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Welcome Kit Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Package size={16} className="text-orange-500" />
                            Welcome Kit
                        </h4>
                        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 text-center">
                            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-400 to-red-400 rounded-xl flex items-center justify-center mb-3 shadow-lg">
                                <Gift size={40} className="text-white" />
                            </div>
                            <p className="font-medium text-gray-900">Company Swag Box</p>
                            <p className="text-xs text-gray-500 mt-1">T-shirt, Stickers, Notebook</p>
                            {!tasks.swagSent ? (
                                <button
                                    onClick={() => handleToggleTask('swagSent')}
                                    className="mt-3 w-full px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Gift size={16} />
                                    Send Swag
                                </button>
                            ) : (
                                <div className="mt-3 flex items-center justify-center gap-2 text-green-600 text-sm font-medium">
                                    <CheckCircle size={16} />
                                    Swag Sent!
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <h4 className="font-semibold text-gray-900 mb-3">Quick Stats</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Start Date</span>
                                <span className="font-medium text-gray-900">{selectedEmployee.startDate}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Days Until Start</span>
                                <span className={`font-medium ${selectedEmployee.daysUntilStart <= 3 ? 'text-emerald-600' : 'text-gray-900'}`}>
                                    {selectedEmployee.daysUntilStart} days
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Preparation</span>
                                <span className="font-medium text-orange-600">{progress}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
