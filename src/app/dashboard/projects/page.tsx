"use client"

import { useState } from "react"
import Link from "next/link"
import { useHems } from "@/context/HemsContext"
import { motion, AnimatePresence } from "framer-motion"
import {
    Calendar, ArrowRight, Plus, Check, Shield, Trash2, Users, FolderKanban
} from "lucide-react"
import { format } from "date-fns"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { GradientStatCard, SoftCard } from "@/components/ui/gradient-stat-card"
import { cn } from "@/lib/utils"

// Gradient covers for project cards
const gradientCovers = [
    'from-pink-100 via-pink-50 to-rose-50',
    'from-cyan-100 via-cyan-50 to-sky-50',
    'from-emerald-100 via-emerald-50 to-teal-50',
    'from-orange-100 via-orange-50 to-amber-50',
    'from-purple-100 via-purple-50 to-violet-50',
]

const avatarColors = [
    'from-pink-500 to-rose-500',
    'from-cyan-500 to-sky-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
]

export default function ProjectsPage() {
    const { projects, addProject, addTeam, employees, deleteProject } = useHems()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [step, setStep] = useState(1)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        deadline: "",
        leadId: "",
        memberIds: [] as string[],
        requireCheckIn: false
    })

    const handleCreate = () => {
        const projectId = crypto.randomUUID()

        addTeam({
            name: `${formData.title} Team`,
            leadId: formData.leadId,
            memberIds: formData.memberIds,
            projectId: projectId
        })

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

    const activeProjects = projects.filter(p => p.status === 'ACTIVE').length
    const completedProjects = projects.filter(p => p.status === 'COMPLETED').length

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Projects</h1>
                    <p className="text-gray-500 mt-1">Manage ongoing initiatives and track progress</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="pill-button-primary flex items-center gap-2"
                        >
                            <Plus size={16} /> New Project
                        </motion.button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden rounded-3xl border-0 shadow-hover">
                        <div className="gradient-blue px-6 py-5 flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-xl font-bold text-gray-900">Create Project</DialogTitle>
                                <DialogDescription className="text-gray-600">Step {step} of 3</DialogDescription>
                            </div>
                            <div className="flex gap-1.5">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={cn(
                                        "h-2 w-8 rounded-full transition-colors",
                                        step >= i ? "bg-orange-500" : "bg-white/50"
                                    )} />
                                ))}
                            </div>
                        </div>

                        <div className="p-6 bg-white">
                            {step === 1 && (
                                <div className="space-y-4 animate-fade-in-up">
                                    <div className="grid gap-2">
                                        <Label className="text-gray-700 font-medium">Project Title</Label>
                                        <Input
                                            placeholder="e.g. Q1 Marketing Campaign"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="rounded-xl border-gray-200 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-gray-700 font-medium">Deadline</Label>
                                        <Input
                                            type="date"
                                            value={formData.deadline}
                                            onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                                            className="rounded-xl border-gray-200"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-gray-700 font-medium">Description</Label>
                                        <Textarea
                                            placeholder="Brief overview..."
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="rounded-xl border-gray-200 min-h-[100px]"
                                        />
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="space-y-3">
                                        <Label className="text-gray-700 font-medium">Select Team Lead 👑</Label>
                                        <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto">
                                            {employees.map((emp, i) => (
                                                <div
                                                    key={emp.id}
                                                    onClick={() => setFormData({ ...formData, leadId: emp.id })}
                                                    className={cn(
                                                        "p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3",
                                                        formData.leadId === emp.id
                                                            ? "border-orange-500 bg-orange-50"
                                                            : "border-gray-100 hover:border-gray-200"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-9 h-9 rounded-xl bg-gradient-to-br text-white flex items-center justify-center text-xs font-bold",
                                                        avatarColors[i % avatarColors.length]
                                                    )}>
                                                        {emp.full_name.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">{emp.full_name}</p>
                                                        <p className="text-xs text-gray-500">{emp.position}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-gray-700 font-medium">Select Members</Label>
                                        <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto">
                                            {employees.filter(e => e.id !== formData.leadId).map(emp => (
                                                <div
                                                    key={emp.id}
                                                    onClick={() => toggleMember(emp.id)}
                                                    className={cn(
                                                        "p-2.5 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-2",
                                                        formData.memberIds.includes(emp.id)
                                                            ? "border-orange-500 bg-orange-50"
                                                            : "border-gray-100"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors",
                                                        formData.memberIds.includes(emp.id)
                                                            ? "bg-orange-500 border-orange-500 text-white"
                                                            : "border-gray-300"
                                                    )}>
                                                        {formData.memberIds.includes(emp.id) && <Check size={12} />}
                                                    </div>
                                                    <span className="text-sm text-gray-700">{emp.full_name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-5 animate-fade-in-up">
                                    <div className="gradient-mint p-5 rounded-2xl">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 rounded-xl bg-white/60">
                                                <Shield className="text-emerald-600" size={22} />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-gray-900">Activity Tracking</h4>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Enable activity validation for team accountability.
                                                </p>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setFormData({ ...formData, requireCheckIn: !formData.requireCheckIn })}
                                                    className={cn(
                                                        "mt-3 rounded-xl border-2",
                                                        formData.requireCheckIn
                                                            ? "border-emerald-500 text-emerald-600 bg-white"
                                                            : "border-gray-200"
                                                    )}
                                                >
                                                    {formData.requireCheckIn ? "Enabled ✓" : "Disabled"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="gradient-orange p-4 rounded-xl flex gap-3 text-orange-700">
                                        <Users size={18} className="shrink-0 mt-0.5" />
                                        <p className="text-sm">
                                            Creating project with <strong>{formData.memberIds.length + (formData.leadId ? 1 : 0)} members</strong>.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="p-6 pt-0 bg-white sm:justify-between">
                            <Button
                                variant="ghost"
                                onClick={() => setStep(prev => Math.max(1, prev - 1))}
                                disabled={step === 1}
                                className="text-gray-500"
                            >
                                Back
                            </Button>
                            {step < 3 ? (
                                <Button onClick={() => setStep(prev => prev + 1)} className="pill-button-primary">
                                    Next <ArrowRight size={14} className="ml-2" />
                                </Button>
                            ) : (
                                <Button onClick={handleCreate} className="pill-button-primary bg-emerald-500 hover:bg-emerald-600">
                                    Create <Check size={14} className="ml-2" />
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <GradientStatCard
                    title="Total Projects"
                    value={projects.length}
                    icon={<FolderKanban size={18} />}
                    variant="pink"
                />
                <GradientStatCard
                    title="Active"
                    value={activeProjects}
                    trend="In Progress"
                    variant="blue"
                />
                <GradientStatCard
                    title="Completed"
                    value={completedProjects}
                    variant="mint"
                />
                <GradientStatCard
                    title="Team Members"
                    value={employees.length}
                    icon={<Users size={18} />}
                    variant="peach"
                />
            </div>

            {/* Project Grid */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project, index) => (
                    <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                    >
                        <Link href={`/dashboard/projects/${project.id}`}>
                            <motion.div
                                whileHover={{ y: -6 }}
                                className="group soft-card-hover overflow-hidden p-0"
                            >
                                {/* Gradient Cover */}
                                <div className={cn(
                                    "h-28 w-full relative bg-gradient-to-br",
                                    gradientCovers[index % gradientCovers.length]
                                )}>
                                    {/* Status Badge */}
                                    <div className="absolute top-4 left-4">
                                        <span className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-semibold bg-white/80 backdrop-blur-sm shadow-sm",
                                            project.status === 'ACTIVE' ? "text-emerald-600" :
                                                project.status === 'COMPLETED' ? "text-purple-600" : "text-gray-600"
                                        )}>
                                            {project.status}
                                        </span>
                                    </div>

                                    {/* Delete Button */}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            setDeleteConfirmId(project.id)
                                        }}
                                        className="absolute top-4 right-4 p-2 rounded-xl bg-white/80 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>

                                    {/* Decorative circles */}
                                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/20 rounded-full" />
                                    <div className="absolute -top-4 -left-4 w-16 h-16 bg-white/15 rounded-full" />
                                </div>

                                {/* Content */}
                                <div className="p-5 space-y-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                                            {project.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 line-clamp-2 mt-1 min-h-[40px]">
                                            {project.description}
                                        </p>
                                    </div>

                                    {/* Progress Bar */}
                                    <div>
                                        <div className="flex justify-between text-xs font-medium mb-2">
                                            <span className="text-gray-500">Progress</span>
                                            <span className="text-gray-900 font-bold">{project.progress}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${project.progress}%` }}
                                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                                className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                                            />
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-2">
                                        {/* Avatars */}
                                        <div className="flex -space-x-2">
                                            {[0, 1, 2].map((i) => (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        "w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br",
                                                        avatarColors[i % avatarColors.length]
                                                    )}
                                                >
                                                    {String.fromCharCode(65 + i)}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex items-center text-xs text-gray-500 font-medium">
                                            <Calendar className="mr-1.5 h-3.5 w-3.5" />
                                            {project.deadline ? format(new Date(project.deadline), "MMM d") : "No date"}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* Delete Dialog */}
            <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                <DialogContent className="max-w-sm rounded-3xl border-0 shadow-hover">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 size={18} /> Delete Project?
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            This will permanently remove the project and all its tasks.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
                            onClick={() => {
                                if (deleteConfirmId) deleteProject(deleteConfirmId)
                                setDeleteConfirmId(null)
                            }}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
