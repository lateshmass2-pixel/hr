"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Clock, Flag, LayoutGrid, MoreVertical, Trash2, Eye, Hourglass, FolderKanban } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHems } from "@/context/HemsContext"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
import Link from "next/link"
import { theme } from "@/lib/theme"

interface ProjectCardProps {
    project: any
    employees: any[]
}

export function ProjectCard({ project, employees }: ProjectCardProps) {
    const { tasks, deleteProject } = useHems()
    const [isExpanded, setIsExpanded] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)

    // Filter tasks for this project
    const projectTasks = tasks.filter(t => t.projectId === project.id)
    const completedTasks = projectTasks.filter(t => t.status === 'Done').length
    const totalTasks = projectTasks.length
    const calculateProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Get project members
    const members = employees.filter(e => project.memberIds?.includes(e.id))
    // Get lead
    const lead = employees.find(e => e.id === project.teamLeadId)

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        await deleteProject(project.id)
        setIsDeleteOpen(false)
    }

    // Green Theme Colors
    const TEXT_PRIMARY = "text-[#14532d]"
    const TEXT_SECONDARY = "text-[#15803d]"
    const BG_PRIMARY = "bg-[#14532d]"
    const BG_SECONDARY = "bg-[#bef264]" // Light lime/green for progress track
    const BORDER_PRIMARY = "border-[#14532d]"

    return (
        <>
            <motion.div
                layout
                onClick={() => !isDeleteOpen && setIsExpanded(!isExpanded)}
                className={cn(
                    theme.card, // Use standard card styles
                    "p-5 cursor-pointer overflow-hidden relative group hover:border-[#15803d]",
                    isExpanded ? "row-span-2 ring-2 ring-green-100 border-green-300" : ""
                )}
                initial={{ borderRadius: 24 }}
            >
                {/* Header Row */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-50 text-[#14532d] shadow-sm ring-1 ring-green-100">
                            <FolderKanban size={20} strokeWidth={2} />
                        </div>
                        <h3 className="font-bold text-lg text-[#14532d] tracking-tight">{project.title}</h3>
                    </div>

                    {isExpanded && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1 hover:bg-green-50 rounded-full text-green-700" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical size={20} />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl border-green-100">
                                <Link href={`/dashboard/projects/${project.id}`}>
                                    <DropdownMenuItem className="cursor-pointer font-medium text-green-800 hover:bg-green-50 hover:text-green-900 focus:bg-green-50 focus:text-green-900">
                                        <Eye size={16} className="mr-2" /> View Details
                                    </DropdownMenuItem>
                                </Link>
                                <DropdownMenuItem
                                    className="cursor-pointer text-red-600 font-medium focus:text-red-700 focus:bg-red-50"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setIsDeleteOpen(true)
                                    }}
                                >
                                    <Trash2 size={16} className="mr-2" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Expanded Content: Task Tree */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6"
                        >
                            <div className="flex items-center justify-between mb-4 border border-green-200 rounded-full px-4 py-2 bg-green-50/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full border border-green-600 flex items-center justify-center bg-white">
                                        <Check size={12} className={TEXT_PRIMARY} strokeWidth={3} />
                                    </div>
                                    <span className={`font-bold ${TEXT_PRIMARY}`}>{completedTasks} of {totalTasks}</span>
                                </div>
                                <div className="flex items-center gap-3 flex-1 mx-4">
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${BG_PRIMARY} rounded-full`}
                                            style={{ width: `${calculateProgress}%` }}
                                        />
                                    </div>
                                    <span className={`font-bold ${TEXT_PRIMARY}`}>{calculateProgress}%</span>
                                </div>
                            </div>

                            {/* Task Tree */}
                            <div className="space-y-4 pl-4 relative">
                                {/* Vertical Line */}
                                <div className="absolute left-[22px] top-2 bottom-4 w-[2px] bg-green-200" />

                                {totalTasks === 0 ? (
                                    <p className="text-slate-400 text-sm italic pl-8">No tasks yet.</p>
                                ) : (
                                    projectTasks.slice(0, 5).map((task, i, arr) => (
                                        <div key={task.id} className="relative flex items-center gap-3">
                                            {/* Branch Line */}
                                            <div className="absolute left-[2px] top-1/2 w-4 h-[2px] bg-green-200 -translate-y-1/2" />

                                            <div className="w-4 h-4 rounded-full border-2 border-green-600 bg-white z-10 ml-[10px]" />
                                            <span className="font-medium text-[#14532d] text-sm">{task.title}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Collapsed Only: Simple Progress */}
                {!isExpanded && (
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-100 rounded-full relative"
                                style={{ width: '100%' }} // Background track
                            >
                                {/* Actual Progress */}
                                <div
                                    className={`h-full ${BG_PRIMARY} rounded-full`}
                                    style={{ width: `${calculateProgress}%` }}
                                />
                            </div>
                        </div>
                        <span className={`font-bold text-lg ${TEXT_PRIMARY}`}>{calculateProgress}%</span>
                    </div>
                )}

                {/* Status & Avatars Footer */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Hourglass size={18} className="text-[#15803d]" strokeWidth={2.5} />
                        <span className="font-medium text-[#15803d] text-sm">
                            {totalTasks === completedTasks && totalTasks > 0 ? "Completed" : "In Progress"}
                        </span>
                    </div>

                    {isExpanded ? (
                        <div className="flex gap-2 overflow-x-auto pb-1 max-w-[50%]">
                            {lead && (
                                <div className="flex items-center gap-2 border border-green-100 rounded-full px-2 py-1 bg-[#f8faf6] shrink-0">
                                    <div className="w-5 h-5 rounded-full bg-[#14532d] text-white flex items-center justify-center text-[10px] font-bold">
                                        {lead.full_name.charAt(0)}
                                    </div>
                                    <span className="text-xs font-medium truncate max-w-[60px] text-green-900">{lead.full_name}</span>
                                </div>
                            )}
                            {members.slice(0, 2).map(m => (
                                <div key={m.id} className="flex items-center gap-2 border border-green-100 rounded-full px-2 py-1 bg-white shrink-0">
                                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-[10px] text-green-800 font-bold">
                                        {m.full_name.charAt(0)}
                                    </div>
                                    <span className="text-xs font-medium truncate max-w-[60px] text-green-800">{m.full_name}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex -space-x-3">
                            {/* Avatars */}
                            {lead && (
                                <div className="w-9 h-9 rounded-full border-2 border-white bg-[#14532d] text-white flex items-center justify-center text-xs font-bold z-30 shadow-sm">
                                    {lead.full_name.charAt(0)}
                                </div>
                            )}
                            {members.slice(0, 3).map((m, i) => (
                                <div key={m.id} className={cn(
                                    "w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold shadow-sm",
                                    i === 0 ? "bg-[#15803d] text-white z-20" : "bg-[#dcfce7] text-[#14532d] z-10"
                                )}>
                                    {m.full_name.charAt(0)}
                                </div>
                            ))}
                            {(members.length > 3) && (
                                <div className="w-9 h-9 rounded-full border-2 border-white bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold z-0 shadow-sm">
                                    {members.length - 3}+
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl border-0 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 size={18} /> Delete Project?
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{project.title}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} className="hover:bg-slate-100 text-slate-600">Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} className="rounded-xl bg-red-600 hover:bg-red-700">Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
