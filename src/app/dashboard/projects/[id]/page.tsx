import { getProject, getTasks, getEmployees } from "../actions"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "lucide-react"
import { format } from "date-fns"
import { notFound } from "next/navigation"
import { TaskBoard } from "./task-board"
import { NewTaskDialog } from "./new-task-dialog"

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const project = await getProject(id)
    const tasks = await getTasks(id)
    const employees = await getEmployees()

    if (!project) return notFound()

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-bold tracking-tight">{project.title}</h2>
                            <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                {project.status}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground max-w-2xl">{project.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {project.due_date && (
                            <div className="flex items-center text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                <Calendar className="mr-2 h-4 w-4" />
                                Due {format(new Date(project.due_date), "MMM d")}
                            </div>
                        )}
                        <NewTaskDialog projectId={project.id} employees={employees} />
                    </div>
                </div>
            </div>

            {/* Task Board Client Component */}
            <div className="flex-1 min-h-[500px] border rounded-xl bg-muted/30 p-4">
                <TaskBoard tasks={tasks} projectId={project.id} />
            </div>
        </div>
    )
}
