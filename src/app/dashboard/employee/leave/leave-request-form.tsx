'use client'

import { submitLeaveRequest } from '@/app/actions/leave'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'
import { Send } from 'lucide-react'

export function LeaveRequestForm() {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setMessage(null)

        const result = await submitLeaveRequest(formData)

        if (result.success) {
            setMessage({ type: 'success', text: result.message })
            // Reset form
            const form = document.getElementById('leave-form') as HTMLFormElement
            form?.reset()
        } else {
            setMessage({ type: 'error', text: result.message })
        }

        setLoading(false)
    }

    return (
        <form id="leave-form" action={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="start_date" className="text-gray-700">Start Date</Label>
                    <Input
                        id="start_date"
                        name="start_date"
                        type="date"
                        required
                        className="bg-white border-gray-300 text-gray-900"
                        min={new Date().toISOString().split('T')[0]}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="end_date" className="text-gray-700">End Date</Label>
                    <Input
                        id="end_date"
                        name="end_date"
                        type="date"
                        required
                        className="bg-white border-gray-300 text-gray-900"
                        min={new Date().toISOString().split('T')[0]}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="reason" className="text-gray-700">Reason</Label>
                <Textarea
                    id="reason"
                    name="reason"
                    placeholder="e.g., Sick leave, Vacation, Personal reasons..."
                    required
                    rows={4}
                    className="bg-white border-gray-300 text-gray-900 resize-none"
                />
            </div>

            {message && (
                <div className={`p-4 rounded-lg ${message.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.text}
                </div>
            )}

            <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
                <Send className="mr-2 h-4 w-4" />
                {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
        </form>
    )
}
