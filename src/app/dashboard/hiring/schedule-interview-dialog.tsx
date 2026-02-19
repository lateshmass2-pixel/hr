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
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Calendar, Video, Users, Phone, Loader2, Send, Mail, Link as LinkIcon, CheckCircle2, Sparkles } from "lucide-react"
import { format, parse } from "date-fns"
import { scheduleInterview } from "./actions"
import confetti from 'canvas-confetti'
import { toast } from 'sonner'

type Application = {
    id: string
    candidate_name: string
    candidate_email: string
    offer_role?: string
}

type InterviewType = 'video' | 'in-person' | 'phone'

const TIME_SLOTS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
]

const INTERVIEWERS = [
    { value: 'me', label: 'Me (HR Manager)' },
    { value: 'cto', label: 'CTO' },
    { value: 'lead-dev', label: 'Lead Developer' },
    { value: 'product', label: 'Product Manager' },
]

function generateMeetLink() {
    const chars = 'abcdefghijklmnopqrstuvwxyz'
    const random = (len: number) => Array(len).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('')
    return `meet.google.com/${random(3)}-${random(4)}-${random(3)}`
}

function formatTime12h(time24: string) {
    const [hours, minutes] = time24.split(':').map(Number)
    const suffix = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${suffix}`
}

export function ScheduleInterviewDialog({ application }: { application: Application }) {
    const [isOpen, setIsOpen] = useState(false)
    const [step, setStep] = useState<'form' | 'success'>('form')
    const [isSending, setIsSending] = useState(false)

    // Form state
    const [interviewType, setInterviewType] = useState<InterviewType>('video')
    const [date, setDate] = useState('')
    const [time, setTime] = useState('')
    const [interviewer, setInterviewer] = useState('')
    const [meetLink] = useState(() => generateMeetLink())

    const role = application.offer_role || 'Software Engineer'

    // Format date for display
    const formattedDate = useMemo(() => {
        if (!date) return '[Date]'
        try {
            return format(new Date(date), 'MMMM d, yyyy')
        } catch {
            return date
        }
    }, [date])

    const formattedTime = useMemo(() => {
        if (!time) return '[Time]'
        return formatTime12h(time)
    }, [time])

    // Email preview content
    const emailPreview = useMemo(() => {
        const typeLabel = interviewType === 'video' ? 'video call' :
            interviewType === 'in-person' ? 'in-person' : 'phone'

        const linkSection = interviewType === 'video'
            ? `\n\nJoin the meeting: https://${meetLink}`
            : ''

        return {
            subject: `Interview Invitation - ${role} at HEMS`,
            body: `Hi ${application.candidate_name},

We were impressed by your profile and would like to invite you to a ${typeLabel} interview on ${formattedDate} at ${formattedTime}.${linkSection}

Please confirm your availability by replying to this email.

Best regards,
The HEMS HR Team`
        }
    }, [application.candidate_name, role, interviewType, formattedDate, formattedTime, meetLink])

    const canSubmit = date && time && interviewer

    const handleSubmit = async () => {
        if (!canSubmit) return

        setIsSending(true)
        try {
            const result = await scheduleInterview(
                application.id,
                interviewType,
                date,
                time,
                interviewer,
                interviewType === 'video' ? meetLink : undefined
            )

            if (result.success) {
                setStep('success')
                // Fire confetti!
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                })
            } else {
                toast.error('Failed to schedule interview: ' + result.message)
            }
        } catch (error) {
            console.error(error)
            toast.error('An error occurred while scheduling the interview')
        } finally {
            setIsSending(false)
        }
    }

    const handleClose = () => {
        setIsOpen(false)
        setTimeout(() => {
            setStep('form')
            setInterviewType('video')
            setDate('')
            setTime('')
            setInterviewer('')
        }, 200)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Calendar className="h-3 w-3 mr-1" /> Schedule
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-orange-500" />
                        {step === 'success' ? 'Interview Scheduled!' : `Schedule Interview with ${application.candidate_name}`}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'form' && 'Set up the interview details. The candidate will receive an email invitation.'}
                        {step === 'success' && 'The interview has been scheduled and the candidate has been notified.'}
                    </DialogDescription>
                </DialogHeader>

                {/* Form Step */}
                {step === 'form' && (
                    <div className="space-y-6 py-4">
                        {/* Interview Type - Segmented Control */}
                        <div className="space-y-2">
                            <Label>Interview Type</Label>
                            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                                {[
                                    { value: 'video', label: 'Video Call', icon: Video },
                                    { value: 'in-person', label: 'In-Person', icon: Users },
                                    { value: 'phone', label: 'Phone', icon: Phone },
                                ].map((type) => (
                                    <button
                                        key={type.value}
                                        onClick={() => setInterviewType(type.value as InterviewType)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all ${interviewType === type.value
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-white text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <type.icon className="h-4 w-4" />
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date & Time Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date">Date</Label>
                                <input
                                    id="date"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="time">Time</Label>
                                <Select value={time} onValueChange={setTime}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select time" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIME_SLOTS.map((slot) => (
                                            <SelectItem key={slot} value={slot}>
                                                {formatTime12h(slot)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Interviewer */}
                        <div className="space-y-2">
                            <Label htmlFor="interviewer">Interviewer</Label>
                            <Select value={interviewer} onValueChange={setInterviewer}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select interviewer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {INTERVIEWERS.map((person) => (
                                        <SelectItem key={person.value} value={person.value}>
                                            {person.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Meeting Link (Video only) */}
                        {interviewType === 'video' && (
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5">
                                    <LinkIcon className="h-3.5 w-3.5" />
                                    Meeting Link (Auto-generated)
                                </Label>
                                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                                    <span className="truncate">https://{meetLink}</span>
                                </div>
                            </div>
                        )}

                        {/* Email Preview */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-gray-600">
                                <Mail className="h-3.5 w-3.5" />
                                Candidate Email Preview
                            </Label>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                                <div className="text-xs text-gray-500">
                                    <span className="font-semibold">To:</span> {application.candidate_email}
                                </div>
                                <div className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">
                                    {emailPreview.subject}
                                </div>
                                <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                                    {emailPreview.body}
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            onClick={handleSubmit}
                            disabled={!canSubmit || isSending}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-5 text-base font-semibold"
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending invite...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" />
                                    Send Invite & Update Status
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
                        <h3 className="text-xl font-semibold text-green-800">Interview Scheduled!</h3>
                        <p className="text-muted-foreground max-w-sm">
                            An invitation has been sent to <strong>{application.candidate_email}</strong>.
                            The candidate status has been updated to <span className="text-yellow-600 font-medium">"Interview Scheduled"</span>.
                        </p>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800 flex items-start gap-2">
                            <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
                            <span><strong>{formattedDate}</strong> at <strong>{formattedTime}</strong></span>
                        </div>
                        <Button onClick={handleClose} className="mt-4 bg-[#14532d] hover:bg-[#166534]">
                            Done
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
