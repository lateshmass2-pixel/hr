import { getEmployeeReview } from '@/app/actions/performance'
import { GenerateReviewButton } from './generate-button'
import { Star, Calendar, Sparkles } from 'lucide-react'
import { format } from 'date-fns'

interface Employee {
    id: string
    full_name: string
    email: string
    position?: string
}

export async function PerformanceReviewPanel({ employee }: { employee: Employee }) {
    const review = await getEmployeeReview(employee.id)
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    // Determine score-based border color
    const getBorderColor = (rating: number) => {
        if (rating >= 4) return 'border-l-emerald-500'
        if (rating >= 3) return 'border-l-orange-500'
        return 'border-l-yellow-500'
    }

    return (
        <div className={`rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden ${review ? `border-l-4 ${getBorderColor(review.rating)}` : ''}`}>
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white text-lg font-bold shrink-0">
                            {(employee.full_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{employee.full_name}</h3>
                            <p className="text-sm text-gray-500 mt-0.5">{employee.position || 'Employee'}</p>
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
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
                    <div className="space-y-4">
                        {/* Rating */}
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200">
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={`h-6 w-6 ${star <= Math.round(review.rating)
                                            ? 'fill-orange-500 text-orange-500'
                                            : 'text-gray-300'
                                            }`}
                                    />
                                ))}
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{review.rating.toFixed(1)}/5.0</div>
                                <div className="text-xs text-gray-500">Performance Rating</div>
                            </div>
                        </div>

                        {/* AI Summary */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                <Sparkles className="h-4 w-4 text-orange-600" />
                                AI-Generated Review
                            </div>
                            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line italic">
                                    {review.ai_summary}
                                </p>
                            </div>
                            <a href="#" className="inline-flex items-center text-orange-600 font-medium text-sm hover:underline">
                                Read Full Review →
                            </a>
                        </div>

                        {/* Metadata */}
                        <div className="pt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                                Generated on {format(new Date(review.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="py-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mb-4">
                            <Sparkles className="h-8 w-8 text-orange-500" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">No Review Yet</h4>
                        <p className="text-gray-500 mb-4">
                            Generate an AI-powered performance review for {currentMonth}
                        </p>
                        <GenerateReviewButton employeeId={employee.id} employeeName={employee.full_name} />
                    </div>
                )}
            </div>
        </div>
    )
}
