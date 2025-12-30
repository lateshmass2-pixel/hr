'use client'

import { useState, KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Loader2, Briefcase } from "lucide-react"
import { createJob } from "./actions"

export function CreateJobDialog() {
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [skills, setSkills] = useState<string[]>([])
    const [skillInput, setSkillInput] = useState('')

    const handleAddSkill = () => {
        const skill = skillInput.trim()
        if (skill && !skills.includes(skill)) {
            setSkills([...skills, skill])
            setSkillInput('')
        }
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleAddSkill()
        }
    }

    const handleRemoveSkill = (skillToRemove: string) => {
        setSkills(skills.filter(s => s !== skillToRemove))
    }

    const handleSubmit = async () => {
        if (!title.trim()) {
            alert('Please enter a job title')
            return
        }

        setIsSubmitting(true)
        try {
            const result = await createJob(title, description, skills)
            if (result.success) {
                setIsOpen(false)
                setTitle('')
                setDescription('')
                setSkills([])
            } else {
                alert('Failed to create job: ' + result.message)
            }
        } catch (error) {
            console.error(error)
            alert('An error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> New Job Posting
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Create Job Posting
                    </DialogTitle>
                    <DialogDescription>
                        Define the role and required skills. Candidates will be evaluated against these skills.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Job Title *</Label>
                        <Input
                            id="title"
                            placeholder="e.g., Senior Full-Stack Developer"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Brief description of the role and responsibilities..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="min-h-[80px]"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="skills">Required Skills</Label>
                        <div className="flex gap-2">
                            <Input
                                id="skills"
                                placeholder="Type a skill and press Enter (e.g., React)"
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <Button type="button" variant="secondary" onClick={handleAddSkill}>
                                Add
                            </Button>
                        </div>

                        {skills.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {skills.map((skill) => (
                                    <Badge
                                        key={skill}
                                        variant="secondary"
                                        className="px-3 py-1 text-sm flex items-center gap-1"
                                    >
                                        {skill}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSkill(skill)}
                                            className="ml-1 hover:text-red-500 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {skills.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                Add skills like: Python, React, AWS, SQL, etc.
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim()}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Job'
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
