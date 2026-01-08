'use client'

import { useState, useMemo } from "react"
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
import { UserCheck, Loader2, Mail, CheckCircle2, Sparkles, Calendar, Briefcase } from "lucide-react"
import { format } from "date-fns"
import { confirmHire } from "./actions"
import confetti from 'canvas-confetti'

type Application = {
    id: string
    candidate_name: string
    candidate_email: string
    offer_role?: string
}

export function ConfirmHireDialog({ application, trigger }: { application: Application, trigger?: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState<'form' | 'success'>('form')
    const [isSending, setIsSending] = useState(false)

    const [joiningDate, setJoiningDate] = useState('')
    const [finalRole, setFinalRole] = useState(application.offer_role || 'Software Engineer')

    // Format date for display
    const formattedDate = useMemo(() => {
        if (!joiningDate) return '[Date]'
        try {
            return format(new Date(joiningDate), 'MMMM d, yyyy')
        } catch {
            return joiningDate
        }
    }, [joiningDate])

    // Email preview content
    const emailPreview = useMemo(() => {
        return {
            subject: `Welcome to the Team! Your start date is ${formattedDate}`,
            body: `Dear ${application.candidate_name},

We are thrilled to offer you the position of ${finalRole} at our company!

Your joining date is scheduled for ${formattedDate}. Please arrive at 9:00 AM at our office. Our HR team will be there to welcome you and guide you through the onboarding process.

What to bring on your first day:
• Government-issued ID for verification
• Banking details for payroll setup
• Any pending documentation

We're excited to have you on board and look forward to your contributions to our team!

Best regards,
The HEMS HR Team`
        }
    }, [application.candidate_name, finalRole, formattedDate])

    const canSubmit = joiningDate && finalRole

    const handleSubmit = async () => {
        if (!canSubmit) return

        setIsSending(true)
        try {
            const result = await confirmHire(application.id, joiningDate, finalRole)

            if (result.success) {
                setStep('success')
                // Fire confetti!
                confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.6 },
                    colors: ['#22c55e', '#16a34a', '#15803d', '#fbbf24', '#f59e0b']
                })
            } else {
                alert('Failed to complete hiring: ' + result.message)
            }
        } catch (error) {
            console.error(error)
            alert('An error occurred')
        } finally {
            setIsSending(false)
        }
    }

    const handleClose = () => {
        setIsOpen(false)
        setTimeout(() => {
            setStep('form')
            setJoiningDate('')
            setFinalRole(application.offer_role || 'Software Engineer')
        }, 200)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                        <UserCheck className="h-4 w-4 mr-2" /> Hire Candidate
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-green-600" />
                        {step === 'success' ? 'Welcome Aboard!' : `Onboard ${application.candidate_name}?`}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'form' && 'Complete the hiring process and send the welcome email.'}
                        {step === 'success' && 'The candidate has been hired and notified!'}
                    </DialogDescription>
                </DialogHeader>

                {/* Form Step */}
                {step === 'form' && (
                    <div className="space-y-5 py-4">
                        {/* Joining Date */}
                        <div className="space-y-2">
                            <Label htmlFor="joiningDate" className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                Joining Date *
                            </Label>
                            <input
                                id="joiningDate"
                                type="date"
                                value={joiningDate}
                                onChange={(e) => setJoiningDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                        </div>

                        {/* Final Role */}
                        <div className="space-y-2">
                            <Label htmlFor="finalRole" className="flex items-center gap-1.5">
                                <Briefcase className="h-3.5 w-3.5" />
                                Final Role / Designation *
                            </Label>
                            <Input
                                id="finalRole"
                                value={finalRole}
                                onChange={(e) => setFinalRole(e.target.value)}
                                placeholder="e.g., Senior Software Engineer"
                                className="focus:ring-green-500 focus:border-green-500"
                            />
                        </div>

                        {/* Email Preview */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-gray-600">
                                <Mail className="h-3.5 w-3.5" />
                                Welcome Email Preview
                            </Label>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                                <div className="text-xs text-gray-500">
                                    <span className="font-semibold">To:</span> {application.candidate_email}
                                </div>
                                <div className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">
                                    {emailPreview.subject}
                                </div>
                                <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">
                                    {emailPreview.body}
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            onClick={handleSubmit}
                            disabled={!canSubmit || isSending}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-5 text-base font-semibold"
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending Welcome Kit...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Confirm & Send Mail
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {/* Success Step */}
                {step === 'success' && (
                    <div className="py-8 flex flex-col items-center text-center space-y-4">
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-green-800">Onboarding Email Sent!</h3>
                        <p className="text-muted-foreground max-w-sm">
                            <strong>{application.candidate_name}</strong> has been moved to the Employee Database.
                            Start date: <strong>{formattedDate}</strong>
                        </p>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-start gap-2">
                            <Mail className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>Welcome email sent to <strong>{application.candidate_email}</strong></span>
                        </div>
                        <Button onClick={handleClose} className="mt-4 bg-green-600 hover:bg-green-700">
                            Done
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
