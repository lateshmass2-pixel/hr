'use client'

import { useState } from "react"
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
import { UserPlus, Upload, Loader2, CheckCircle2, Mail, User, Briefcase } from "lucide-react"
import { createEmployeeAccount } from "@/app/actions/onboarding"

export function AddEmployeeDialog() {
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

    const [file, setFile] = useState<File | null>(null)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [position, setPosition] = useState('')

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email && !file) {
            setResult({ success: false, message: 'Please provide an email or upload a resume.' })
            return
        }

        setIsSubmitting(true)
        setResult(null)

        const formData = new FormData()
        if (file) formData.append('resume', file)
        if (name) formData.append('name', name)
        if (email) formData.append('email', email)
        if (position) formData.append('position', position)

        const response = await createEmployeeAccount(formData)
        setResult(response)
        setIsSubmitting(false)

        if (response.success) {
            // Reset form on success
            setTimeout(() => {
                setFile(null)
                setName('')
                setEmail('')
                setPosition('')
            }, 2000)
        }
    }

    const resetDialog = () => {
        setResult(null)
        setFile(null)
        setName('')
        setEmail('')
        setPosition('')
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open)
            if (!open) resetDialog()
        }}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <UserPlus className="mr-2 h-4 w-4" /> Add Employee
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Onboard New Employee
                    </DialogTitle>
                    <DialogDescription>
                        Upload a resume or enter details manually. A login account will be created and credentials sent via email.
                    </DialogDescription>
                </DialogHeader>

                {result?.success ? (
                    <div className="py-8 flex flex-col items-center gap-4 text-center">
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-green-800">Employee Added!</h3>
                            <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                        </div>
                        <Button onClick={() => setIsOpen(false)}>Done</Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* File Upload */}
                        <div className="space-y-2">
                            <Label htmlFor="resume">Resume (Optional - for auto-extraction)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="resume"
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="flex-1"
                                />
                                {file && (
                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                        <Upload className="h-3 w-3" /> {file.name}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                PDF resume will be parsed to extract name and email automatically.
                            </p>
                        </div>

                        {/* Manual Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="flex items-center gap-1">
                                    <User className="h-3 w-3" /> Full Name
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="position" className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" /> Position
                                </Label>
                                <Input
                                    id="position"
                                    placeholder="Software Engineer"
                                    value={position}
                                    onChange={(e) => setPosition(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> Email *
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="employee@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required={!file}
                            />
                            <p className="text-xs text-muted-foreground">
                                Credentials will be sent to this email.
                            </p>
                        </div>

                        {/* Error Message */}
                        {result && !result.success && (
                            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
                                {result.message}
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Create Employee Account
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
