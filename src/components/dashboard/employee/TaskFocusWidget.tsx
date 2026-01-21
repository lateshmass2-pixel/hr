'use client'

import { motion } from 'framer-motion'
import { Video, Figma, CheckCircle2, Circle, Clock } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Task {
    id: string
    title: string
    deadline?: string | null
    status: string
}

// Mock Agenda Items
const agenda = [
    { id: 'ev-1', time: '09:00 AM', title: 'Team Standup', type: 'meeting', icon: Video, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'ev-2', time: '11:00 AM', title: 'Submit UI Mockups', type: 'work', icon: Figma, color: 'text-purple-500', bg: 'bg-purple-50' },
]

export function TaskFocusWidget({ tasks }: { tasks: Task[] }) {
    // Filter tasks due today or soon
    // For visual demo, we take the top 3 tasks from props
    const todoTasks = tasks.slice(0, 3)

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 h-full flex flex-col">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                Today's Focus
            </h3>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-8 relative pl-4">
                    {/* Timeline Line */}
                    <div className="absolute left-[19px] top-2 bottom-4 w-0.5 bg-gray-100 -z-10" />

                    {/* Agenda Section */}
                    {agenda.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.15 }}
                            className="relative flex items-start gap-4 group"
                        >
                            <div className={cn(
                                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10 box-content",
                                item.bg, item.color
                            )}>
                                <item.icon size={16} />
                            </div>
                            <div className="flex-1 pt-1.5 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group-hover:shadow-sm border border-transparent group-hover:border-gray-100">
                                <span className="text-xs font-bold text-gray-400 block mb-0.5">{item.time}</span>
                                <span className="text-gray-900 font-semibold text-sm">{item.title}</span>
                            </div>
                        </motion.div>
                    ))}

                    {/* Separator */}
                    <div className="relative py-2">
                        <span className="bg-white px-2 text-xs font-medium text-gray-400 relative z-10 ml-8">To Do</span>
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-100 -z-0 ml-10" />
                    </div>

                    {/* Actual Tasks */}
                    {todoTasks.map((task, index) => (
                        <TaskItem key={task.id} task={task} index={index + agenda.length} />
                    ))}

                    {todoTasks.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-gray-400 text-sm">No pending tasks!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function TaskItem({ task, index }: { task: Task; index: number }) {
    const [checked, setChecked] = useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15 }}
            className="relative flex items-start gap-4 group cursor-pointer"
            onClick={() => setChecked(!checked)}
        >
            <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10 transition-colors duration-300",
                checked ? "bg-emerald-500 text-white" : "bg-white border-gray-200 text-gray-300 hover:border-orange-300 hover:text-orange-300"
            )}>
                {checked ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </div>
            <div className="flex-1 pt-2">
                <span className={cn(
                    "font-medium text-sm transition-all duration-300 block",
                    checked ? "text-gray-400 line-through" : "text-gray-700"
                )}>
                    {task.title}
                </span>
                {task.deadline && (
                    <span className="text-xs text-orange-400/80 mt-0.5 block">Due {new Date(task.deadline).toLocaleDateString()}</span>
                )}
            </div>
        </motion.div>
    )
}
