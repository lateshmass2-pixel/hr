'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { motion } from 'framer-motion'
import {
    MoreHorizontal, Mail, ExternalLink, Calendar,
    CheckCircle2, AlertCircle, Clock, Trash2
} from 'lucide-react'
import { SoftCard } from '@/components/ui/gradient-stat-card'
import { updateApplicationStatus, deleteApplication } from './actions'
import { cn } from '@/lib/utils'
import { extractSkills } from '@/utils/skill-extractor'
import { LaunchAssessmentDialog } from './launch-assessment-dialog'
import { ScheduleInterviewDialog } from './schedule-interview-dialog'
import { DecisionFooter } from './decision-footer'
import Link from 'next/link'
import { toast } from 'sonner'

// Types (Mirrors existing Application type)
interface Application {
    id: string
    candidate_name: string
    candidate_email: string
    offer_role?: string
    position?: string
    status: string
    test_score?: number
    score?: number
    resume_url?: string
    resume_text?: string
    ai_reasoning?: string
    raw_text?: string
    skills?: string[]
    created_at?: string
}

const COLUMNS = [
    { id: 'TEST_PENDING', label: 'Screening', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'INTERVIEW', label: 'Interview', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { id: 'offer', label: 'Offer', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 'REJECTED', label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200' }
]

export function KanbanBoard({ applications }: { applications: Application[] }) {
    // Local state for optimistic updates
    const [apps, setApps] = useState(applications)

    // Group applications by status
    const getColumnApps = (status: string) => {
        return apps.filter(app => {
            if (status === 'TEST_PENDING') return app.status === 'TEST_PENDING' || app.status === 'NEW'
            return app.status === status
        })
    }

    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result

        // Dropped outside or same position
        if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
            return
        }

        const newStatus = destination.droppableId

        // Optimistic Update
        const updatedApps = apps.map(app =>
            app.id === draggableId ? { ...app, status: newStatus } : app
        )
        setApps(updatedApps)

        // Server Action
        try {
            const res = await updateApplicationStatus(draggableId, newStatus)
            if (!res.success) {
                toast.error("Failed to update status")
                setApps(applications) // Revert
            } else {
                toast.success(`Moved to ${COLUMNS.find(c => c.id === newStatus)?.label}`)
            }
        } catch (err) {
            console.error(err)
            toast.error("Something went wrong")
            setApps(applications) // Revert
        }
    }

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full gap-6 overflow-x-auto pb-4 items-start">
                {COLUMNS.map(column => (
                    <div key={column.id} className="flex-shrink-0 w-80 flex flex-col gap-3">
                        {/* Column Header */}
                        <div className={cn("flex items-center justify-between p-3 rounded-xl border border-dashed", column.color)}>
                            <span className="font-semibold text-sm">{column.label}</span>
                            <span className="bg-white/50 px-2 py-0.5 rounded-md text-xs font-bold">
                                {getColumnApps(column.id).length}
                            </span>
                        </div>

                        {/* Droppable Area */}
                        <Droppable droppableId={column.id}>
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={cn(
                                        "flex-1 min-h-[500px] rounded-xl transition-colors space-y-3",
                                        snapshot.isDraggingOver ? "bg-gray-50/80 ring-2 ring-gray-200" : ""
                                    )}
                                >
                                    {getColumnApps(column.id).map((app, index) => (
                                        <Draggable key={app.id} draggableId={app.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    style={{ ...provided.draggableProps.style }}
                                                    className={cn("outline-none", snapshot.isDragging && "scale-105 shadow-xl z-50")}
                                                >
                                                    <KanbanCard
                                                        application={app}
                                                        onDelete={(id) => setApps(apps.filter(a => a.id !== id))}
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                ))}
            </div>
        </DragDropContext>
    )
}

function KanbanCard({ application, onDelete }: { application: Application, onDelete: (id: string) => void }) {
    const [isDeleting, setIsDeleting] = useState(false)
    const score = application.test_score ?? application.score
    const isHighScore = (score ?? 0) >= 70

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${application.candidate_name}'s application?`)) {
            return
        }
        setIsDeleting(true)
        try {
            const res = await deleteApplication(application.id)
            if (res.success) {
                toast.success('Application deleted')
                onDelete(application.id)
            } else {
                toast.error(res.message || 'Failed to delete')
            }
        } catch (err) {
            toast.error('Error deleting application')
        } finally {
            setIsDeleting(false)
        }
    }

    // Use stored skills if available, otherwise fallback to empty array (or legacy extraction if absolutely necessary)
    const skills = (application.skills && application.skills.length > 0)
        ? application.skills.slice(0, 3)
        : extractSkills([
            application.resume_text,
            application.ai_reasoning,
            application.offer_role
        ].join(' '), 3)

    return (
        <SoftCard className="p-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing border border-gray-100 group">
            {/* Header: Avatar + Meta */}
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                    {application.candidate_name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col items-end">
                    {score !== undefined && (
                        <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full mb-1",
                            isHighScore ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        )}>
                            {score}% Match
                        </span>
                    )}
                    <span className="text-[10px] text-gray-400">
                        {new Date(application.created_at || '').toLocaleDateString()}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="mb-3">
                <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-0.5 truncate pr-2">
                    {application.candidate_name}
                </h4>
                <p className="text-xs text-gray-500 truncate">
                    {application.offer_role || 'Software Engineer'}
                </p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
                {skills.slice(0, 2).map((skill, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {skill}
                    </span>
                ))}
            </div>

            {/* Actions (Contextual based on status) */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Screening: Show Launch Test */}
                {application.status === 'TEST_PENDING' && (
                    <LaunchAssessmentDialog
                        candidateId={application.id}
                        candidateName={application.candidate_name}
                    />
                )}

                {/* Interview: Show Schedule */}
                {application.status === 'INTERVIEW' && (
                    <ScheduleInterviewDialog application={{
                        id: application.id,
                        candidate_name: application.candidate_name,
                        candidate_email: application.candidate_email,
                        offer_role: application.offer_role
                    }} />
                )}

                {/* Offer: Show Hire/Reject buttons */}
                {application.status === 'offer' && (
                    <DecisionFooter application={{
                        id: application.id,
                        candidate_name: application.candidate_name,
                        candidate_email: application.candidate_email,
                        offer_role: application.offer_role
                    }} />
                )}

                {/* General: Link to Resume/Email */}
                <Link href={`mailto:${application.candidate_email}`} className="ml-auto">
                    <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                        <Mail size={14} />
                    </button>
                </Link>
                {application.resume_url && (
                    <Link href={application.resume_url} target="_blank">
                        <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                            <ExternalLink size={14} />
                        </button>
                    </Link>
                )}

                {/* Delete Button */}
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-1.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-600 disabled:opacity-50"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </SoftCard>
    )
}
