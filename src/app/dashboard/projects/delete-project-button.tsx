"use client"

import { Trash2 } from "lucide-react"
import { useHems } from "@/context/HemsContext"
import { useState } from "react"
import { toast } from 'sonner'

export function DeleteProjectButton({ projectId, projectTitle }: { projectId: string, projectTitle: string }) {
    const { deleteProject } = useHems()
    const [isDeleting, setIsDeleting] = useState(false)

    async function handleDelete(e: React.MouseEvent) {
        e.preventDefault() // Prevent Link navigation
        e.stopPropagation() // Stop event bubbling

        if (!confirm(`Are you sure you want to delete "${projectTitle}"? This will delete the project and ALL its tasks.`)) {
            return
        }

        setIsDeleting(true)
        try {
            const result = await deleteProject(projectId)
            if (result && !result.success) {
                toast.error(`Failed to delete project: ${result.error}`)
                setIsDeleting(false)
            } else {
                toast.success('Project deleted successfully')
            }
        } catch (error) {
            toast.error('An unexpected error occurred during deletion')
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
