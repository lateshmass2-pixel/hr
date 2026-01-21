"use client"

import { useState } from "react"
import Link from "next/link"
import { useHems } from "@/context/HemsContext"
import { Badge } from "@/components/ui/badge"
import {
    Calendar,
    ArrowRight,
    Layout,
    MoreVertical,
    CheckSquare,
    Sparkles,
    Plus,
    User,
    Check,
    Briefcase,
    Shield,
    Trash2
} from "lucide-react"
import { format } from "date-fns"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export default function ProjectsPage() {
    const { projects, addProject, addTeam, employees, deleteProject } = useHems()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [step, setStep] = useState(1)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    // Form State
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        deadline: "",
        leadId: "",
        memberIds: [] as string[],
        requireCheckIn: false
    })

    const handleCreate = () => {
        // 1. Create Team
        const newTeamId = crypto.randomUUID()
        const projectId = crypto.randomUUID()

        addTeam({
            name: `${formData.title} Team`,
            leadId: formData.leadId,
            memberIds: formData.memberIds,
            projectId: projectId
        })

        // 2. Create Project
        addProject({
            title: formData.title,
            description: formData.description,
            deadline: formData.deadline,
            status: 'ACTIVE',
            teamLeadId: formData.leadId,
            memberIds: formData.memberIds
        })

        setIsDialogOpen(false)
        setStep(1)
        setFormData({ title: "", description: "", deadline: "", leadId: "", memberIds: [], requireCheckIn: false })
    }

    const toggleMember = (id: string) => {
        setFormData(prev => ({
            ...prev,
            memberIds: prev.memberIds.includes(id)
                ? prev.memberIds.filter(mid => mid !== id)
                : [...prev.memberIds, id]
        }))
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center shadow-lg">
                        <CheckSquare className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#1a1a1a]">Projects</h2>
                        <p className="text-[#6b6b6b] text-sm mt-1">Manage ongoing initiatives and track progress.</p>
                    </div>
                </div>

                {/* Create Wizard Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-[#1a1a1a] text-white hover:bg-black gap-2 rounded-xl shadow-lg shadow-black/10">
                            <Plus size={18} /> New Project
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white rounded-3xl border-[#e8e4e0]">
                        <div className="bg-[#faf8f5] px-6 py-4 border-b border-[#e8e4e0] flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-xl font-bold text-[#1a1a1a]">Create Project</DialogTitle>
                                <DialogDescription>Step {step} of 3</DialogDescription>
                            </div>
                            <div className="flex gap-1">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={cn("h-1.5 w-8 rounded-full transition-colors", step >= i ? "bg-[#e07850]" : "bg-[#e8e4e0]")} />
                                ))}
                            </div>
                        </div>

                        <div className="p-6">
                            {step === 1 && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="grid gap-2">
                                        <Label>Project Title</Label>
                                        <Input
                                            placeholder="e.g. Q1 Marketing Campaign"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="rounded-xl border-[#e8e4e0] bg-[#faf8f5]"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Deadline</Label>
                                        <Input
                                            type="date"
                                            value={formData.deadline}
                                            onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                                            className="rounded-xl border-[#e8e4e0] bg-[#faf8f5]"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Description</Label>
                                        <Textarea
                                            placeholder="Brief overview..."
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="rounded-xl border-[#e8e4e0] bg-[#faf8f5] min-h-[100px]"
                                        />
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-3">
                                        <Label>Select Team Lead 👑</Label>
                                        <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto p-1">
                                            {employees.map(emp => (
                                                <div
                                                    key={emp.id}
                                                    onClick={() => setFormData({ ...formData, leadId: emp.id })}
                                                    className={cn(
                                                        "p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3",
                                                        formData.leadId === emp.id ? "border-[#e07850] bg-[#e07850]/5 ring-1 ring-[#e07850]" : "border-[#e8e4e0] hover:border-[#a0a0a0]"
                                                    )}
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-black text-white flex items-center justify-center text-xs font-bold">
                                                        {emp.full_name.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-[#1a1a1a]">{emp.full_name}</p>
                                                        <p className="text-xs text-[#6b6b6b]">{emp.position}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label>Select Members</Label>
                                        <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto">
                                            {employees.filter(e => e.id !== formData.leadId).map(emp => (
                                                <div
                                                    key={emp.id}
                                                    onClick={() => toggleMember(emp.id)}
                                                    className={cn(
                                                        "p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-2",
                                                        formData.memberIds.includes(emp.id) ? "border-[#e07850] bg-[#e07850]/5" : "border-[#e8e4e0]"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-4 h-4 rounded border flex items-center justify-center",
                                                        formData.memberIds.includes(emp.id) ? "bg-[#e07850] border-[#e07850] text-white" : "border-gray-300"
                                                    )}>
                                                        {formData.memberIds.includes(emp.id) && <Check size={10} />}
                                                    </div>
                                                    <span className="text-sm text-[#6b6b6b]">{emp.full_name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="bg-[#faf8f5] p-5 rounded-2xl border border-[#e8e4e0]">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-white rounded-xl border border-[#e8e4e0] shadow-sm">
                                                <Shield className="text-[#e07850]" size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-base font-bold text-[#1a1a1a]">Activity Tracking</h4>
                                                <p className="text-sm text-[#6b6b6b] mt-1">
                                                    Ensure team accountability by enabling activity validation.
                                                </p>

                                                <div className="mt-4 flex items-center gap-3">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setFormData({ ...formData, requireCheckIn: !formData.requireCheckIn })}
                                                        className={cn(
                                                            "border-2",
                                                            formData.requireCheckIn ? "border-[#e07850] text-[#e07850] bg-[#e07850]/5" : "border-[#e8e4e0]"
                                                        )}
                                                    >
                                                        {formData.requireCheckIn ? "Enabled" : "Disabled"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-blue-700 text-sm">
                                        <Sparkles size={16} className="shrink-0 mt-0.5" />
                                        <p>This project will be created with <strong>{formData.memberIds.length + (formData.leadId ? 1 : 0)} members</strong>. A dedicated workspace will be set up automatically.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="p-6 pt-0 sm:justify-between">
                            <Button
                                variant="ghost"
                                onClick={() => setStep(prev => Math.max(1, prev - 1))}
                                disabled={step === 1}
                            >
                                Back
                            </Button>
                            {step < 3 ? (
                                <Button className="bg-[#1a1a1a] text-white" onClick={() => setStep(prev => prev + 1)}>
                                    Next Step <ArrowRight size={16} className="ml-2" />
                                </Button>
                            ) : (
                                <Button className="bg-[#e07850] hover:bg-[#d45a3a] text-white" onClick={handleCreate}>
                                    Create Project <Check size={16} className="ml-2" />
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Project Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                    <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                        <div className="group relative h-full bg-white rounded-3xl border border-[#e8e4e0] shadow-md hover:shadow-lg hover:border-[#e07850]/30 transition-all duration-300 cursor-pointer overflow-hidden p-6 space-y-4">
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#e07850]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                            <div className="flex justify-between items-start">
                                <Badge className={cn(
                                    "border",
                                    project.status === 'ACTIVE' ? "bg-[#e07850]/10 text-[#e07850] border-[#e07850]/20" :
                                        project.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                            "bg-gray-100 text-gray-600 border-gray-200"
                                )}>
                                    {project.status}
                                </Badge>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            setDeleteConfirmId(project.id)
                                        }}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete project"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <ArrowRight className="h-4 w-4 text-[#e07850] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-[#1a1a1a] group-hover:text-[#e07850] transition-colors">{project.title}</h3>
                                <p className="text-sm text-[#6b6b6b] line-clamp-2 mt-1 min-h-[40px]">{project.description}</p>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-[#6b6b6b]">Progress</span>
                                    <span className="text-[#1a1a1a]">{project.progress}%</span>
                                </div>
                                <div className="h-2 w-full bg-[#f5f3f0] rounded-full overflow-hidden">
                                    <div className="h-full bg-[#e07850] rounded-full transition-all duration-500" style={{ width: `${project.progress}%` }} />
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-[#e8e4e0]">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white" />
                                    ))}
                                </div>
                                <div className="flex items-center text-xs text-[#a0a0a0]">
                                    <Calendar className="mr-1.5 h-3.5 w-3.5" />
                                    {project.deadline ? format(new Date(project.deadline), "MMM d, yyyy") : "No deadline"}
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 size={20} /> Delete Project?
                        </DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. All tasks and team assignments will be permanently removed.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => {
                                if (deleteConfirmId) deleteProject(deleteConfirmId)
                                setDeleteConfirmId(null)
                            }}
                        >
                            Delete Project
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
