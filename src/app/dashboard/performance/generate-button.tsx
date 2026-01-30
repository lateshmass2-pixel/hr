'use client'

import { generatePerformanceReview } from '@/app/actions/performance'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function GenerateReviewButton({ employeeId, employeeName }: { employeeId: string, employeeName: string }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    async function handleGenerate() {
        if (!confirm(`Generate AI performance review for ${employeeName}?\n\nThis will analyze their tasks and work logs from the last 30 days.`)) {
            return
        }

        setLoading(true)
        setError(null)

        const result = await generatePerformanceReview(employeeId)

        if (result.success) {
            // Page will auto-refresh due to revalidatePath
            router.refresh()
        } else {
            setError(result.message)
            setLoading(false)
        }
    }

    return (
        <div className="space-y-2">
            <Button
                onClick={handleGenerate}
                disabled={loading}
                className="bg-gradient-to-r from-violet-600 to-purple-500 hover:from-violet-500 hover:to-purple-400 text-white"
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                    </>
                ) : (
                    <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate AI Review
                    </>
                )}
            </Button>
            {error && (
                <p className="text-xs text-red-400">{error}</p>
            )}
        </div>
    )
}
