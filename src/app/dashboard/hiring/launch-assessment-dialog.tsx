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
    DialogFooter
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { BrainCircuit, Loader2, PlayCircle, CheckCircle } from "lucide-react"
import { startAssessmentSession } from "@/app/actions/rag-assessment"
import Link from 'next/link'

interface LaunchAssessmentDialogProps {
    candidateId: string
    candidateName: string
    jobId?: string
}

export function LaunchAssessmentDialog({ candidateId, candidateName, jobId }: LaunchAssessmentDialogProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [difficulty, setDifficulty] = useState<'Junior' | 'Mid' | 'Senior'>('Mid')
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleLaunch = async () => {
        setLoading(true)
        setError(null)
        try {
            // Start the session (Generates questions via RAG)
            const result = await startAssessmentSession(
                jobId || null,
                candidateId,
                difficulty
            )

            if (result.success && result.sessionId) {
                setSessionId(result.sessionId)
            } else {
                setError(result.error || "Failed to start session")
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const resetState = (open: boolean) => {
        setIsOpen(open)
        if (!open) {
            // Reset after a delay to allow animation to finish
            setTimeout(() => {
                setSessionId(null)
                setError(null)
            }, 300)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={resetState}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300">
                    <BrainCircuit size={14} />
                    Generate Test
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Generate AI Assessment</DialogTitle>
                    <DialogDescription>
                        Create a unique, RAG-grounded assessment for <strong>{candidateName}</strong> based on the job description and internal knowledge base.
                    </DialogDescription>
                </DialogHeader>

                {!sessionId ? (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Difficulty Level</Label>
                            <Select value={difficulty} onValueChange={(val: any) => setDifficulty(val)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Junior">Junior (Fundamentals)</SelectItem>
                                    <SelectItem value="Mid">Mid-Level (Best Practices)</SelectItem>
                                    <SelectItem value="Senior">Senior (Architecture/System Design)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
                            <strong>Note:</strong> The AI will exclusively use documents from the <em>Knowledge Base</em> to generate questions to ensure relevance.
                        </div>

                        {error && (
                            <div className="bg-red-50 p-3 rounded-lg text-xs text-red-700">
                                {error}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-6 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Assessment Ready!</h3>
                        <p className="text-sm text-gray-500 max-w-[260px] mx-auto mt-1 mb-6">
                            The questions have been generated and the session is active.
                        </p>

                        <Link href={`/assessment/${sessionId}`} target="_blank" className="w-full">
                            <Button className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200">
                                <PlayCircle className="mr-2 h-4 w-4" /> Start Assessment
                            </Button>
                        </Link>
                    </div>
                )}

                {!sessionId && (
                    <DialogFooter>
                        <Button onClick={handleLaunch} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate & Launch"}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
