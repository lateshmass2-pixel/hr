'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
    Crown, Wrench, Clock, ArrowRight, CheckCircle2,
    Calendar, AlertCircle
} from 'lucide-react'
import { useHems } from '@/context/HemsContext'
import { format, isPast, isToday, addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { TaskVelocityChart } from './TaskVelocityChart'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHero } from '@/components/layout/PageHero'
import { Card } from '@/components/ui/card'

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
        <PageContainer>
            {/* Welcome Header */}
            <PageHero
                title={`Welcome back, ${currentUser.name.split(' ')[0]} 👋`}
                subtitle={`${currentUser.jobTitle} • ${pendingTasks} tasks pending`}
                action={
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
                }
            />

            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                            <h2 className="text-lg font-bold text-[#14532d]">Projects I Lead</h2>
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
                            <Wrench className="w-5 h-5 text-[#14532d]" />
                            <h2 className="text-lg font-bold text-[#14532d]">Projects Assigned to Me</h2>
                            <span className="bg-green-50 text-[#14532d] px-2 py-0.5 rounded-full text-xs font-medium border border-green-200">
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
                        <Clock className="w-5 h-5 text-[#14532d]" />
                        <h2 className="text-lg font-bold text-[#14532d]">My Tasks Due Soon</h2>
                        <span className="bg-green-50 text-[#14532d] px-2 py-0.5 rounded-full text-xs font-medium border border-green-200">
                            {tasksDueSoon.length}
                        </span>
                    </div>

                    <Card noPadding className="overflow-hidden">
                        {tasksDueSoon.length > 0 ? (
                            <div className="divide-y divide-green-100">
                                {tasksDueSoon.slice(0, 5).map(task => {
                                    const project = projects.find(p => p.id === task.projectId)
                                    const isOverdue = task.dueDate && isPast(new Date(task.dueDate))
                                    const isDueToday = task.dueDate && isToday(new Date(task.dueDate))

                                    return (
                                        <Link
                                            key={task.id}
                                            href={`/dashboard/projects/${task.projectId}`}
                                            className="flex items-center gap-4 p-4 hover:bg-[#f8faf6] transition-colors group"
                                        >
                                            {/* Priority Indicator */}
                                            <div className={cn(
                                                "w-1 h-12 rounded-full",
                                                task.priority === "High" ? "bg-red-500" :
                                                    task.priority === "Medium" ? "bg-amber-500" : "bg-gray-300"
                                            )} />

                                            {/* Task Info */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-[#14532d] text-sm truncate group-hover:text-[#166534] transition-colors">
                                                    {task.title}
                                                </h4>
                                                <p className="text-xs text-[#3f6212] mt-0.5">
                                                    {project?.title} • {task.status}
                                                </p>
                                            </div>

                                            {/* Due Date */}
                                            <div className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                                                isOverdue ? "bg-red-50 text-red-700 border border-red-200" :
                                                    isDueToday ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                                        "bg-green-50 text-[#14532d] border border-green-200"
                                            )}>
                                                <Calendar size={12} />
                                                {task.dueDate && format(new Date(task.dueDate), "MMM d")}
                                            </div>

                                            <ArrowRight className="w-4 h-4 text-[#14532d] opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </Link>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center bg-[#f8faf6]">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-green-100">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h3 className="font-semibold text-[#14532d]">All caught up!</h3>
                                <p className="text-sm text-[#3f6212]">No urgent tasks due soon</p>
                            </div>
                        )}
                    </Card>
                </section>
            </div>
        </PageContainer>
    )
}

// Project Card Component - Updated to use global Card
function ProjectCard({ project, isLeader }: { project: any; isLeader?: boolean }) {
    const { users, tasks } = useHems()
    const projectTasks = tasks.filter(t => t.projectId === project.id)
    const completedTasks = projectTasks.filter(t => t.status === 'Done').length
    const lead = users.find(u => u.id === project.teamLeadId)

    return (
        <Link href={`/dashboard/projects/${project.id}`}>
            <Card className="hover:border-green-300 group p-5">
                <div className="flex items-start justify-between mb-3">
                    <div className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
                        project.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            project.status === 'COMPLETED' ? "bg-purple-50 text-purple-700 border-purple-200" :
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

                <h3 className="font-bold text-[#14532d] group-hover:text-[#166534] transition-colors mb-1">
                    {project.title}
                </h3>
                <p className="text-xs text-[#3f6212] line-clamp-2 mb-4">
                    {project.description}
                </p>

                {/* Progress Bar */}
                <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs">
                        <span className="text-[#3f6212]">Progress</span>
                        <span className="font-semibold text-[#14532d]">{completedTasks}/{projectTasks.length} tasks</span>
                    </div>
                    <div className="h-1.5 bg-[#f0fdf4] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#14532d] rounded-full transition-all"
                            style={{ width: `${projectTasks.length > 0 ? (completedTasks / projectTasks.length) * 100 : 0}%` }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-green-50">
                    <div className="flex items-center gap-2">
                        {lead?.avatar ? (
                            <img src={lead.avatar} className="w-6 h-6 rounded-full object-cover" alt="" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-[10px] font-bold text-[#14532d]">
                                {lead?.name.substring(0, 2)}
                            </div>
                        )}
                        <span className="text-xs text-[#3f6212]">{lead?.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[#3f6212]">
                        <Calendar size={12} />
                        {format(new Date(project.deadline), "MMM d")}
                    </div>
                </div>
            </Card>
        </Link>
    )
}

