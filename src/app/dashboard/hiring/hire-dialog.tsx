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
import { Textarea } from "@/components/ui/textarea"
import { Gift, Loader2, Sparkles, Send, CheckCircle2 } from "lucide-react"
import { draftOffer, sendOffer } from "./actions"

type Application = {
    id: string
    candidate_name: string
    candidate_email: string
    score?: number
    test_score?: number
}

export function HireDialog({ application }: { application: Application }) {
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState<'form' | 'review' | 'success'>('form')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isSending, setIsSending] = useState(false)

    const [role, setRole] = useState('')
    const [salary, setSalary] = useState('')
    const [startDate, setStartDate] = useState('')
    const [offerContent, setOfferContent] = useState('')

    const handleGenerateDraft = async () => {
        if (!role || !salary || !startDate) {
            alert('Please fill in all fields')
            return
        }

        setIsGenerating(true)
        try {
            const result = await draftOffer(application.id, role, salary, startDate)
            if (result.success && result.content) {
                setOfferContent(result.content)
                setStep('review')
            } else {
                alert('Failed to generate draft: ' + result.message)
            }
        } catch (error) {
            console.error(error)
            alert('An error occurred while generating the draft')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleSendOffer = async () => {
        if (!offerContent.trim()) {
            alert('Offer content cannot be empty')
            return
        }

        setIsSending(true)
        try {
            const result = await sendOffer(application.id, offerContent)
            if (result.success) {
                setStep('success')
            } else {
                alert('Failed to send offer: ' + result.message)
            }
        } catch (error) {
            console.error(error)
            alert('An error occurred while sending the offer')
        } finally {
            setIsSending(false)
        }
    }

    const handleClose = () => {
        setIsOpen(false)
        // Reset state after animation
        setTimeout(() => {
            setStep('form')
            setRole('')
            setSalary('')
            setStartDate('')
            setOfferContent('')
        }, 200)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Gift className="h-3 w-3 mr-1" /> Hire
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-purple-600" />
                        {step === 'success' ? 'Offer Sent!' : `Make an Offer to ${application.candidate_name}`}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'form' && 'Fill in the offer details below. AI will generate a professional offer letter.'}
                        {step === 'review' && 'Review and edit the offer letter before sending.'}
                        {step === 'success' && 'The offer has been sent to the candidate.'}
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Form */}
                {step === 'form' && (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="role">Job Title / Role</Label>
                            <Input
                                id="role"
                                placeholder="e.g., Senior Software Engineer"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="salary">Annual Salary</Label>
                            <Input
                                id="salary"
                                placeholder="e.g., $120,000 per year"
                                value={salary}
                                onChange={(e) => setSalary(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <Button
                            onClick={handleGenerateDraft}
                            disabled={isGenerating || !role || !salary || !startDate}
                            className="w-full mt-2"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating Draft...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate Offer Letter with AI
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {/* Step 2: Review & Edit */}
                {step === 'review' && (
                    <div className="grid gap-4 py-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>To: <strong>{application.candidate_email}</strong></span>
                            <span>Role: <strong>{role}</strong></span>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="content">Offer Letter Content (Editable)</Label>
                            <Textarea
                                id="content"
                                value={offerContent}
                                onChange={(e) => setOfferContent(e.target.value)}
                                className="min-h-[250px] font-mono text-sm"
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setStep('form')}
                                className="flex-1"
                            >
                                ← Back to Details
                            </Button>
                            <Button
                                onClick={handleSendOffer}
                                disabled={isSending}
                                className="flex-1 bg-purple-600 hover:bg-purple-700"
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Confirm & Send Offer
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Success */}
                {step === 'success' && (
                    <div className="py-8 flex flex-col items-center text-center space-y-4">
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-green-800">Offer Sent Successfully!</h3>
                        <p className="text-muted-foreground max-w-sm">
                            The offer letter has been emailed to <strong>{application.candidate_email}</strong>.
                            The candidate has been moved to the "Hired" status.
                        </p>
                        <Button onClick={handleClose} className="mt-4">
                            Done
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
