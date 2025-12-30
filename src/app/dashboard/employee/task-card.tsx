'use client'

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Calendar, AlertCircle } from "lucide-react"
import { updateTaskStatus } from "./actions"

type Task = {
    id: string
    title: string
    description?: string
    status: string
    priority?: string
    due_date?: string
    projects?: { name: string }
}

const priorityColors: Record<string, string> = {
    'HIGH': 'border-l-red-500 bg-red-50/50',
    'MEDIUM': 'border-l-amber-500 bg-amber-50/50',
    'LOW': 'border-l-blue-500 bg-blue-50/50',
}

const priorityBadgeColors: Record<string, string> = {
    'HIGH': 'bg-red-100 text-red-800',
    'MEDIUM': 'bg-amber-100 text-amber-800',
    'LOW': 'bg-blue-100 text-blue-800',
}

export function TaskCard({ task }: { task: Task }) {
    const [status, setStatus] = useState(task.status)
    const [isUpdating, setIsUpdating] = useState(false)

    const handleStatusChange = async (newStatus: string) => {
        setIsUpdating(true)
        const result = await updateTaskStatus(task.id, newStatus)
        if (result.success) {
            setStatus(newStatus)
        }
        setIsUpdating(false)
    }

    const priority = task.priority || 'LOW'
    const cardClass = priorityColors[priority] || ''

    return (
        <Card className={`border-l-4 ${cardClass} ${isUpdating ? 'opacity-50' : ''}`}>
            <CardContent className="p-3">
                <div className="flex justify-between items-start gap-2 mb-2">
                    <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
                    <Badge className={`text-[10px] shrink-0 ${priorityBadgeColors[priority] || ''}`}>
                        {priority}
                    </Badge>
                </div>

                {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {task.description}
                    </p>
                )}

                {task.projects?.name && (
                    <p className="text-xs text-muted-foreground mb-2">
                        📁 {task.projects.name}
                    </p>
                )}

                <div className="flex items-center justify-between gap-2 mt-3">
                    {task.due_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.due_date).toLocaleDateString()}
                        </div>
                    )}

                    <Select value={status} onValueChange={handleStatusChange} disabled={isUpdating}>
                        <SelectTrigger className="h-7 text-xs w-auto min-w-[100px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TODO">To Do</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="DONE">Done</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
    )
}
