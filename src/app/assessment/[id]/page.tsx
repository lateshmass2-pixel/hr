import { getApplication, submitAssessment } from "../actions"
import { notFound } from "next/navigation"
import { AssessmentForm } from "./assessment-form"

export default async function AssessmentPage({ params }: { params: { id: string } }) {
    const application = await getApplication(params.id)

    if (!application) return notFound()

    // Security check: Only allow if status is TEST_PENDING
    if (application.status !== 'TEST_PENDING') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <h1 className="text-2xl font-bold mb-2">Assessment Unavailable</h1>
                <p className="text-muted-foreground">
                    This assessment has either been completed or is no longer active.
                </p>
            </div>
        )
    }

    const questions = application.generated_questions as string[] || []

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
            <div className="max-w-2xl w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-900">Technical Assessment</h1>
                    <p className="text-slate-600 mt-2">
                        Hi {application.candidate_name}, please answer the following questions generated based on your profile.
                    </p>
                </div>

                <AssessmentForm questions={questions} applicationId={application.id} />
            </div>
        </div>
    )
}
