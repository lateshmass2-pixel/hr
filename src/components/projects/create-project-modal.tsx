"use client"

import { useState } from "react"
import { useHems } from "@/context/HemsContext"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import { Plus, Crown, Calendar, Users } from "lucide-react"

export default function CreateProjectModal() {
    const { addProject, users } = useHems()
    const [open, setOpen] = useState(false)
    const [title, setTitle] = useState("")
    const [deadline, setDeadline] = useState("")
    const [teamLeadId, setTeamLeadId] = useState("")
    const [selectedMembers, setSelectedMembers] = useState<string[]>([])

    // Filter Users by Role (Standard users can lead projects)
    const leads = users.filter(u => u.globalRole === "STANDARD_USER" || u.globalRole === "HR_ADMIN")
    const employees = users.filter(u => u.globalRole === "STANDARD_USER")

    const handleCreate = () => {
        if (!title || !teamLeadId) return

        addProject({
            title,
            deadline,
            teamLeadId,
            memberIds: selectedMembers,
            status: 'ACTIVE'
        })
        setOpen(false)
        // Reset form
        setTitle("")
        setDeadline("")
        setTeamLeadId("")
        setSelectedMembers([])
    }

    const toggleMember = (id: string) => {
        setSelectedMembers(prev =>
            prev.includes(id)
                ? prev.filter(mid => mid !== id)
                : [...prev, id]
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-medium">
                    <Plus size={18} /> New Project
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-[#1a1a1a]">Create New Project</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {/* Section 1: Project Details */}
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs uppercase text-gray-500 font-bold tracking-wider">Project Name</Label>
                            <Input
                                placeholder="e.g. Mobile App Redesign"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="h-10 border-gray-200"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs uppercase text-gray-500 font-bold tracking-wider">Deadline</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
                                <Input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                    className="pl-9 h-10 border-gray-200 w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Appoint Leadership */}
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                        <Label className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2">
                            Assign Team Lead <Crown size={14} className="text-amber-500 fill-amber-500" />
                        </Label>
                        <Select onValueChange={setTeamLeadId} value={teamLeadId}>
                            <SelectTrigger className="w-full border-gray-200">
                                <SelectValue placeholder="Select a Leader" />
                            </SelectTrigger>
                            <SelectContent>
                                {leads.map(lead => (
                                    <SelectItem key={lead.id} value={lead.id}>
                                        <div className="flex items-center gap-2">
                                            {lead.avatar && (
                                                <img src={lead.avatar} className="w-5 h-5 rounded-full" alt="" />
                                            )}
                                            {lead.name}
                                            <span className="text-xs text-gray-400 ml-1">({lead.jobTitle || lead.globalRole})</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Section 3: Build the Squad */}
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                        <Label className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2">
                            Build the Squad <Users size={14} className="text-indigo-500" />
                        </Label>
                        <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-40 overflow-y-auto">
                            {employees.map(emp => (
                                <div
                                    key={emp.id}
                                    onClick={() => toggleMember(emp.id)}
                                    className={`
                                        flex items-center gap-2 p-2 rounded-md cursor-pointer border transition-all
                                        ${selectedMembers.includes(emp.id)
                                            ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200'
                                            : 'bg-white border-gray-200 hover:border-gray-300'}
                                    `}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedMembers.includes(emp.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                        {selectedMembers.includes(emp.id) && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                                    </div>
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        {emp.avatar && <img src={emp.avatar} className="w-5 h-5 rounded-full shrink-0" alt="" />}
                                        <span className="text-sm truncate">{emp.name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white">Create Project</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
