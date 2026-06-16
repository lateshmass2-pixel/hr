"use client"

import { useState, useEffect, useMemo } from "react"
import { useHems } from "@/context/HemsContext"
import { toast } from "sonner"
import { getAllProfiles } from "@/app/dashboard/projects/actions"
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, X, FolderKanban, Users, CheckCircle2 } from "lucide-react"

export default function CreateProjectModal() {
    const { addProject, addTask, users, currentUser } = useHems()
    const [open, setOpen] = useState(false)

    // Form State
    const [title, setTitle] = useState("")
    const [deadline, setDeadline] = useState("")
    const [teamLeadId, setTeamLeadId] = useState("")
    const [selectedMembers, setSelectedMembers] = useState<string[]>([])
    const [tasks, setTasks] = useState<string[]>([])
    const [newTask, setNewTask] = useState("")

    // Fallback: fetch profiles directly if HemsContext users is empty
    const [fallbackUsers, setFallbackUsers] = useState<{ id: string; name: string; globalRole?: string; jobTitle?: string }[]>([])

    useEffect(() => {
        if (users.length === 0) {
            getAllProfiles().then(profiles => {
                setFallbackUsers(profiles.map(p => ({
                    id: p.id,
                    name: p.full_name || 'Unknown',
                    globalRole: (p.role === 'HR_ADMIN' || p.role === 'hr' || p.role === 'owner') ? 'HR_ADMIN' : 'STANDARD_USER',
                    jobTitle: p.position || undefined,
                })))
            })
        }
    }, [users.length])

    const allUsers = users.length > 0 ? users : fallbackUsers

    // Filter out HR admins from selection lists
    const selectableUsers = useMemo(() =>
        allUsers.filter(u => u.globalRole !== 'HR_ADMIN'),
    [allUsers])

    // Team lead candidates = all non-HR users
    const leadCandidates = selectableUsers

    // Member candidates = exclude HR users, the selected team lead, and already-selected members
    const memberCandidates = useMemo(() =>
        selectableUsers.filter(u => u.id !== teamLeadId && !selectedMembers.includes(u.id)),
    [selectableUsers, teamLeadId, selectedMembers])

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

    const toggleMember = (id: string) => {
        setSelectedMembers(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        )
    }

    const handleAddTask = () => {
        if (!newTask.trim()) return
        setTasks(prev => [...prev, newTask.trim()])
        setNewTask("")
    }

    const handleCreate = async () => {
        if (!title || !teamLeadId || !deadline) {
            toast.error("Please fill in all required fields")
            return
        }
        try {
            const newProject = await addProject({
                title,
                description: "",
                deadline,
                teamLeadId,
                memberIds: selectedMembers,
                status: 'ACTIVE' as const
            })
            if (!newProject?.id) { toast.error("Failed to create project"); return }
            toast.success("Project created!")

            for (const taskTitle of tasks) {
                await addTask({
                    projectId: newProject.id,
                    title: taskTitle,
                    status: 'To Do',
                    assigneeId: teamLeadId,
                    priority: 'Medium',
                    verificationStatus: 'None'
                })
            }

            setTitle(""); setDeadline(""); setTeamLeadId("")
            setSelectedMembers([]); setTasks([]); setOpen(false)
        } catch {
            toast.error("Failed to create project")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#14532d] hover:bg-[#166534] text-white rounded-2xl px-5 h-10 text-sm font-bold shadow-lg shadow-green-900/10">
                    <Plus size={16} className="mr-1.5" /> New Project
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-3xl bg-white shadow-2xl gap-0">
                <DialogTitle className="sr-only">Create Project</DialogTitle>
                {/* Compact Header */}
                <div className="bg-gradient-to-r from-[#14532d] to-[#166534] px-5 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center">
                        <FolderKanban className="text-white" size={18} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-white tracking-tight">Create Project</h2>
                        <p className="text-emerald-200/60 text-xs font-medium">Set up team and objectives</p>
                    </div>
                </div>

                {/* Compact Form Body */}
                <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Row 1: Title + Deadline */}
                    <div className="grid grid-cols-5 gap-3">
                        <div className="col-span-3 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Title *</label>
                            <Input
                                placeholder="Project name"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="h-9 rounded-xl border-slate-200 bg-slate-50 text-sm font-medium focus:ring-green-600/20 focus:border-green-700"
                            />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deadline *</label>
                            <Input
                                type="date"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                                className="h-9 rounded-xl border-slate-200 bg-slate-50 text-sm font-medium focus:ring-green-600/20 focus:border-green-700"
                            />
                        </div>
                    </div>

                    {/* Team Lead */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Users size={10} /> Team Lead *
                        </label>
                        <Select value={teamLeadId} onValueChange={(val) => { setTeamLeadId(val); setSelectedMembers(prev => prev.filter(m => m !== val)) }}>
                            <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-slate-50 text-sm font-medium">
                                <SelectValue placeholder="Select lead" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                                {leadCandidates.length > 0 ? leadCandidates.map(user => (
                                    <SelectItem key={user.id} value={user.id} className="rounded-lg text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-green-100 text-green-800 flex items-center justify-center text-[9px] font-bold">
                                                {getInitials(user.name)}
                                            </div>
                                            <span className="font-semibold text-slate-800">{user.name}</span>
                                            {user.jobTitle && <span className="text-[10px] text-slate-400">· {user.jobTitle}</span>}
                                        </div>
                                    </SelectItem>
                                )) : (
                                    <div className="p-3 text-xs text-center text-slate-400">No team members found</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Squad Members */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Users size={10} /> Members
                        </label>
                        <Select onValueChange={toggleMember}>
                            <SelectTrigger className="h-9 rounded-xl border-slate-200 bg-slate-50 text-sm font-medium">
                                <SelectValue placeholder="Add members" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                                {memberCandidates.length > 0 ? memberCandidates.map(user => (
                                    <SelectItem key={user.id} value={user.id} className="rounded-lg text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center text-[9px] font-bold">
                                                {getInitials(user.name)}
                                            </div>
                                            <span className="font-semibold text-slate-800">{user.name}</span>
                                        </div>
                                    </SelectItem>
                                )) : (
                                    <div className="p-3 text-xs text-center text-slate-400">
                                        {selectableUsers.length === 0 ? "No team members found" : "All members assigned"}
                                    </div>
                                )}
                            </SelectContent>
                        </Select>

                        {/* Selected Member Chips */}
                        {selectedMembers.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {selectedMembers.map(id => {
                                    const m = allUsers.find(u => u.id === id)
                                    if (!m) return null
                                    return (
                                        <span key={id} className="inline-flex items-center gap-1 bg-green-50 border border-green-200 rounded-lg px-2 py-0.5 text-[11px] font-semibold text-green-800 animate-in fade-in zoom-in-95 duration-150">
                                            {m.name}
                                            <button onClick={() => toggleMember(id)} className="text-green-400 hover:text-red-500 transition-colors ml-0.5">
                                                <X size={11} />
                                            </button>
                                        </span>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Quick Tasks */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 size={10} /> Initial Tasks
                        </label>
                        <div className="space-y-1.5">
                            {tasks.map((task, i) => (
                                <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 group">
                                    <span className="w-4 h-4 rounded-full border-2 border-green-300 shrink-0" />
                                    <span className="text-xs font-medium text-slate-700 flex-1">{task}</span>
                                    <button onClick={() => setTasks(t => t.filter((_, idx) => idx !== i))} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            <div className="relative">
                                <Input
                                    placeholder="Add a task and press Enter..."
                                    value={newTask}
                                    onChange={e => setNewTask(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTask() } }}
                                    className="h-8 rounded-lg border-slate-200 bg-white text-xs pr-8 font-medium placeholder:text-slate-300"
                                />
                                <button onClick={handleAddTask} className="absolute right-1.5 top-1 p-1 text-green-600 hover:bg-green-50 rounded transition-colors">
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Compact Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 h-9 rounded-xl border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-100">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={!title || !teamLeadId || !deadline}
                        className="flex-1 h-9 bg-[#14532d] hover:bg-[#166534] text-white rounded-xl font-semibold text-sm shadow-md shadow-green-900/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Create Project
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
