"use client"

import { useState } from "react"
import { useHems } from "@/context/HemsContext"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Plus, X, Calendar, GripVertical, UserCircle } from "lucide-react"

export default function CreateProjectModal() {
    const { addProject, addTask, users, currentUser } = useHems()
    const [open, setOpen] = useState(false)

    // Form State
    const [title, setTitle] = useState("")
    const [deadline, setDeadline] = useState("")
    const [managerId, setManagerId] = useState(currentUser?.id || "")
    const [teamLeadId, setTeamLeadId] = useState("")
    const [selectedMembers, setSelectedMembers] = useState<string[]>([])

    // Tasks State
    const [tasks, setTasks] = useState<string[]>([])
    const [newTask, setNewTask] = useState("")

    const handleAddTask = () => {
        if (!newTask.trim()) return
        setTasks([...tasks, newTask])
        setNewTask("")
    }

    const removeTask = (index: number) => {
        setTasks(tasks.filter((_, i) => i !== index))
    }

    const handleCreate = async () => {
        if (!title || !teamLeadId || !deadline) return

        // Create Project
        const newProject = await addProject({
            title,
            deadline,
            teamLeadId,
            memberIds: selectedMembers,
            status: 'ACTIVE' as const
        })

        if (newProject && newProject.id) {
            // Create Initial Tasks
            for (const taskTitle of tasks) {
                await addTask({
                    projectId: newProject.id,
                    title: taskTitle,
                    status: 'To Do',
                    assigneeId: teamLeadId, // Default to Team Lead
                    priority: 'Medium',
                    verificationStatus: 'None'
                })
            }
        }

        // Reset form
        setTitle("")
        setDeadline("")
        setManagerId("")
        setTeamLeadId("")
        setSelectedMembers([])
        setTasks([])
        setOpen(false)
    }

    const toggleMember = (id: string) => {
        if (selectedMembers.includes(id)) {
            setSelectedMembers(selectedMembers.filter(m => m !== id))
        } else {
            setSelectedMembers([...selectedMembers, id])
        }
    }

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-black hover:bg-gray-900 text-white rounded-xl px-6">
                    <Plus size={18} className="mr-2" /> New Project
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl p-8 rounded-3xl bg-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-black">Create New Project</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Row 1: Title & Deadline */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-black">Project Title</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="rounded-xl border-gray-300 h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-black">Deadline</Label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)} // Keep yyyy-mm-dd for state, display handled by browser
                                    className="rounded-xl border-gray-300 h-11 pr-10"
                                />
                                <Calendar className="absolute right-3 top-3 text-gray-500 w-5 h-5 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Manager & Lead */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-black">Project Manager</Label>
                            <Select value={managerId} onValueChange={setManagerId}>
                                <SelectTrigger className="rounded-xl border-gray-300 h-11">
                                    <SelectValue placeholder="Select Manager" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map(user => (
                                        <SelectItem key={user.id} value={user.id}>
                                            <span className="font-medium">{user.name}</span>
                                            <span className="text-gray-500 ml-2 text-xs">({user.jobTitle || user.globalRole})</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-black">Project Team Lead</Label>
                            <Select value={teamLeadId} onValueChange={setTeamLeadId}>
                                <SelectTrigger className="rounded-xl border-gray-300 h-11">
                                    <SelectValue placeholder="Select Lead" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map(user => (
                                        <SelectItem key={user.id} value={user.id}>
                                            <span className="font-medium">{user.name}</span>
                                            <span className="text-gray-500 ml-2 text-xs">({user.jobTitle || user.globalRole})</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 3: Team Members */}
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-black">Team Members</Label>
                        <Select onValueChange={toggleMember}>
                            <SelectTrigger className="rounded-xl border-gray-300 h-11">
                                <SelectValue placeholder="Add member to squad" />
                            </SelectTrigger>
                            <SelectContent>
                                {users.filter(u => !selectedMembers.includes(u.id)).map(user => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.name} <span className="text-gray-400 text-xs">({user.jobTitle || 'Member'})</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Member Pills */}
                        <div className="flex flex-wrap gap-3 mt-3">
                            {selectedMembers.map(memberId => {
                                const member = users.find(u => u.id === memberId)
                                if (!member) return null
                                return (
                                    <div key={memberId} className="flex items-center gap-2 bg-white border border-gray-300 rounded-full px-3 py-1.5 shadow-sm">
                                        <div className="w-5 h-5 rounded-full bg-gray-100 border flex items-center justify-center text-[10px] font-bold">
                                            {member.avatar ? <img src={member.avatar} className="w-full h-full rounded-full" /> : getInitials(member.name)}
                                        </div>
                                        <span className="text-xs font-medium text-gray-700">{member.name}</span>
                                        <button onClick={() => toggleMember(memberId)} className="text-gray-400 hover:text-red-500">
                                            <X size={14} />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Row 4: Initial Tasks */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold text-black">Initial Tasks</Label>
                            <button onClick={handleAddTask} className="text-xs font-bold text-gray-400 hover:text-black flex items-center gap-1">
                                <Plus size={14} /> Add Task
                            </button>
                        </div>

                        {/* Task List */}
                        <div className="space-y-2">
                            {tasks.map((task, idx) => (
                                <div key={idx} className="flex items-center gap-3 group">
                                    <GripVertical size={16} className="text-gray-300 cursor-move" />
                                    <span className="text-sm text-gray-700 flex-1">{task}</span>
                                    <button onClick={() => removeTask(idx)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            <Input
                                placeholder="Press Enter to add task..."
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask() }}
                                className="border-none shadow-none px-0 text-sm focus-visible:ring-0 placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    <Button onClick={handleCreate} className="w-full h-12 bg-black hover:bg-gray-900 text-white text-lg font-bold rounded-xl mt-4">
                        Create Project
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
