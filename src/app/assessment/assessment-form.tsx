'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { submitAssessment } from "../actions"
import { Loader2, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"

export function AssessmentForm({ questions, applicationId }: { questions: string[], applicationId: string }) {
    const [answers, setAnswers] = useState<string[]>(new Array(questions.length).fill(''))
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isCompleted, setIsCompleted] = useState(false)
    const router = useRouter()

    const handleAnswerChange = (index: number, value: string) => {
        const newAnswers = [...answers]
        newAnswers[index] = value
        setAnswers(newAnswers)
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            const result = await submitAssessment(applicationId, answers)
            if (result.message === 'Success') {
                setIsCompleted(true)
            } else {
                alert('Error submitting assessment: ' + result.message)
            }
        } catch (e) {
            console.error(e)
            alert('An unexpected error occurred.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isCompleted) {
        return (
            <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-green-800">Assessment Submitted!</h2>
                    <p className="text-green-700">
                        Thank you for completing the test. Our AI systems are reviewing your answers.
                        You will be notified of the next steps shortly.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {questions.map((q, idx) => (
                <Card key={idx}>
                    <CardHeader>
                        <CardTitle className="text-lg">Question {idx + 1}</CardTitle>
                        <p className="text-muted-foreground">{q}</p>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            placeholder="Type your answer here..."
                            className="min-h-[120px]"
                            value={answers[idx]}
                            onChange={(e) => handleAnswerChange(idx, e.target.value)}
                        />
                    </CardContent>
                </Card>
            ))}

            <div className="flex justify-end">
                <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={isSubmitting || answers.some(a => a.trim().length === 0)}
                    className="w-full sm:w-auto"
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Submit Assessment"}
                </Button>
            </div>
        </div>
    )
}
