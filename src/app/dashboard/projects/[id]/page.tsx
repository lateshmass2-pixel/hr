"use client"

import { useState } from "react"
import { useHems, Task, TaskStatus } from "@/context/HemsContext"
import { useParams, useRouter } from "next/navigation"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import {
    Clock,
    CheckCircle2,
    AlertCircle,
    Link as LinkIcon,
    ShieldCheck,
    ExternalLink,
    XCircle,
    Check,
    MoreHorizontal,
    Crown,
    Layout,
    Plus,
    ArrowLeft,
    Users
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow, format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import Link from "next/link"

const COLUMN_ORDER: TaskStatus[] = ["To Do", "In Progress", "Review", "Done"]

export default function ProjectDetailsPage() {
    const { id } = useParams()
    const router = useRouter()
    const {
        projects,
        teams,
        employees,
        tasks,
        moveTask,
        verifyTask,
        addTask,
        currentUser,
        users,
        getProjectRole
    } = useHems()

    // Get Data
    const project = projects.find(p => p.id === id)
    const team = teams.find(t => t.projectId === id)
    const projectTasks = tasks.filter(t => t.projectId === id)

    // Get role for this project
    const projectRole = project ? getProjectRole(project.id) : 'VIEWER'

    // Modal States
    const [proofModalOpen, setProofModalOpen] = useState(false)
    const [verificationTask, setVerificationTask] = useState<Task | null>(null)
    const [pendingMove, setPendingMove] = useState<{ taskId: string, status: TaskStatus } | null>(null)
    const [proofLink, setProofLink] = useState("")

    // Create Task Modal State
    const [createTaskOpen, setCreateTaskOpen] = useState(false)
    const [newTask, setNewTask] = useState({
        title: "",
        assigneeId: "",
        priority: "Medium" as "High" | "Medium" | "Low"
    })

    if (!project) return (
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <div className="text-center">
                <h2 className="text-xl font-bold text-[#1a1a1a]">Project not found</h2>
                <p className="text-[#6b6b6b] mt-2">The project you're looking for doesn't exist.</p>
                <Button onClick={() => router.push('/dashboard/projects')} className="mt-4">
                    <ArrowLeft size={16} className="mr-2" /> Back to Projects
                </Button>
            </div>
        </div>
    )

    // Get team members for task assignment
    const teamMembers = [
        ...(project.memberIds?.map(mid => users.find(u => u.id === mid) || employees.find(e => e.id === mid)) || []),
        users.find(u => u.id === project.teamLeadId) || employees.find(e => e.id === project.teamLeadId)
    ].filter(Boolean)

    // --- Drag Handlers ---
    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result
        if (!destination) return
        if (destination.droppableId === source.droppableId && destination.index === source.index) return

        const newStatus = destination.droppableId as TaskStatus
        const task = tasks.find(t => t.id === draggableId)

        if (!task) return

        // MEMBER moving to Done -> Require Proof
        if (projectRole === "MEMBER" && newStatus === "Done" && task.status !== "Done") {
            setPendingMove({ taskId: draggableId, status: newStatus })
            setProofLink("")
            setProofModalOpen(true)
            return
        }

        // Normal Move (Leaders can move without proof)
        moveTask(draggableId, newStatus)
    }

    const confirmProof = () => {
        if (pendingMove && proofLink) {
            moveTask(pendingMove.taskId, pendingMove.status, proofLink)
            setProofModalOpen(false)
            setPendingMove(null)
        }
    }

    const handleCreateTask = () => {
        if (!newTask.title || !newTask.assigneeId) return
        addTask({
            projectId: project.id,
            title: newTask.title,
            assigneeId: newTask.assigneeId,
            priority: newTask.priority,
            status: "To Do",
            verificationStatus: "None"
        })
        setNewTask({ title: "", assigneeId: "", priority: "Medium" })
        setCreateTaskOpen(false)
    }

    // --- Components ---
    const KanbanCard = ({ task, index }: { task: Task, index: number }) => {
        const assignee = users.find(u => u.id === task.assigneeId) || employees.find(e => e.id === task.assigneeId)
        const isVerified = task.verificationStatus === "Verified"
        const isPending = task.verificationStatus === "Pending"
        const isRejected = task.verificationStatus === "Rejected"

        // Can drag if LEADER or MEMBER, not VIEWER
        const canDrag = projectRole !== 'VIEWER'

        return (
            <Draggable draggableId={task.id} index={index} isDragDisabled={!canDrag}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        onClick={() => projectRole === "LEADER" && isPending && setVerificationTask(task)}
                        className={cn(
                            "bg-white p-4 rounded-xl border-2 shadow-sm mb-3 group transition-all relative overflow-hidden",
                            snapshot.isDragging && "shadow-lg rotate-2 scale-105 z-50",
                            isPending ? "border-amber-400 ring-2 ring-amber-400/20" :
                                isVerified ? "border-emerald-200" : "border-[#e8e4e0]",
                            projectRole === "LEADER" && isPending ? "cursor-pointer hover:bg-amber-50/50" :
                                canDrag ? "cursor-grab" : "cursor-default"
                        )}
                        style={provided.draggableProps.style}
                    >
                        {/* Priority Stripe */}
                        <div className={cn(
                            "absolute left-0 top-0 bottom-0 w-1",
                            task.priority === "High" ? "bg-red-500" :
                                task.priority === "Medium" ? "bg-blue-500" : "bg-gray-300"
                        )} />

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-2 pl-2">
                            {task.priority === "High" && <Badge variant="outline" className="text-[10px] py-0 h-5 border-red-200 text-red-600 bg-red-50">High</Badge>}
                            {isPending && <Badge className="text-[10px] py-0 h-5 bg-amber-100 text-amber-800 hover:bg-amber-100 border-none">Review</Badge>}
                            {isVerified && <Badge className="text-[10px] py-0 h-5 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none flex gap-1"><CheckCircle2 size={8} /> Verified</Badge>}
                            {isRejected && <Badge className="text-[10px] py-0 h-5 bg-red-100 text-red-800 hover:bg-red-100 border-none">Rejected</Badge>}
                        </div>

                        <div className="flex justify-between items-start gap-2 pl-2">
                            <p className="font-semibold text-[#1a1a1a] text-sm leading-snug">{task.title}</p>
                            <MoreHorizontal size={14} className="text-gray-400 shrink-0" />
                        </div>

                        <div className="mt-4 flex items-center justify-between pl-2">
                            {assignee ? (
                                <div className="flex items-center gap-2" title={(assignee as any).name || (assignee as any).full_name}>
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-white shadow-sm flex items-center justify-center text-[9px] font-bold text-gray-600">
                                        {((assignee as any).name || (assignee as any).full_name).substring(0, 2)}
                                    </div>
                                    <span className="text-xs text-[#6b6b6b] truncate max-w-[80px]">
                                        {((assignee as any).name || (assignee as any).full_name).split(' ')[0]}
                                    </span>
                                </div>
                            ) : <div className="h-6" />}

                            {task.proofUrl && (
                                <div className="text-emerald-600 bg-emerald-50 w-6 h-6 rounded-full flex items-center justify-center" title="Proof attached">
                                    <LinkIcon size={12} />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Draggable>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] -m-6 sm:-m-8 bg-[#faf8f5]">
            {/* Command Header */}
            <div className="bg-white border-b border-[#e8e4e0] px-8 py-5 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/projects" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft size={18} className="text-gray-600" />
                    </Link>
                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-200">
                        <Layout size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-[#1a1a1a] flex items-center gap-2">
                            {project.title}
                            <Badge variant="outline" className={cn(
                                "font-normal text-xs ml-2",
                                project.status === 'ACTIVE' && "border-emerald-200 text-emerald-700",
                                project.status === 'COMPLETED' && "border-blue-200 text-blue-700"
                            )}>{project.status}</Badge>
                        </h1>
                        <p className="text-xs text-[#6b6b6b] mt-0.5 flex items-center gap-2">
                            <span className="flex items-center gap-1"><Clock size={10} /> {project.deadline ? format(new Date(project.deadline), "MMM d, yyyy") : "No deadline"}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span>{projectTasks.length} Tasks</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Role Indicator */}
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold",
                        projectRole === 'LEADER' && "bg-amber-50 text-amber-700 border border-amber-200",
                        projectRole === 'MEMBER' && "bg-blue-50 text-blue-700 border border-blue-200",
                        projectRole === 'VIEWER' && "bg-gray-50 text-gray-600 border border-gray-200"
                    )}>
                        {projectRole === 'LEADER' && <Crown size={12} />}
                        {projectRole === 'MEMBER' && <Users size={12} />}
                        {projectRole}
                    </div>

                    <div className="h-8 w-px bg-gray-200 mx-2" />

                    {/* Team Command Bar */}
                    <div className="flex items-center gap-4">
                        {/* Team Lead */}
                        {(() => {
                            const leadId = project.teamLeadId
                            const lead = users.find(u => u.id === leadId) || employees.find(e => e.id === leadId)
                            if (!lead) return null
                            return (
                                <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100" title="Team Lead">
                                    <div className="relative">
                                        {(lead as any).avatar || (lead as any).avatar_url ? (
                                            <img src={(lead as any).avatar || (lead as any).avatar_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-[10px] font-bold text-amber-800">
                                                {((lead as any).name || (lead as any).full_name).substring(0, 2)}
                                            </div>
                                        )}
                                        <Crown size={10} className="absolute -top-1 -right-1 text-amber-600 fill-amber-600" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider leading-none">Lead</span>
                                        <span className="text-xs font-semibold text-gray-900 leading-none mt-0.5">{(lead as any).name || (lead as any).full_name}</span>
                                    </div>
                                </div>
                            )
                        })()}

                        {/* Squad Stack */}
                        <div className="flex items-center -space-x-2">
                            {project.memberIds?.map(mid => {
                                const m = users.find(u => u.id === mid) || employees.find(e => e.id === mid)
                                if (!m) return null
                                return (
                                    <div key={mid} className="relative group hover:z-10 transition-all hover:scale-110">
                                        {(m as any).avatar || (m as any).avatar_url ? (
                                            <img src={(m as any).avatar || (m as any).avatar_url} className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm bg-gray-100" alt={(m as any).name || (m as any).full_name} title={(m as any).name || (m as any).full_name} />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 shadow-sm" title={(m as any).name || (m as any).full_name}>
                                                {((m as any).name || (m as any).full_name).substring(0, 2)}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Create Task Button - LEADER ONLY */}
                    {projectRole === 'LEADER' && (
                        <Button
                            onClick={() => setCreateTaskOpen(true)}
                            className="bg-[#1a1a1a] text-white hover:bg-black gap-2 rounded-xl shadow-lg shadow-black/10"
                        >
                            <Plus size={16} /> Create Task
                        </Button>
                    )}
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto p-8">
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-6 h-full min-w-max">
                        {COLUMN_ORDER.map(colId => {
                            const colTasks = projectTasks.filter(t => t.status === colId)
                            const pendingCount = colId === "Done" ? colTasks.filter(t => t.verificationStatus === "Pending").length : 0
                            return (
                                <div key={colId} className="w-80 flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-4 px-1">
                                        <h3 className="font-semibold text-gray-700">{colId}</h3>
                                        <div className="flex items-center gap-2">
                                            {pendingCount > 0 && (
                                                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                                    {pendingCount} pending
                                                </span>
                                            )}
                                            <span className="bg-gray-200/50 text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
                                                {colTasks.length}
                                            </span>
                                        </div>
                                    </div>

                                    <Droppable droppableId={colId}>
                                        {(provided, snapshot) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className={cn(
                                                    "flex-1 bg-[#f4f2ef]/50 rounded-2xl border border-dashed border-[#e8e4e0] p-3 transition-colors",
                                                    snapshot.isDraggingOver && "bg-indigo-50/50 border-indigo-200"
                                                )}
                                            >
                                                {colTasks.map((task, index) => (
                                                    <KanbanCard key={task.id} task={task} index={index} />
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            )
                        })}
                    </div>
                </DragDropContext>
            </div>

            {/* Member Proof Submission Modal */}
            <Dialog open={proofModalOpen} onOpenChange={(open) => !open && setProofModalOpen(false)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="text-emerald-500" />
                            Submit Proof of Work
                        </DialogTitle>
                        <DialogDescription>
                            Great job! Please provide a link to verify your work before marking this task as complete.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Artifact Link (GitHub/Figma/Doc)</Label>
                            <div className="relative">
                                <ExternalLink className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    className="pl-9"
                                    placeholder="https://github.com/..."
                                    value={proofLink}
                                    onChange={(e) => setProofLink(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setProofModalOpen(false)}>Cancel</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmProof} disabled={!proofLink}>
                            Submit for Review
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Leader Verification Modal */}
            <Dialog open={!!verificationTask} onOpenChange={(open) => !open && setVerificationTask(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Verify Task Completion</DialogTitle>
                        <DialogDescription>Review the proof submitted by the team member.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <Label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Task</Label>
                            <p className="font-semibold text-[#1a1a1a]">{verificationTask?.title}</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <Label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Submitted Proof</Label>
                            <a href={verificationTask?.proofUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-sm font-medium flex items-center gap-2 hover:underline truncate">
                                <ExternalLink size={14} />
                                {verificationTask?.proofUrl}
                            </a>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="destructive" onClick={() => {
                            if (verificationTask) verifyTask(verificationTask.id, false)
                            setVerificationTask(null)
                        }}>
                            <XCircle size={16} className="mr-2" /> Reject
                        </Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                            if (verificationTask) verifyTask(verificationTask.id, true)
                            setVerificationTask(null)
                        }}>
                            <Check size={16} className="mr-2" /> Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Task Modal - LEADER ONLY */}
            <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="text-[#e07850]" />
                            Create New Task
                        </DialogTitle>
                        <DialogDescription>
                            Add a new task to the project board.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Task Title</Label>
                            <Input
                                placeholder="e.g. Implement login page"
                                value={newTask.title}
                                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Assign To</Label>
                            <Select value={newTask.assigneeId} onValueChange={(v) => setNewTask({ ...newTask, assigneeId: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select team member" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teamMembers.map(member => (
                                        <SelectItem key={(member as any).id} value={(member as any).id}>
                                            {(member as any).name || (member as any).full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select value={newTask.priority} onValueChange={(v: any) => setNewTask({ ...newTask, priority: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="High">🔴 High</SelectItem>
                                    <SelectItem value="Medium">🔵 Medium</SelectItem>
                                    <SelectItem value="Low">⚪ Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCreateTaskOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-[#e07850] hover:bg-[#d45a3a] text-white"
                            onClick={handleCreateTask}
                            disabled={!newTask.title || !newTask.assigneeId}
                        >
                            <Plus size={16} className="mr-2" /> Create Task
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
