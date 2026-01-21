"use client"

import { Trash2 } from "lucide-react"
import { deleteProject } from "./actions"
import { useState } from "react"
import { toast } from 'sonner'

export function DeleteProjectButton({ projectId, projectTitle }: { projectId: string, projectTitle: string }) {
    const [isDeleting, setIsDeleting] = useState(false)

    async function handleDelete(e: React.MouseEvent) {
        e.preventDefault() // Prevent Link navigation
        e.stopPropagation() // Stop event bubbling

        if (!confirm(`Are you sure you want to delete "${projectTitle}"? This will delete the project and ALL its tasks.`)) {
            return
        }

        setIsDeleting(true)
        try {
            await deleteProject(projectId)
            toast.success('Project deleted successfully')
        } catch (error) {
            toast.error('Failed to delete project')
            setIsDeleting(false)
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
            title="Delete project"
        >
            <Trash2 className="h-4 w-4" />
        </button>
    )
}
