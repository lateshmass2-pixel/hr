'use client'

import type { Project, Task, User } from '@/types/hems'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Crown, Users, CheckCircle2,
    Calendar, AlertCircle, ArrowRight,
    Star, Timer, BarChart3, ShieldCheck,
    MessageSquare, ExternalLink, MoreVertical,
    Check
} from 'lucide-react'
import { useHems } from '@/context/HemsContext'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHero } from '@/components/layout/PageHero'
import { Card } from '@/components/ui/card'
import { KpiCard } from '@/components/dashboard/widgets/KpiCard'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useState } from 'react'
import { SquadSection } from './widgets/SquadSection'

export function TeamLeadDashboard() {
    const {
        currentUser,
        getProjectsAsLeader,
        tasks,
        users,
        verifyTask
    } = useHems()

    const ledProjects = getProjectsAsLeader()
    const ledProjectIds = ledProjects.map(p => p.id)
    
    // Aggregated Pending Reviews across all led projects
    const pendingReviews = tasks.filter(t => 
        ledProjectIds.includes(t.projectId) && 
        t.verificationStatus === 'Pending'
    )

    // Squad Strength (Unique users in led projects)
    const squadMembers = Array.from(new Set(
        ledProjects.flatMap(p => p.memberIds || [])
    )).length

    // Overall Squad Velocity (Avg progress of led projects)
    const totalProgress = ledProjects.length > 0 
        ? ledProjects.reduce((acc, p) => {
            const pTasks = tasks.filter(t => t.projectId === p.id)
            const completed = pTasks.filter(t => t.status === 'Done').length
            return acc + (pTasks.length > 0 ? (completed / pTasks.length) * 100 : 0)
          }, 0) / ledProjects.length
        : 0

    return (
        <PageContainer>
            {/* Lead Premium Hero */}
            <PageHero
                title={`Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, Lead`}
                subtitle={`You are overseeing ${ledProjects.length} ${ledProjects.length === 1 ? 'project' : 'projects'} and ${squadMembers} squad members.`}
                action={
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm font-medium border border-amber-200/50 shadow-sm">
                            <ShieldCheck size={16} />
                            {pendingReviews.length} Reviews Pending
                        </div>
                    </div>
                }
            />

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* Lead KPIs - Authority Centric */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard
                        title="Squad Strength"
                        value={squadMembers}
                        icon={<Users size={20} />}
                        trend="Active Members"
                        trendDirection="up"
                    />
                    <KpiCard
                        title="Action Items"
                        value={pendingReviews.length}
                        icon={<Timer size={20} />}
                        trend={pendingReviews.length > 0 ? "Needs Review" : "Clear"}
                        trendDirection={pendingReviews.length > 0 ? "down" : "up"}
                    />
                    <KpiCard
                        title="Squad Velocity"
                        value={`${Math.round(totalProgress)}%`}
                        icon={<BarChart3 size={20} />}
                        trend="Avg. Progress"
                        trendDirection="up"
                    />
                    <KpiCard
                        title="Lead Projects"
                        value={ledProjects.length}
                        icon={<Crown size={20} />}
                        trend="Active"
                        trendDirection="up"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Review Hub */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-[#0a3b2a] flex items-center gap-2">
                                <ShieldCheck className="text-amber-600" />
                                Centralized Review Hub
                            </h2>
                            <Link href="/dashboard/projects" className="text-sm font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                                View Boards <ArrowRight size={14} />
                            </Link>
                        </div>

                        <div className="space-y-4">
                            {pendingReviews.length > 0 ? (
                                pendingReviews.map(task => (
                                    <ReviewCard key={task.id} task={task} />
                                ))
                            ) : (
                                <Card className="p-12 text-center bg-white/40 border-dashed border-emerald-200">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-[#0a3b2a]">Zero Pending Reviews</h3>
                                    <p className="text-slate-500 max-w-sm mx-auto mt-2">
                                        Great job, Lead! Your verification queue is completely empty. Your team is on track.
                                    </p>
                                </Card>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Squad Oversight */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-[#0a3b2a] flex items-center gap-2">
                            <Crown size={20} className="text-amber-500" />
                            Projects Overseen
                        </h2>
                        <div className="space-y-4">
                            {ledProjects.map(project => (
                                <MiniProjectStats key={project.id} project={project} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Squad Members Visualization */}
                <div className="border-t border-slate-100 pt-10">
                    <SquadSection />
                </div>
            </div>
        </PageContainer>
    )
}

function ReviewCard({ task }: { task: Task }) {
    const { projects, verifyTask, users } = useHems()
    const project = projects.find(p => p.id === task.projectId)
    const assignee = users.find(u => u.id === task.assigneeId)
    const [submitting, setSubmitting] = useState(false)

    const handleVerify = async (status: 'Approved' | 'Rejected') => {
        setSubmitting(true)
        try {
            await verifyTask(task.id, status === 'Approved')
            toast.success(`Task ${status.toLowerCase()} successfully`)
        } catch (error) {
            toast.error("Failed to update status")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <motion.div
            layout
            transition={{ type: 'spring' as const, stiffness: 300, damping: 20 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
        >
            <Card className="p-5 bg-white border-none shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                {/* Accent line */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
                
                <div className="flex flex-col md:flex-row gap-5">
                    {/* Informative side */}
                    <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100 uppercase tracking-tighter">
                                NEEDS VERIFICATION
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                                {project?.title}
                            </span>
                        </div>
                        
                        <div>
                            <h3 className="font-bold text-[#0a3b2a] group-hover:text-[#002115] transition-colors">
                                {task.title}
                            </h3>
                        </div>

                        <div className="flex items-center gap-4 pt-1">
                            <div className="flex items-center gap-2">
                                {assignee?.avatar ? (
                                    <img src={assignee.avatar} className="w-5 h-5 rounded-full object-cover" alt="" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-[8px] font-bold text-[#0a3b2a]">
                                        {((assignee as any)?.full_name || assignee?.name || "??").substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <span className="text-xs font-medium text-slate-600">{(assignee as any)?.full_name || assignee?.name || 'Unassigned'}</span>
                            </div>
                            
                            {task.proofUrl && (
                                <a 
                                    href={task.proofUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors bg-emerald-50 px-2 py-1 rounded-lg"
                                >
                                    <ExternalLink size={12} />
                                    View Proof
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Action Hub side */}
                    <div className="flex items-center gap-2 md:border-l border-slate-50 md:pl-5">
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            disabled={submitting}
                            className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl px-4 h-9 text-xs font-bold"
                            onClick={() => handleVerify('Rejected')}
                        >
                            Reject
                        </Button>
                        <Button 
                            size="sm" 
                            disabled={submitting}
                            className="bg-[#0a3b2a] text-white hover:bg-[#002115] rounded-xl px-4 h-9 text-xs font-bold shadow-lg shadow-emerald-900/10"
                            onClick={() => handleVerify('Approved')}
                        >
                            <Check size={14} className="mr-1.5" /> Approve
                        </Button>
                    </div>
                </div>
            </Card>
        </motion.div>
    )
}

function MiniProjectStats({ project }: { project: Project }) {
    const { tasks } = useHems()
    const projectTasks = tasks.filter(t => t.projectId === project.id)
    const completed = projectTasks.filter(t => t.status === 'Done').length
    const progress = projectTasks.length > 0 ? (completed / projectTasks.length) * 100 : 0

    return (
        <Link href={`/dashboard/projects/${project.id}`}>
            <Card className="p-4 border-none bg-white shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-[#0a3b2a] group-hover:text-[#002115] truncate flex-1 pr-2">
                        {project.title}
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                        {Math.round(progress)}%
                    </span>
                </div>
                
                <div className="h-1.5 bg-emerald-50 rounded-full overflow-hidden mb-2">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-emerald-600 rounded-full"
                    />
                </div>
                
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                    <span>{completed}/{projectTasks.length} Done</span>
                    <span className="flex items-center gap-1 group-hover:text-[#0a3b2a] transition-colors">
                        Oversight <ArrowRight size={8} />
                    </span>
                </div>
            </Card>
        </Link>
    )
}
