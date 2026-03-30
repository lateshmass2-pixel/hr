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
                className="bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-red-600 text-white shadow-lg shadow-emerald-800/20"
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
                <p className="text-xs text-teal-700">{error}</p>
            )}
        </div>
    )
}
