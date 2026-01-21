'use client'

import { Task } from "@/app/dashboard/projects/actions"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { updateTaskStatus } from "@/app/dashboard/projects/actions"
import { useTransition } from "react"
import { Loader2, MoreHorizontal } from "lucide-react"

const COLUMNS = [
    { id: 'TODO', label: 'To Do', color: 'bg-zinc-500/10' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-orange-500/10' },
    { id: 'REVIEW', label: 'Review', color: 'bg-yellow-500/10' },
    { id: 'DONE', label: 'Done', color: 'bg-green-500/10' },
]

export function TaskBoard({ tasks, projectId }: { tasks: Task[], projectId: string }) {
    const [isPending, startTransition] = useTransition()

    const handleStatusChange = (taskId: string, newStatus: string) => {
        startTransition(async () => {
            await updateTaskStatus(taskId, newStatus, projectId)
        })
    }

    return (
        <div className="grid grid-cols-4 gap-4 h-full min-h-[500px]">
            {COLUMNS.map(col => {
                const colTasks = tasks.filter(t => t.status === col.id)

                return (
                    <div key={col.id} className={`flex flex-col h-full rounded-lg border-2 border-dashed border-transparent ${col.id === 'DONE' ? 'border-green-500/10' : ''}`}>
                        <div className="flex items-center justify-between p-3 mb-2 rounded-t-lg bg-background border border-border">
                            <span className="font-semibold text-sm">{col.label}</span>
                            <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
                        </div>

                        <ScrollArea className="flex-1 px-2">
                            <div className="space-y-3 pb-4">
                                {colTasks.map(task => (
                                    <Card key={task.id} className="cursor-grab active:cursor-grabbing hover:shadow-lg transition-all border-l-4"
                                        style={{ borderLeftColor: getPriorityColor(task.priority) }}>
                                        <CardContent className="p-3 space-y-3">
                                            <div className="flex justify-between items-start gap-2">
                                                <span className="text-sm font-medium leading-tight">{task.title}</span>
                                                {/* Simple Status Mover for MVP (Drag & Drop is complex) */}
                                                {col.id !== 'DONE' && (
                                                    <button
                                                        disabled={isPending}
                                                        onClick={() => handleStatusChange(task.id, getNextStatus(col.id))}
                                                        className="text-xs text-muted-foreground hover:text-orange-500"
                                                    >
                                                        Next &rarr;
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-1">
                                                {task.assignee ? (
                                                    <div className="flex items-center gap-2" title={task.assignee.full_name}>
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarFallback className="text-[10px] bg-orange-100 text-orange-700">
                                                                {task.assignee.full_name.charAt(0).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-xs text-gray-700">{task.assignee.full_name.split(' ')[0]}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">Unassigned</span>
                                                )}

                                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">
                                                    {task.priority}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )
            })}
        </div>
    )
}

function getPriorityColor(priority: string) {
    switch (priority) {
        case 'HIGH': return '#ef4444'; // red-500
        case 'MEDIUM': return '#f59e0b'; // amber-500
        case 'LOW': return '#10B981'; // emerald-500
        default: return '#71717a';
    }
}

function getNextStatus(current: string) {
    if (current === 'TODO') return 'IN_PROGRESS'
    if (current === 'IN_PROGRESS') return 'REVIEW'
    if (current === 'REVIEW') return 'DONE'
    return 'DONE'
}
