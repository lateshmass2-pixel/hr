'use client'

import { useHems } from '@/context/HemsContext'
import { motion } from 'framer-motion'
import { 
    Users, Crown, MessageSquare, 
    MoreHorizontal, Sparkles, UserPlus,
    Search, Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/layout/PageHero'
import { useState } from 'react'

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { type: 'spring' as const, stiffness: 260, damping: 20 }
    }
}

export function SquadView() {
    const { 
        currentUser, 
        projects, 
        users, 
        employees
    } = useHems()

    const [searchTerm, setSearchTerm] = useState("")

    // 1. Identify all projects the user is involved in
    const associatedProjects = projects.filter(p => 
        p.teamLeadId === currentUser.id || 
        p.memberIds?.includes(currentUser.id)
    )

    // 2. Aggregate unique member IDs
    const allMemberIds = Array.from(new Set(
        associatedProjects.flatMap(p => [p.teamLeadId, ...(p.memberIds || [])])
    )).filter(id => id !== currentUser.id)

    // 3. Resolve profile data for these members
    const squadMembers = allMemberIds.map(id => {
        const profile = users.find(u => u.id === id) || employees.find(e => e.id === id)
        const name = (profile as any)?.full_name || (profile as any)?.name || 'Team Member'
        const avatar = (profile as any)?.avatar || (profile as any)?.avatar_url
        const jobTitle = (profile as any)?.position || (profile as any)?.jobTitle || 'Contributor'
        const department = (profile as any)?.department || 'Engineering'
        
        // Find which project they are the lead of
        const isLeadOfSharedProject = associatedProjects.some(p => p.teamLeadId === id)
        
        return {
            id,
            name,
            avatar,
            jobTitle,
            department,
            isLead: isLeadOfSharedProject,
            status: (profile as any)?.status || 'Active'
        }
    })
    .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => (a.isLead === b.isLead) ? 0 : a.isLead ? -1 : 1)

    return (
        <div className="space-y-8 pb-12">
            <PageHero
                title="Your Working Squad"
                subtitle={`Collaborate with your teammates across ${associatedProjects.length} active projects.`}
                action={
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-xs font-bold ring-1 ring-emerald-100">
                        <Users size={14} />
                        {squadMembers.length} Active Teammates
                    </div>
                }
            />

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-[2rem] border border-white shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search your teammates..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/10 transition-all text-slate-700 font-medium shadow-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" className="rounded-2xl gap-2 font-bold text-slate-600 hover:bg-white hover:text-[#0a3b2a]">
                        <Filter size={16} /> Filter Squad
                    </Button>
                    <Button className="rounded-2xl gap-2 font-bold bg-[#0a3b2a] hover:bg-[#14532d] shadow-lg shadow-green-900/10">
                        <Sparkles size={16} /> Insights
                    </Button>
                </div>
            </div>

            {squadMembers.length > 0 ? (
                <motion.div 
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {squadMembers.map((member) => (
                        <motion.div key={member.id} variants={itemVariants}>
                            <Card className="p-6 border-none bg-white shadow-[0_8px_30px_rgba(10,59,42,0.04)] hover:shadow-[0_12px_40px_rgba(10,59,42,0.08)] transition-all group relative overflow-hidden rounded-[2.5rem]">
                                {member.isLead && (
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 rounded-full -mr-16 -mt-16 blur-3xl opacity-30 group-hover:opacity-50 transition-opacity" />
                                )}
                                
                                <div className="flex flex-col items-center text-center mb-6">
                                    <div className="relative mb-4">
                                        <div className="w-20 h-20 rounded-[2.5rem] overflow-hidden ring-4 ring-slate-50 group-hover:ring-emerald-50 transition-all duration-300">
                                            {member.avatar ? (
                                                <img src={member.avatar} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-full h-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-2xl uppercase">
                                                    {member.name.substring(0, 1)}
                                                </div>
                                            )}
                                        </div>
                                        <div className={cn(
                                            "absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-white shadow-sm",
                                            member.status === 'Active' ? "bg-emerald-500" : "bg-slate-300"
                                        )} />
                                        {member.isLead && (
                                            <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-1.5 rounded-xl shadow-lg border-2 border-white">
                                                <Crown size={12} />
                                            </div>
                                        )}
                                    </div>
                                    
                                    <h4 className="font-black text-[#0a3b2a] text-lg lg:text-xl tracking-tight mb-1">
                                        {member.name}
                                    </h4>
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-lg">
                                            {member.jobTitle}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            {member.department}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-6 border-t border-slate-50">
                                    <Button size="sm" variant="ghost" className="rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-[#0a3b2a] font-bold gap-2 text-xs">
                                        <MessageSquare size={14} /> Chat
                                    </Button>
                                    <Button size="sm" variant="ghost" className="rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs">
                                        Profile
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            ) : (
                <div className="py-24 text-center">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-dashed border-green-200">
                        <Users className="text-green-200" size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-[#0a3b2a]">Squad Not Found</h3>
                    <p className="text-slate-400 font-bold max-w-sm mx-auto mt-2">
                        {searchTerm ? "No specific teammate matches your search criteria." : "You haven't been assigned to any project squads yet."}
                    </p>
                </div>
            )}
        </div>
    )
}
