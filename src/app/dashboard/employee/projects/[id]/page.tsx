"use client"

import { useState } from "react"
import { useHems } from "@/context/HemsContext"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    MoreHorizontal,
    Plus,
    Clock,
    AlertCircle,
    Crown,
    Link as LinkIcon,
    ShieldCheck,
    Github,
    Figma,
    FileText,
    ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function EmployeeProjectBoard() {
    const { id } = useParams()
    const { projects, teams, employees, tasks, updateTask } = useHems()

    const project = projects.find(p => p.id === id)
    const team = teams.find(t => t.projectId === id)
    const projectTasks = tasks.filter(t => t.projectId === id)

    // Proof Modal State
    const [proofModalOpen, setProofModalOpen] = useState(false)
    const [pendingTask, setPendingTask] = useState<string | null>(null)
    const [proofLink, setProofLink] = useState("")

    if (!project) return <div className="p-10">Project not found</div>

    const handleStatusChange = (taskId: string, newStatus: string) => {
        if (newStatus === "Done") {
            setPendingTask(taskId)
            setProofLink("")
            setProofModalOpen(true)
        } else {
            updateTask(taskId, { status: newStatus as any })
        }
    }

    const submitProof = () => {
        if (pendingTask && proofLink) {
            updateTask(pendingTask, {
                status: "Done",
                proofUrl: proofLink,
                verificationStatus: "Pending"
            })
            setProofModalOpen(false)
            setPendingTask(null)
        }
    }

    return (
        <div className="flex h-[calc(100vh-140px)] -m-6 sm:-m-8">
            <div className="flex-1 flex flex-col min-w-0 bg-[#faf8f5]">
                {/* Simplified Header for Employee */}
                <div className="bg-white border-b border-[#e8e4e0] px-8 py-5 flex items-center justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-[#1a1a1a]">{project.title}</h1>
                            <Badge variant="secondary">Worker View</Badge>
                        </div>
                    </div>
                </div>

                {/* Kanban Board */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-8">
                    <div className="flex gap-6 h-full pb-4">
                        {['To Do', 'In Progress', 'Review', 'Done'].map(col => {
                            const colTasks = projectTasks.filter(t => t.status === col)
                            return (
                                <div key={col} className="w-80 shrink-0 flex flex-col h-full rounded-2xl bg-[#f5f3f0]/50 border border-[#e8e4e0]/50">
                                    <div className="p-4 flex items-center justify-between">
                                        <h4 className="font-semibold text-[#6b6b6b] text-sm">{col}</h4>
                                        <span className="bg-white px-2 py-0.5 rounded-full text-xs font-medium text-[#a0a0a0] shadow-sm">
                                            {colTasks.length}
                                        </span>
                                    </div>

                                    <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                                        <AnimatePresence>
                                            {colTasks.map(task => {
                                                const assignee = employees.find(e => e.id === task.assigneeId)
                                                return (
                                                    <motion.div
                                                        key={task.id}
                                                        layoutId={task.id}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        className="bg-white p-4 rounded-xl border border-[#e8e4e0] shadow-sm group hover:shadow-md transition-shadow"
                                                    >
                                                        <div className="flex justify-between items-start gap-2">
                                                            <p className="font-medium text-[#1a1a1a] text-sm leading-snug">{task.title}</p>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger className="text-[#a0a0a0] hover:text-[#1a1a1a]">
                                                                    <MoreHorizontal size={14} />
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel>Move to...</DropdownMenuLabel>
                                                                    {['To Do', 'In Progress', 'Review', 'Done'].filter(c => c !== col).map(target => (
                                                                        <DropdownMenuItem
                                                                            key={target}
                                                                            onClick={() => handleStatusChange(task.id, target)}
                                                                        >
                                                                            {target}
                                                                        </DropdownMenuItem>
                                                                    ))}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>

                                                        {/* Verification Status Badge */}
                                                        {task.verificationStatus && (
                                                            <div className={cn(
                                                                "mt-2 text-[10px] px-2 py-1 rounded-md inline-flex items-center gap-1 font-medium",
                                                                task.verificationStatus === 'Pending' ? "bg-amber-50 text-amber-700" :
                                                                    task.verificationStatus === 'Verified' ? "bg-emerald-50 text-emerald-700" :
                                                                        "bg-red-50 text-red-700"
                                                            )}>
                                                                {task.verificationStatus}
                                                            </div>
                                                        )}

                                                        <div className="mt-3 flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-600">
                                                                    {assignee?.full_name.substring(0, 2)}
                                                                </div>
                                                                <span className="text-xs text-[#6b6b6b] truncate max-w-[80px]">{assignee?.full_name.split(' ')[0]}</span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )
                                            })}
                                        </AnimatePresence>

                                        <button className="w-full py-2 flex items-center justify-center gap-2 text-sm text-[#a0a0a0] hover:text-[#e07850] hover:bg-[#e07850]/5 rounded-xl border border-dashed border-[#e8e4e0] hover:border-[#e07850]/30 transition-all">
                                            <Plus size={14} /> Add Task
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Proof of Work Modal */}
            <Dialog open={proofModalOpen} onOpenChange={(open) => {
                if (!open) {
                    setProofModalOpen(false)
                    setPendingTask(null)
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="text-emerald-500" />
                            Proof of Work
                        </DialogTitle>
                        <DialogDescription>
                            Submit a link to verify your work.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Artifact Link</Label>
                            <div className="relative">
                                <ExternalLink className="absolute left-3 top-3 h-4 w-4 text-[#a0a0a0]" />
                                <Input
                                    className="pl-9"
                                    placeholder="https://..."
                                    value={proofLink}
                                    onChange={(e) => setProofLink(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProofModalOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={!proofLink}
                            onClick={submitProof}
                        >
                            Submit for Review
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
