'use client'
import { useState, useEffect } from 'react'
import { getWorkspaceMetrics } from '@/app/dashboard/projects/[id]/workspace/actions'
import { Card } from '@/components/ui/card'
import { GitCommitHorizontal, FileCode, Clock, Play } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { WorkspaceMetrics } from '@/types/workspace'
import { cn } from '@/lib/utils'

interface WorkspaceMetricsWidgetProps {
    metrics: WorkspaceMetrics
    className?: string
}

export function WorkspaceMetricsWidget({ metrics, className }: WorkspaceMetricsWidgetProps) {
    if (!metrics || metrics.total_commits === 0 && metrics.total_files === 0) {
        return (
            <Card className={cn("p-6 bg-hems-primary/5 border-hems-primary/10 flex flex-col items-center justify-center text-center", className)}>
                <FileCode className="h-8 w-8 text-hems-secondary mb-3 opacity-50" />
                <h3 className="font-semibold text-hems-primary mb-1">No Workspace Activity</h3>
                <p className="text-sm text-gray-500 max-w-[250px]">
                    Employees haven't written any code in this project's workspace yet.
                </p>
            </Card>
        )
    }

    return (
        <Card className={cn("overflow-hidden border-hems-primary/20", className)}>
            <div className="bg-hems-primary text-white px-4 py-3 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                    <FileCode size={18} className="text-hems-secondary" />
                    Workspace Activity
                </h3>
            </div>
            
            <div className="p-0">
                <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
                    <div className="p-4 flex flex-col">
                        <span className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                            <GitCommitHorizontal size={14} className="text-blue-500" /> Commits
                        </span>
                        <span className="text-2xl font-bold text-gray-900">{metrics.total_commits}</span>
                    </div>
                    
                    <div className="p-4 flex flex-col">
                        <span className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                            <FileCode size={14} className="text-emerald-500" /> Files edited
                        </span>
                        <span className="text-2xl font-bold text-gray-900">{metrics.total_files}</span>
                    </div>

                    <div className="p-4 flex flex-col col-span-2">
                        <span className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                            <Play size={14} className="text-purple-500" /> Recent Activity Feed
                        </span>
                        <div className="space-y-2 mt-1 max-h-32 overflow-y-auto pr-2 scrollbar-thin">
                            {metrics.recent_activity.slice(0, 4).map((activity) => (
                                <div key={activity.id} className="flex items-start gap-2 text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-gray-700 truncate">
                                            {formatActionText(activity.action, activity.metadata)}
                                        </p>
                                        <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                            <Clock size={10} />
                                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    )
}

function formatActionText(action: string, metadata: any): string {
    switch (action) {
        case 'commit':
            return `Committed code: "${metadata.message}"`
        case 'file_create':
            return `Created file ${metadata.file_name}`
        case 'file_update':
            return 'Saved changes to file'
        case 'file_delete':
            return `Deleted file ${metadata.file_name}`
        default:
            return action.replace('_', ' ')
    }
}

export function ProjectWorkspaceWidget({ projectId, className }: { projectId: string; className?: string }) {
    const [metrics, setMetrics] = useState<WorkspaceMetrics | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getWorkspaceMetrics(projectId)
            .then(m => {
                setMetrics(m as WorkspaceMetrics)
                setLoading(false)
            })
            .catch(() => {
                setLoading(false)
            })
    }, [projectId])

    if (loading) {
        return (
            <Card className={cn("p-6 flex items-center justify-center min-h-[150px]", className)}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-hems-primary"></div>
            </Card>
        )
    }

    return <WorkspaceMetricsWidget metrics={metrics!} className={className} />
}
