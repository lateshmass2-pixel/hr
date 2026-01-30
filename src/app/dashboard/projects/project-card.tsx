"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Clock, Flag, LayoutGrid, MoreVertical, Trash2, Eye, Hourglass } from "lucide-react"
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

    // Colors
    const ORANGE = "text-[#ff6b00]"
    const ORANGE_BG = "bg-[#ff6b00]"
    const ORANGE_BORDER = "border-[#ff6b00]"
    const MINT_BG = "bg-[#fdfbf7]" // Subtle background from image

    return (
        <>
            <motion.div
                layout
                onClick={() => !isDeleteOpen && setIsExpanded(!isExpanded)}
                className={cn(
                    "bg-white rounded-[1.5rem] p-5 shadow-sm border border-gray-100 cursor-pointer overflow-hidden relative group transition-shadow hover:shadow-md",
                    isExpanded ? "row-span-2 ring-1 ring-orange-100" : ""
                )}
                initial={{ borderRadius: 24 }}
            >
                {/* Header Row */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border-2 border-black/80">
                            <LayoutGrid className="text-black" size={20} strokeWidth={2} />
                        </div>
                        <h3 className="font-bold text-lg text-black">{project.title}</h3>
                    </div>

                    {isExpanded && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1 hover:bg-gray-100 rounded-full" onClick={(e) => e.stopPropagation()}>
                                    <MoreVertical size={20} className="text-black" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                <Link href={`/dashboard/projects/${project.id}`}>
                                    <DropdownMenuItem className="cursor-pointer font-medium">
                                        <Eye size={16} className="mr-2" /> View Details
                                    </DropdownMenuItem>
                                </Link>
                                <DropdownMenuItem
                                    className="cursor-pointer text-red-600 font-medium focus:text-red-600 focus:bg-red-50"
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
                            <div className="flex items-center justify-between mb-4 border border-orange-300 rounded-full px-4 py-2 bg-orange-50/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full border border-orange-500 flex items-center justify-center">
                                        <Check size={12} className={ORANGE} strokeWidth={3} />
                                    </div>
                                    <span className={`font-bold ${ORANGE}`}>{completedTasks} of {totalTasks}</span>
                                </div>
                                <div className="flex items-center gap-3 flex-1 mx-4">
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${ORANGE_BG} rounded-full`}
                                            style={{ width: `${calculateProgress}%` }}
                                        />
                                    </div>
                                    <span className={`font-bold ${ORANGE}`}>{calculateProgress}%</span>
                                </div>
                            </div>

                            {/* Task Tree */}
                            <div className="space-y-4 pl-4 relative">
                                {/* Vertical Line */}
                                <div className="absolute left-[22px] top-2 bottom-4 w-[2px] bg-orange-400" />

                                {totalTasks === 0 ? (
                                    <p className="text-gray-400 text-sm italic pl-8">No tasks yet.</p>
                                ) : (
                                    projectTasks.slice(0, 5).map((task, i, arr) => (
                                        <div key={task.id} className="relative flex items-center gap-3">
                                            {/* Branch Line */}
                                            <div className="absolute left-[2px] top-1/2 w-4 h-[2px] bg-orange-400 -translate-y-1/2" />

                                            <div className="w-4 h-4 rounded-full border-2 border-gray-600 bg-white z-10 ml-[10px]" />
                                            <span className="font-bold text-black text-sm">{task.title}</span>
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
                        <div className="flex-1 h-2.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-orange-100 rounded-full relative"
                                style={{ width: '100%' }} // Background track
                            >
                                <div
                                    className="absolute top-0 left-0 h-full bg-[#fceecf] rounded-full"
                                    style={{ width: '100%' }}
                                />
                                <div
                                    className="absolute top-0 left-0 h-full bg-[#faecd0] rounded-full"
                                    style={{ width: '100%' }}
                                ></div>
                                {/* Actual Progress */}
                                {/* Design has specific style, keeping simple orange bar for now matching image */}
                                <div
                                    className={`h-full ${ORANGE_BG} rounded-full`}
                                    style={{ width: `${calculateProgress}%` }}
                                />
                            </div>
                        </div>
                        <span className={`font-bold text-lg ${ORANGE}`}>{calculateProgress}%</span>
                    </div>
                )}

                {/* Status & Avatars Footer */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Hourglass size={18} className={ORANGE} strokeWidth={2.5} />
                        <span className={`font-medium ${ORANGE}`}>
                            {totalTasks === completedTasks && totalTasks > 0 ? "Completed" : "In - Progress"}
                        </span>
                    </div>

                    {isExpanded ? (
                        <div className="flex gap-2 overflow-x-auto pb-1 max-w-[50%]">
                            {lead && (
                                <div className="flex items-center gap-2 border border-gray-200 rounded-full px-2 py-1 bg-white shrink-0">
                                    <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-bold">
                                        {lead.full_name.charAt(0)}
                                    </div>
                                    <span className="text-xs font-medium truncate max-w-[60px]">{lead.full_name}</span>
                                </div>
                            )}
                            {members.slice(0, 2).map(m => (
                                <div key={m.id} className="flex items-center gap-2 border border-gray-200 rounded-full px-2 py-1 bg-white shrink-0">
                                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-black font-bold">
                                        {m.full_name.charAt(0)}
                                    </div>
                                    <span className="text-xs font-medium truncate max-w-[60px]">{m.full_name}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex -space-x-3">
                            {/* Avatars */}
                            {lead && (
                                <div className="w-9 h-9 rounded-full border-2 border-white bg-black text-white flex items-center justify-center text-xs font-bold z-30">
                                    {lead.full_name.charAt(0)}
                                </div>
                            )}
                            {members.slice(0, 3).map((m, i) => (
                                <div key={m.id} className={cn(
                                    "w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold",
                                    i === 0 ? "bg-[#ff6b00] text-white z-20" : "bg-[#fceecf] text-[#ff6b00] z-10"
                                )}>
                                    {m.full_name.charAt(0)}
                                </div>
                            ))}
                            {(members.length > 3) && (
                                <div className="w-9 h-9 rounded-full border-2 border-white bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-bold z-0">
                                    {members.length - 3}+
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 size={18} /> Delete Project?
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{project.title}</strong>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} className="rounded-xl">Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
