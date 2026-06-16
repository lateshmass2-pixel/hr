'use client'

import { useMemo } from 'react'
import { useHems } from '@/context/HemsContext'
import { motion } from 'framer-motion'
import { 
    Users, Crown, MessageSquare, 
    MoreHorizontal, Sparkles, UserPlus 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Project, User, Employee } from '@/types/hems'

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
        opacity: 1, 
        scale: 1,
        transition: { type: 'spring' as const, stiffness: 300, damping: 20 }
    }
}

export function SquadSection({ className }: { className?: string }) {
    const { 
        currentUser, 
        projects, 
        users, 
        employees,
        getProjectsAsMember,
        getProjectsAsLeader
    } = useHems()

    // 1. Identify all projects the user is involved in (Memoized)
    const associatedProjects = useMemo(() => projects.filter((p: Project) => 
        p.teamLeadId === currentUser.id || 
        p.memberIds?.includes(currentUser.id)
    ), [projects, currentUser.id])

    // 2. Aggregate unique member IDs (Memoized)
    const allMemberIds = useMemo(() => Array.from(new Set(
        associatedProjects.flatMap((p: Project) => [p.teamLeadId, ...(p.memberIds || [])])
    )).filter(id => id !== currentUser.id), [associatedProjects, currentUser.id])

    // 3. Resolve profile data for these members (Memoized)
    const squadMembers = useMemo(() => allMemberIds.map(id => {
        const profile = users.find((u: User) => u.id === id) || employees.find((e: Employee) => e.id === id)
        const name = (profile as any)?.full_name || (profile as any)?.name || 'Team Member'
        const avatar = (profile as any)?.avatar || (profile as any)?.avatar_url
        const jobTitle = (profile as any)?.position || (profile as any)?.jobTitle || 'Contributor'
        
        // Find which project they are the lead of
        const isLeadOfSharedProject = associatedProjects.some((p: Project) => p.teamLeadId === id)
        
        return {
            id,
            name,
            avatar,
            jobTitle,
            isLead: isLeadOfSharedProject,
            status: (profile as any)?.status || 'Active'
        }
    }).sort((a, b) => (a.isLead === b.isLead) ? 0 : a.isLead ? -1 : 1), [allMemberIds, users, employees, associatedProjects])

    if (associatedProjects.length === 0) {
        return (
            <Card className={cn("p-12 text-center bg-white border-dashed border-green-200", className)}>
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserPlus className="w-8 h-8 text-green-300" />
                </div>
                <h3 className="text-lg font-bold text-[#0a3b2a]">No Squad Assigned</h3>
                <p className="text-slate-500 max-w-sm mx-auto mt-2">
                    You haven't been added to any project squads yet. Once assigned, your teammates will appear here.
                </p>
            </Card>
        )
    }

    return (
        <section className={cn("space-y-4", className)}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#0a3b2a] flex items-center justify-center text-white shadow-lg shadow-green-900/10">
                        <Users size={18} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-[#0a3b2a] tracking-tight">Your Working Squad</h2>
                        <p className="text-xs text-slate-500">Collaborators across {associatedProjects.length} projects</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" className="text-emerald-700 hover:bg-emerald-50 rounded-xl gap-2 font-bold">
                    <Sparkles size={14} /> Team Insights
                </Button>
            </div>

            <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {squadMembers.map((member) => (
                    <motion.div key={member.id} variants={itemVariants}>
                        <Card className="p-4 border-none bg-white shadow-[0_8px_30px_rgba(10,59,42,0.04)] hover:shadow-[0_12px_40px_rgba(10,59,42,0.08)] transition-all group relative overflow-hidden rounded-[1.5rem]">
                            {/* Role indicator background pulse if lead */}
                            {member.isLead && (
                                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-12 -mt-12 blur-2xl opacity-40 group-hover:opacity-60 transition-opacity" />
                            )}
                            
                            <div className="flex items-center gap-4 mb-4">
                                <div className="relative">
                                    {member.avatar ? (
                                        <img src={member.avatar} className="w-12 h-12 rounded-2xl object-cover shadow-sm bg-slate-50" alt="" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg">
                                            {member.name.substring(0, 1)}
                                        </div>
                                    )}
                                    <div className={cn(
                                        "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                                        member.status === 'Active' ? "bg-emerald-500" : "bg-slate-300"
                                    )} />
                                </div>
                                
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <h4 className="font-bold text-[#0a3b2a] truncate text-sm">
                                            {member.name}
                                        </h4>
                                        {member.isLead && <Crown size={12} className="text-amber-500 flex-shrink-0" />}
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium truncate uppercase tracking-wider">
                                        {member.jobTitle}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                <Button size="sm" variant="ghost" className="h-8 rounded-xl px-2 text-[#0a3b2a] hover:bg-green-50 gap-1.5 text-[10px] font-bold">
                                    <MessageSquare size={12} className="text-emerald-600" />
                                    Chat
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50">
                                    <MoreHorizontal size={16} />
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </motion.div>
        </section>
    )
}
