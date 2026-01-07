import { getApplication } from "../actions"
import { notFound } from "next/navigation"
import { ProctoredAssessmentForm } from "../proctored-assessment-form"
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react"

type Props = {
    params: Promise<{ id: string }>
}

type MCQ = {
    question: string
    options: string[]
    correct: number
}

// Component for completed assessments - simple confirmation only
function AssessmentEvaluation() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gradient-to-b from-slate-50 to-slate-100">
            <div className="max-w-md w-full">
                <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-blue-600" />
                </div>

                <h1 className="text-2xl font-bold mb-3 text-slate-900">
                    Assessment Submitted
                </h1>

                <p className="text-muted-foreground mb-6">
                    Thank you for completing the assessment! Your answers have been successfully recorded and are now under review.
                </p>

                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-sm text-blue-700">
                        📧 You will be notified via email once our team has reviewed your submission.
                    </p>
                </div>
            </div>
        </div>
    )
}

// Component for unavailable/expired assessments
function AssessmentUnavailable() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-slate-50">
            <div className="max-w-md">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold mb-2 text-slate-900">Assessment Unavailable</h1>
                <p className="text-muted-foreground mb-6">
                    This assessment link is no longer active. The test may have expired or has already been completed.
                </p>
                <a
                    href="/"
                    className="inline-flex items-center justify-center px-6 py-2 text-sm font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                    Return to Home
                </a>
            </div>
        </div>
    )
}

export default async function AssessmentPage(props: Props) {
    // Await the params object (Next.js 15 requirement)
    const params = await props.params
    const id = params.id

    const application = await getApplication(id)

    if (!application) return notFound()

    // Status-based routing
    const { status, test_score } = application

    // 1. Test is ready to be taken
    if (status === 'TEST_PENDING') {
        const questions = (application.generated_questions || []) as MCQ[]

        // Validate MCQ structure
        if (!questions.length || !questions[0]?.options) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-slate-50">
                    <div className="max-w-md">
                        <h1 className="text-2xl font-bold mb-2">Assessment Loading...</h1>
                        <p className="text-muted-foreground">
                            The assessment questions are still being generated. Please refresh the page in a moment.
                        </p>
                    </div>
                </div>
            )
        }

        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
                <div className="max-w-2xl w-full space-y-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-slate-900">Technical Assessment</h1>
                        <p className="text-slate-600 mt-2">
                            Hi <strong>{application.candidate_name}</strong>, please complete this {questions.length}-question MCQ test.
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            You need 70% or above to proceed to the interview stage.
                        </p>
                    </div>

                    <ProctoredAssessmentForm
                        questions={questions}
                        applicationId={application.id}
                        candidateName={application.candidate_name}
                    />
                </div>
            </div>
        )
    }

    // 2. Test has been completed and evaluated
    if (['INTERVIEW', 'REJECTED'].includes(status)) {
        return <AssessmentEvaluation />
    }

    // 3. Any other status (NEW, expired, etc.) - show unavailable
    return <AssessmentUnavailable />
}
