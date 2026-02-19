'use client'

import { updateLeaveStatus } from '@/app/actions/leave'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function ApprovalActions({ requestId, compact = false }: { requestId: string; compact?: boolean }) {
    const [loading, setLoading] = useState(false)

    async function handleAction(status: 'approved' | 'rejected') {
        if (!confirm(`Are you sure you want to ${status === 'approved' ? 'approve' : 'reject'} this leave request?`)) {
            return
        }

        setLoading(true)
        const result = await updateLeaveStatus(requestId, status)
        setLoading(false)

        if (result.success) {
            toast.success(`Leave request ${status}`)
        } else {
            toast.error(result.message)
        }
    }

    return (
        <div className={compact ? "flex items-center gap-1" : "flex flex-col gap-2 shrink-0"}>
            <Button
                onClick={() => handleAction('approved')}
                disabled={loading}
                size={compact ? "icon" : "sm"}
                className={compact ? "h-8 w-8 bg-green-100 text-green-700 hover:bg-green-200" : "bg-[#14532d] hover:bg-[#166534] text-white"}
                title="Approve"
            >
                <Check className={compact ? "h-4 w-4" : "h-4 w-4 mr-1"} />
                {!compact && "Approve"}
            </Button>
            <Button
                onClick={() => handleAction('rejected')}
                disabled={loading}
                size={compact ? "icon" : "sm"}
                variant="outline"
                className={compact ? "h-8 w-8 border-red-200 text-red-600 hover:bg-red-50" : "border-red-200 text-red-600 hover:bg-red-50"}
                title="Reject"
            >
                <X className={compact ? "h-4 w-4" : "h-4 w-4 mr-1"} />
                {!compact && "Reject"}
            </Button>
        </div>
    )
}
