'use client'

import { updateLeaveStatus } from '@/app/actions/leave'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function ApprovalActions({ requestId }: { requestId: string }) {
    const [loading, setLoading] = useState(false)

    async function handleAction(status: 'approved' | 'rejected') {
        if (!confirm(`Are you sure you want to ${status === 'approved' ? 'approve' : 'reject'} this leave request?`)) {
            return
        }

        setLoading(true)
        const result = await updateLeaveStatus(requestId, status)

        if (result.success) {
            toast.success(`Leave request ${status}`)
        } else {
            toast.error(result.message)
        }

        setLoading(false)
    }

    return (
        <div className="flex flex-col gap-2 shrink-0">
            <Button
                onClick={() => handleAction('approved')}
                disabled={loading}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
                <Check className="h-4 w-4 mr-1" />
                Approve
            </Button>
            <Button
                onClick={() => handleAction('rejected')}
                disabled={loading}
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
            >
                <X className="h-4 w-4 mr-1" />
                Reject
            </Button>
        </div>
    )
}
