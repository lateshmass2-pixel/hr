// import { getEmployeeReview } from '@/app/actions/performance' // Removed
import { GenerateReviewButton } from './generate-button'
import { Star, Calendar, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import { Card } from '@/components/ui/card'

interface Employee {
    id: string
    full_name: string
    email: string
    position?: string
}

interface Review {
    id: string
    employee_id: string
    review_period: string
    ai_summary: string
    rating: number
    created_at: string
}

export function PerformanceReviewPanel({ employee, review }: { employee: Employee, review?: Review | null }) {
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    // Determine score-based border color (Semantic)
    const getBorderColor = (rating: number) => {
        if (rating >= 4) return 'border-l-emerald-500' // Green for excellent
        if (rating >= 3) return 'border-l-amber-500'   // Amber for good
        return 'border-l-red-500'                      // Red for needs improvement
    }

    return (
        <Card noPadding className={`overflow-hidden ${review ? `border-l-4 ${getBorderColor(review.rating)}` : ''}`}>
            {/* Header */}
            <div className="p-6 border-b border-green-100 bg-gradient-to-r from-[#f0fdf4] to-white">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#14532d] to-[#166534] flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-lg ring-2 ring-white">
                            {(employee.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[#14532d]">{employee.full_name}</h3>
                            <p className="text-sm text-slate-500 mt-0.5">{employee.position || 'Employee'}</p>
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                                <Calendar className="h-3 w-3" />
                                Review Period: {currentMonth}
                            </div>
                        </div>
                    </div>
                    {!review && <GenerateReviewButton employeeId={employee.id} employeeName={employee.full_name} />}
                </div>
            </div>

            {/* Review Content */}
            <div className="p-6">
                {review ? (
                    <div className="space-y-6">
                        {/* Rating */}
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-[#f8faf6] border border-green-100">
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={`h-6 w-6 ${star <= Math.round(review.rating)
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'text-gray-200'
                                            }`}
                                    />
                                ))}
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-[#14532d]">{review.rating.toFixed(1)}<span className="text-slate-400 text-lg font-medium">/5.0</span></div>
                                <div className="text-xs text-slate-500">Performance Rating</div>
                            </div>
                        </div>

                        {/* AI Summary */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-[#14532d]">
                                <div className="p-1 rounded bg-green-100 text-green-700">
                                    <Sparkles className="h-3.5 w-3.5" />
                                </div>
                                AI-Generated Review
                            </div>
                            <div className="p-5 rounded-xl bg-[#f8faf6] border border-green-50 text-slate-600 leading-relaxed whitespace-pre-line italic relative">
                                <span className="absolute top-4 left-4 text-green-200 text-4xl leading-none font-serif">"</span>
                                <div className="relative z-10 pl-2">
                                    {review.ai_summary}
                                </div>
                            </div>
                            <a href="#" className="inline-flex items-center text-green-700 font-medium text-sm hover:text-green-800 hover:underline">
                                Read Full Review →
                            </a>
                        </div>

                        {/* Metadata */}
                        <div className="pt-4 border-t border-green-50">
                            <p className="text-xs text-slate-400">
                                Generated on {format(new Date(review.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="py-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4 animate-pulse">
                            <Sparkles className="h-8 w-8 text-green-600" />
                        </div>
                        <h4 className="text-lg font-semibold text-[#14532d] mb-2">No Review Yet</h4>
                        <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                            Generate an AI-powered performance review for {currentMonth} based on tasks and activity.
                        </p>
                        <GenerateReviewButton employeeId={employee.id} employeeName={employee.full_name} />
                    </div>
                )}
            </div>
        </Card>
    )
}
