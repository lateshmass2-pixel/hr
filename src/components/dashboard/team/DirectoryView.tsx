'use client'

import { useState, useMemo } from "react"
import {
    Search, Filter, Download, Plus, MoreHorizontal,
    Users, UserCheck, UserX, UserPlus,
    ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight,
    FolderKanban, Crown, ShieldCheck, Mail, Briefcase, 
    MessageSquare, ExternalLink,
    LayoutGrid,
    List
} from "lucide-react"
import { useHems } from "@/context/HemsContext"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { PageHero } from "@/components/layout/PageHero"
import { Card } from "@/components/ui/card"
import { theme } from "@/lib/config/theme"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

export function DirectoryView() {
    const { employees, projects, addEmployee, users, data } = useHems()
    const [searchTerm, setSearchTerm] = useState("")
    const [viewMode, setViewMode] = useState<"projects" | "available">("projects")

    // 1. Data Processing (Memoized)
    const { squads, talentPool, assignedCount } = useMemo(() => {
        const activeProjects = projects.filter(p => p.status === 'ACTIVE')
        
        // Helper to get consistent person data from either User or Employee objects
        const normalize = (p: any) => ({
            id: p.id,
            full_name: p.full_name || p.name || 'Unknown',
            position: p.position || p.jobTitle || 'Resource',
            department: p.department || 'Operations',
            email: p.email || '',
            avatar: p.avatar || p.avatar_url,
            status: p.status || 'Active'
        })

        // Calculate assigned count manually
        const allAssignedIds = new Set<string>()
        activeProjects.forEach(p => {
            if (p.teamLeadId) allAssignedIds.add(p.teamLeadId)
            if (Array.isArray(p.memberIds)) {
                p.memberIds.forEach(id => id && allAssignedIds.add(id))
            }
        })

        const projectSquads = activeProjects.map(project => {
            const rawLead = users.find(u => u.id === project.teamLeadId) || employees.find(e => e.id === project.teamLeadId)
            const lead = rawLead ? normalize(rawLead) : null
            
            const members = (project.memberIds || []).map(id => {
                const raw = users.find(u => u.id === id) || employees.find(e => e.id === id)
                return raw ? normalize(raw) : null
            }).filter(Boolean)

            return {
                ...project,
                lead,
                members
            }
        })

        return {
            squads: projectSquads,
            talentPool: users.filter(u => u.globalRole !== 'HR_ADMIN').map(normalize), // Exclude HR admins from directory
            assignedCount: allAssignedIds.size
        }
    }, [data, employees, projects, users])

    // 2. Filtered lists based on search (Memoized)
    const { filteredSquads, filteredAvailable } = useMemo(() => {
        const query = searchTerm.toLowerCase()
        
        return {
            filteredSquads: squads.filter(s => 
                s.title.toLowerCase().includes(query) ||
                (s.lead as any)?.full_name?.toLowerCase().includes(query) ||
                s.members.some((m: any) => m.full_name.toLowerCase().includes(query))
            ),
            filteredAvailable: talentPool.filter(e => 
                e.full_name.toLowerCase().includes(query) ||
                e.position.toLowerCase().includes(query) ||
                e.department.toLowerCase().includes(query)
            )
        }
    }, [squads, talentPool, searchTerm])

    const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
        <Card className="flex flex-col justify-between h-full bg-white border-none shadow-sm shadow-green-900/5 hover:shadow-md transition-shadow rounded-[2rem] p-6">
            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-2xl", colorClass)}>
                    <Icon size={20} className="text-current" />
                </div>
            </div>
            <div className="space-y-0.5">
                <h3 className="text-2xl font-black text-[#0a3b2a]">{value}</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
            </div>
        </Card>
    )

    return (
        <div className="space-y-8 pb-20">
            <PageHero
                title="Resource Command"
                subtitle="Manage project allocations and monitor employee deployment across the organization."
                action={
                    <div className="flex items-center gap-3">
                         <button
                            className={cn(theme.primaryButton, "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-green-900/10")}
                            onClick={() => {
                                addEmployee({
                                    full_name: "New Specialist",
                                    email: `specialist.${Date.now()}@company.com`,
                                    position: "Technical Architect",
                                    department: "Engineering",
                                    status: "Active",
                                    created_at: new Date().toISOString(),
                                })
                            }}
                        >
                            <Plus size={18} />
                            Add Talent
                        </button>
                    </div>
                }
            />

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Active Squads"
                    value={squads.length}
                    icon={FolderKanban}
                    colorClass="bg-green-50 text-[#0a3b2a]"
                />
                <StatCard
                    title="Assigned Personnel"
                    value={assignedCount}
                    icon={UserCheck}
                    colorClass="bg-emerald-50 text-emerald-600"
                />
                <StatCard
                    title="Total Workforce"
                    value={talentPool.length}
                    icon={UserPlus}
                    colorClass="bg-amber-50 text-teal-900"
                />
            </div>

            {/* View Toggle & Search */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex p-1.5 bg-white shadow-sm border border-green-50 rounded-[1.5rem] w-full md:w-auto">
                    <button 
                        onClick={() => setViewMode("projects")}
                        className={cn(
                            "flex-1 md:flex-none px-8 py-3 rounded-[1.25rem] text-sm font-bold transition-all flex items-center justify-center gap-2",
                            viewMode === "projects" 
                                ? "bg-[#0a3b2a] text-white shadow-lg" 
                                : "text-slate-400 hover:text-[#0a3b2a]"
                        )}
                    >
                        <LayoutGrid size={18} />
                        Active Squads
                    </button>
                    <button 
                        onClick={() => setViewMode("available")}
                        className={cn(
                            "flex-1 md:flex-none px-8 py-3 rounded-[1.25rem] text-sm font-bold transition-all flex items-center justify-center gap-2",
                            viewMode === "available" 
                                ? "bg-[#0a3b2a] text-white shadow-lg" 
                                : "text-slate-400 hover:text-[#0a3b2a]"
                        )}
                    >
                        <Users size={18} />
                        Talent Pool
                    </button>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder={viewMode === 'projects' ? "Search squads or members..." : "Search available talent..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-white border-none shadow-sm shadow-green-900/5 rounded-[1.5rem] text-sm focus:outline-none focus:ring-2 focus:ring-[#0a3b2a]/10 transition-all font-medium text-slate-700"
                    />
                </div>
            </div>

            {/* Content Display */}
            <AnimatePresence mode="wait">
                {viewMode === "projects" ? (
                    <motion.div 
                        key="squads"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                    >
                        {filteredSquads.map((squad) => (
                            <Card key={squad.id} className="p-8 border-none bg-white shadow-[0_8px_40px_rgba(10,59,42,0.04)] hover:shadow-[0_12px_60px_rgba(10,59,42,0.08)] transition-all rounded-[2.5rem] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-50 rounded-full -mr-20 -mt-20 blur-3xl opacity-50 group-hover:opacity-70 transition-opacity" />
                                
                                <div className="flex items-start justify-between mb-8 relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-widest rounded-full">
                                                Active Squad
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                ID: {squad.id.substring(0,6)}
                                            </span>
                                        </div>
                                        <h3 className="text-2xl font-black text-[#0a3b2a]">{squad.title}</h3>
                                        <p className="text-slate-500 text-sm font-medium mt-1">{squad.description || 'Global Initiative Project'}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-[#0a3b2a] hover:bg-green-50">
                                        <MoreHorizontal size={24} />
                                    </Button>
                                </div>

                                <div className="space-y-6 relative z-10">
                                    {/* Team Lead */}
                                    <div className="bg-[#f8faf6] p-5 rounded-[2rem] border border-green-50/50">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-14 h-14 rounded-2xl bg-[#0a3b2a] text-white flex items-center justify-center font-bold text-xl ring-4 ring-white shadow-sm">
                                                    {(squad.lead as any)?.full_name?.[0] || '?'}
                                                </div>
                                                <div className="absolute -top-2 -right-2 w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center border-2 border-white shadow-sm">
                                                    <Crown size={14} className="text-[#0a3b2a]" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-0.5">Team Lead</div>
                                                <div className="font-bold text-[#0a3b2a]">{(squad.lead as any)?.full_name || 'Unassigned'}</div>
                                                <div className="text-xs text-slate-500">{(squad.lead as any)?.position || 'Lead Architect'}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Members List */}
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Squad Members ({squad.members.length})</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {squad.members.map((member: any) => (
                                                <div key={member.id} className="flex items-center gap-3 p-3 bg-white border border-green-50 rounded-2xl hover:border-emerald-200 hover:shadow-sm transition-all group/member">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-[#0a3b2a] border border-slate-100 flex items-center justify-center font-bold text-sm">
                                                        {member.full_name?.[0] || 'M'}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-bold text-[#0a3b2a] text-xs truncate">{member.full_name}</div>
                                                        <div className="text-[10px] text-slate-400 truncate">{member.position}</div>
                                                    </div>
                                                    <button className="p-1.5 text-slate-300 hover:text-emerald-600 opacity-0 group-hover/member:opacity-100 transition-opacity">
                                                        <Mail size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4 flex items-center justify-between border-t border-green-50">
                                        <div className="flex -space-x-3">
                                            {[1,2,3].map(i => (
                                                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                                    +{i}
                                                </div>
                                            ))}
                                        </div>
                                        <Button variant="ghost" className="text-[#0a3b2a] font-bold text-xs gap-2 hover:bg-green-50 rounded-xl">
                                            View Performance <ArrowRight size={14} />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div 
                        key="available"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        {filteredAvailable.map((e) => (
                            <Card key={e.id} className="p-6 border-none bg-white shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgba(10,59,42,0.06)] transition-all rounded-[2rem] group border border-transparent hover:border-green-100">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#f8faf6] to-emerald-50 border border-green-100 flex items-center justify-center text-[#0a3b2a] font-bold text-xl group-hover:scale-105 transition-transform">
                                        {e.full_name[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-black text-[#0a3b2a] truncate leading-tight">{e.full_name}</h4>
                                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{e.department}</p>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <div className="flex items-center gap-3 text-xs text-slate-600 font-medium bg-[#f8faf6] p-2.5 rounded-xl border border-green-50/50">
                                        <Briefcase size={14} className="text-emerald-700" />
                                        {e.position}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-600 font-medium bg-[#f8faf6] p-2.5 rounded-xl border border-green-50/50">
                                        <Mail size={14} className="text-emerald-700" />
                                        <span className="truncate">{e.email}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                     <Button 
                                        className="w-full bg-[#0a3b2a] hover:bg-[#0d4a36] text-white rounded-xl h-11 text-xs font-bold gap-2"
                                        onClick={() => {
                                            // Trigger create project flow
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                            toast.info(`Ready to deploy ${e.full_name}. Use the 'New Project' button above to start.`);
                                        }}
                                    >
                                        <Plus size={16} /> Deploy to Project
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl bg-slate-50 text-slate-500 hover:bg-green-50 hover:text-[#0a3b2a]">
                                        <MessageSquare size={18} />
                                    </Button>
                                </div>
                            </Card>
                        ))}

                        {filteredAvailable.length === 0 && (
                            <div className="col-span-full py-20 text-center">
                                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <UserCheck size={40} className="text-green-200" />
                                </div>
                                <h3 className="text-xl font-bold text-[#0a3b2a]">No Available Talent</h3>
                                <p className="text-slate-400 mt-2">Every team member is currently allocated to an active squad.</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

const ArrowRight = ({ size, className }: any) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M5 12h14m-7-7 7 7-7 7" />
    </svg>
)
