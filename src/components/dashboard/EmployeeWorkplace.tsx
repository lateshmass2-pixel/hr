'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
    Crown, Wrench, Clock, ArrowRight, CheckCircle2,
    Calendar, AlertCircle, TrendingUp
} from 'lucide-react'
import { useHems } from '@/context/HemsContext'
import { format, isPast, isToday, addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { TaskVelocityChart } from './TaskVelocityChart'

export function EmployeeWorkplace() {
    const {
        currentUser,
        getProjectsAsLeader,
        getProjectsAsMember,
        getMyTasks,
        users,
        tasks,
        projects
    } = useHems()

    const projectsAsLeader = getProjectsAsLeader()
    const projectsAsMember = getProjectsAsMember()
    const myTasks = getMyTasks()

    // Get tasks due soon (within 7 days)
    const tasksDueSoon = myTasks
        .filter(t => t.status !== 'Done' && t.dueDate)
        .filter(t => {
            const due = new Date(t.dueDate!)
            return isPast(due) || due <= addDays(new Date(), 7)
        })
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())

    // Stats
    const completedTasks = myTasks.filter(t => t.status === 'Done').length
    const pendingTasks = myTasks.filter(t => t.status !== 'Done').length
    const overdueTasks = myTasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'Done').length

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center shadow-lg">
                        {currentUser.avatar ? (
                            <img src={currentUser.avatar} className="w-full h-full rounded-2xl object-cover" alt="" />
                        ) : (
                            <span className="text-white font-bold text-xl">
                                {currentUser.name.split(' ').map(n => n[0]).join('')}
                            </span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#1a1a1a]">
                            Welcome back, {currentUser.name.split(' ')[0]} 👋
                        </h1>
                        <p className="text-[#6b6b6b] text-sm mt-1">
                            {currentUser.jobTitle} • {pendingTasks} tasks pending
                        </p>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium border border-emerald-200">
                        <CheckCircle2 size={16} />
                        {completedTasks} Completed
                    </div>
                    {overdueTasks > 0 && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-full text-sm font-medium border border-red-200">
                            <AlertCircle size={16} />
                            {overdueTasks} Overdue
                        </div>
                    )}
                </div>
            </div>

            {/* Task Velocity Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <TaskVelocityChart completedTasks={completedTasks} pendingTasks={pendingTasks} />
                </div>
            </div>

            {/* Projects I Lead Section */}
            {projectsAsLeader.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-amber-500" />
                        <h2 className="text-lg font-bold text-[#1a1a1a]">Projects I Lead</h2>
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium border border-amber-200">
                            {projectsAsLeader.length}
                        </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {projectsAsLeader.map(project => (
                            <ProjectCard key={project.id} project={project} isLeader />
                        ))}
                    </div>
                </section>
            )}

            {/* Projects Assigned to Me Section */}
            {projectsAsMember.length > 0 && (
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-blue-500" />
                        <h2 className="text-lg font-bold text-[#1a1a1a]">Projects Assigned to Me</h2>
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium border border-blue-200">
                            {projectsAsMember.length}
                        </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {projectsAsMember.map(project => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                </section>
            )}

            {/* My Tasks Due Soon Section */}
            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#e07850]" />
                    <h2 className="text-lg font-bold text-[#1a1a1a]">My Tasks Due Soon</h2>
                    <span className="bg-[#e07850]/10 text-[#e07850] px-2 py-0.5 rounded-full text-xs font-medium border border-[#e07850]/20">
                        {tasksDueSoon.length}
                    </span>
                </div>

                <div className="bg-white rounded-3xl border border-[#e8e4e0] shadow-md overflow-hidden">
                    {tasksDueSoon.length > 0 ? (
                        <div className="divide-y divide-[#e8e4e0]">
                            {tasksDueSoon.slice(0, 5).map(task => {
                                const project = projects.find(p => p.id === task.projectId)
                                const isOverdue = task.dueDate && isPast(new Date(task.dueDate))
                                const isDueToday = task.dueDate && isToday(new Date(task.dueDate))

                                return (
                                    <Link
                                        key={task.id}
                                        href={`/dashboard/projects/${task.projectId}`}
                                        className="flex items-center gap-4 p-4 hover:bg-[#faf8f5] transition-colors group"
                                    >
                                        {/* Priority Indicator */}
                                        <div className={cn(
                                            "w-1 h-12 rounded-full",
                                            task.priority === "High" ? "bg-red-500" :
                                                task.priority === "Medium" ? "bg-blue-500" : "bg-gray-300"
                                        )} />

                                        {/* Task Info */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-[#1a1a1a] text-sm truncate group-hover:text-[#e07850] transition-colors">
                                                {task.title}
                                            </h4>
                                            <p className="text-xs text-[#6b6b6b] mt-0.5">
                                                {project?.title} • {task.status}
                                            </p>
                                        </div>

                                        {/* Due Date */}
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                                            isOverdue ? "bg-red-50 text-red-700 border border-red-200" :
                                                isDueToday ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                                    "bg-gray-50 text-gray-600 border border-gray-200"
                                        )}>
                                            <Calendar size={12} />
                                            {task.dueDate && format(new Date(task.dueDate), "MMM d")}
                                        </div>

                                        <ArrowRight className="w-4 h-4 text-[#a0a0a0] opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-[#faf8f5] rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="font-semibold text-[#1a1a1a]">All caught up!</h3>
                            <p className="text-sm text-[#6b6b6b]">No urgent tasks due soon</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}

// Project Card Component
function ProjectCard({ project, isLeader }: { project: any; isLeader?: boolean }) {
    const { users, tasks } = useHems()
    const projectTasks = tasks.filter(t => t.projectId === project.id)
    const completedTasks = projectTasks.filter(t => t.status === 'Done').length
    const lead = users.find(u => u.id === project.teamLeadId)

    return (
        <Link href={`/dashboard/projects/${project.id}`}>
            <motion.div
                whileHover={{ y: -2 }}
                className="bg-white rounded-2xl border border-[#e8e4e0] p-5 shadow-md hover:shadow-lg hover:border-[#e07850]/30 transition-all cursor-pointer group"
            >
                <div className="flex items-start justify-between mb-3">
                    <div className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
                        project.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            project.status === 'COMPLETED' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                "bg-gray-50 text-gray-600 border-gray-200"
                    )}>
                        {project.status}
                    </div>
                    {isLeader && (
                        <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-full text-[10px] font-semibold border border-amber-200">
                            <Crown size={10} />
                            Leading
                        </div>
                    )}
                </div>

                <h3 className="font-bold text-[#1a1a1a] group-hover:text-[#e07850] transition-colors mb-1">
                    {project.title}
                </h3>
                <p className="text-xs text-[#6b6b6b] line-clamp-2 mb-4">
                    {project.description}
                </p>

                {/* Progress Bar */}
                <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs">
                        <span className="text-[#6b6b6b]">Progress</span>
                        <span className="font-semibold text-[#1a1a1a]">{completedTasks}/{projectTasks.length} tasks</span>
                    </div>
                    <div className="h-1.5 bg-[#f5f3f0] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#e07850] rounded-full transition-all"
                            style={{ width: `${projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0}%` }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-[#e8e4e0]">
                    <div className="flex items-center gap-2">
                        {lead?.avatar ? (
                            <img src={lead.avatar} className="w-6 h-6 rounded-full object-cover" alt="" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                {lead?.name.substring(0, 2)}
                            </div>
                        )}
                        <span className="text-xs text-[#6b6b6b]">{lead?.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#a0a0a0]">
                        <Calendar size={12} />
                        {format(new Date(project.deadline), "MMM d")}
                    </div>
                </div>
            </motion.div>
        </Link>
    )
}
