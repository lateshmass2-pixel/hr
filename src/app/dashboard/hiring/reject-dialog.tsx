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
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { XCircle, Loader2, AlertTriangle, Mail } from "lucide-react"
import { rejectCandidate } from "./actions"

type Application = {
    id: string
    candidate_name: string
    candidate_email: string
}

const REJECTION_REASONS = [
    { value: 'skill_gap', label: 'Skill Gap' },
    { value: 'cultural_fit', label: 'Cultural Fit' },
    { value: 'budget', label: 'Budget Constraints' },
    { value: 'experience', label: 'Insufficient Experience' },
    { value: 'other', label: 'Other' },
]

export function RejectDialog({ application, trigger }: { application: Application, trigger?: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [reason, setReason] = useState('')
    const [sendEmail, setSendEmail] = useState(true)

    const handleSubmit = async () => {
        if (!reason) {
            alert('Please select a reason')
            return
        }

        setIsSubmitting(true)
        try {
            const result = await rejectCandidate(application.id, reason, sendEmail)

            if (result.success) {
                handleClose()
            } else {
                alert('Failed to reject candidate: ' + result.message)
            }
        } catch (error) {
            console.error(error)
            alert('An error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        setIsOpen(false)
        setTimeout(() => {
            setReason('')
            setSendEmail(true)
        }, 200)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400">
                        <XCircle className="h-4 w-4 mr-2" /> Reject
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Reject {application.candidate_name}?
                    </DialogTitle>
                    <DialogDescription>
                        This will move the candidate to the Rejected column.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    {/* Reason Dropdown */}
                    <div className="space-y-2">
                        <Label htmlFor="reason">Rejection Reason *</Label>
                        <Select value={reason} onValueChange={setReason}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent>
                                {REJECTION_REASONS.map((r) => (
                                    <SelectItem key={r.value} value={r.value}>
                                        {r.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Email Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
                                Send courteous rejection email?
                            </Label>
                        </div>
                        <Switch
                            id="sendEmail"
                            checked={sendEmail}
                            onCheckedChange={setSendEmail}
                        />
                    </div>

                    {sendEmail && (
                        <p className="text-xs text-gray-500 -mt-2 pl-1">
                            A professional rejection email will be sent to {application.candidate_email}
                        </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!reason || isSubmitting}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Mark as Rejected
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
