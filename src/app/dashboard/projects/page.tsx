"use client"

import { useState, useEffect } from "react"
import { useOrganization } from "@/context/OrganizationContext"
import { hasPermission } from "@/lib/rbac/types"
import RoleGate from "@/components/role-gate"
import { AnimatePresence } from "framer-motion"
import { Trash2, FolderKanban } from "lucide-react"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ProjectCard } from "./project-card"
import CreateProjectModal from "@/components/projects/create-project-modal"
import { deleteProject, getProjects, type Project } from "./actions"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHero } from "@/components/layout/PageHero"

export default function ProjectsPage() {
    const { role } = useOrganization()
    const [projects, setProjects] = useState<Project[]>([])
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Fetch projects via RBAC-protected server action
    useEffect(() => {
        getProjects().then((data) => {
            setProjects(data)
            setIsLoading(false)
        })
    }, [])

    const handleDelete = async (projectId: string) => {
        const result = await deleteProject(projectId)
        if (!('error' in result) || !result.error) {
            setProjects(prev => prev.filter(p => p.id !== projectId))
        }
        setDeleteConfirmId(null)
    }

    // Can this user create projects?
    const canCreate = role ? hasPermission(role, 'projects:create') : false

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <PageContainer>
            <PageHero
                title="Projects"
                subtitle="Manage ongoing initiatives and track progress across your organization."
                action={
                    <RoleGate permission="projects:create">
                        <CreateProjectModal />
                    </RoleGate>
                }
            />

            {/* Project Grid */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-min items-start">
                <AnimatePresence>
                    {projects.map((project) => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            employees={[]}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {projects.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-green-200">
                    <FolderKanban className="w-12 h-12 text-green-200 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-green-900">No projects yet</h3>
                    <p className="text-green-600 text-sm mt-1 max-w-sm mx-auto">
                        {canCreate ? 'Create your first project to get started.' : 'No projects have been assigned to you yet.'}
                    </p>
                </div>
            )}

            {/* 🔒 Delete Dialog — Only shown if user has delete permission */}
            <RoleGate permission="projects:delete">
                <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                    <DialogContent className="max-w-sm rounded-3xl border-0 shadow-xl">
                        <DialogHeader>
                            <DialogTitle className="text-red-600 flex items-center gap-2">
                                <Trash2 size={18} /> Delete Project?
                            </DialogTitle>
                            <DialogDescription className="text-slate-500">
                                This will permanently remove the project and all its tasks.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="rounded-xl border-green-200 text-green-700 hover:bg-green-50">
                                Cancel
                            </Button>
                            <Button
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md"
                                onClick={() => {
                                    if (deleteConfirmId) handleDelete(deleteConfirmId)
                                }}
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </RoleGate>
        </PageContainer>
    )
}
