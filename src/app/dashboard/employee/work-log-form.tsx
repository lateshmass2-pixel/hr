'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Send, CheckCircle2 } from "lucide-react"
import { submitWorkLog } from "./actions"

export function WorkLogForm() {
    const [description, setDescription] = useState('')
    const [hours, setHours] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!description.trim() || !hours) {
            alert('Please fill in all fields')
            return
        }

        setIsSubmitting(true)
        const formData = new FormData()
        formData.append('description', description)
        formData.append('hours', hours)

        const result = await submitWorkLog(formData)

        if (result.success) {
            setSuccess(true)
            setDescription('')
            setHours('')
            setTimeout(() => setSuccess(false), 2000)
        } else {
            alert(result.message)
        }

        setIsSubmitting(false)
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {success ? (
                        <>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">Log Submitted!</span>
                        </>
                    ) : (
                        "Log Today's Work"
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="space-y-1">
                        <Label htmlFor="description" className="text-xs">What did you work on?</Label>
                        <Textarea
                            id="description"
                            placeholder="Describe your work..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="min-h-[80px] text-sm"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="hours" className="text-xs">Hours Worked</Label>
                        <Input
                            id="hours"
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="24"
                            placeholder="e.g., 4.5"
                            value={hours}
                            onChange={(e) => setHours(e.target.value)}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting || !description.trim() || !hours}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Send className="mr-2 h-4 w-4" />
                                Submit Log
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
