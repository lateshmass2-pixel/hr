"use client"

import { useState } from "react"
import Link from "next/link"
import { useHems } from "@/context/HemsContext"
import { motion, AnimatePresence } from "framer-motion"
import {
    Plus, Trash2, Users, FolderKanban
} from "lucide-react"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { GradientStatCard } from "@/components/ui/gradient-stat-card"
import { cn } from "@/lib/utils"
import { ProjectCard } from "./project-card"
import CreateProjectModal from "@/components/projects/create-project-modal"

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
    const { projects, employees, deleteProject } = useHems()
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

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

                <CreateProjectModal />
            </div>

            {/* Stats Row */}
            {/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            </div> */}

            {/* Project Grid */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-min items-start">
                <AnimatePresence>
                    {projects.map((project, index) => (
                        <ProjectCard key={project.id} project={project} employees={employees} />
                    ))}
                </AnimatePresence>
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
