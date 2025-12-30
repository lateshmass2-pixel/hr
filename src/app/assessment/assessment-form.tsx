'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { submitAssessment } from "./actions"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

type MCQ = {
    question: string
    options: string[]
    correct: number
}

type AssessmentResult = {
    score: number
    passed: boolean
    feedback: string
}

export function AssessmentForm({ questions, applicationId }: { questions: MCQ[], applicationId: string }) {
    const [answers, setAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null))
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [result, setResult] = useState<AssessmentResult | null>(null)

    const answeredCount = answers.filter(a => a !== null).length
    const progress = (answeredCount / questions.length) * 100

    const handleAnswerChange = (questionIndex: number, optionIndex: number) => {
        const newAnswers = [...answers]
        newAnswers[questionIndex] = optionIndex
        setAnswers(newAnswers)
    }

    const handleSubmit = async () => {
        if (answers.some(a => a === null)) {
            alert('Please answer all questions before submitting.')
            return
        }

        setIsSubmitting(true)
        try {
            const response = await submitAssessment(applicationId, answers as number[])
            if (response.message === 'Success') {
                setResult({
                    score: response.score ?? 0,
                    passed: response.passed ?? false,
                    feedback: response.feedback ?? ''
                })
            } else {
                alert('Error submitting assessment: ' + response.message)
            }
        } catch (e) {
            console.error(e)
            alert('An unexpected error occurred.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Result screen - Assessment submitted
    if (result) {
        return (
            <Card className="border-2 border-blue-200 bg-blue-50">
                <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-4">
                    <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
                        <CheckCircle2 className="h-12 w-12 text-blue-600" />
                    </div>

                    <h2 className="text-2xl font-bold text-blue-800">
                        Assessment Submitted!
                    </h2>

                    <p className="text-blue-700 max-w-md">
                        Thank you for completing the assessment. Your answers have been recorded and are now under review.
                    </p>

                    <div className="w-full mt-4 p-4 rounded-lg bg-blue-100 border border-blue-200">
                        <p className="text-sm text-blue-800">
                            📧 <strong>You will be notified via email</strong> once our team has reviewed your submission. Please check your inbox for updates.
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Progress Bar */}
            <Card className="sticky top-4 z-10 bg-white/95 backdrop-blur">
                <CardContent className="py-4">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Progress</span>
                        <span className="text-muted-foreground">{answeredCount} of {questions.length} answered</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </CardContent>
            </Card>

            {/* Questions */}
            {questions.map((q, idx) => (
                <Card key={idx} className={answers[idx] !== null ? 'border-green-200 bg-green-50/30' : ''}>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-start gap-3">
                            <span className="shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                                {idx + 1}
                            </span>
                            <span className="pt-1">{q.question}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            value={answers[idx]?.toString()}
                            onValueChange={(value) => handleAnswerChange(idx, parseInt(value))}
                        >
                            {q.options.map((option, optIdx) => (
                                <div
                                    key={optIdx}
                                    className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${answers[idx] === optIdx ? 'border-primary bg-primary/5' : 'border-transparent'
                                        }`}
                                    onClick={() => handleAnswerChange(idx, optIdx)}
                                >
                                    <RadioGroupItem value={optIdx.toString()} id={`q${idx}-opt${optIdx}`} />
                                    <Label htmlFor={`q${idx}-opt${optIdx}`} className="flex-1 cursor-pointer">
                                        <span className="font-medium text-muted-foreground mr-2">
                                            {String.fromCharCode(65 + optIdx)}.
                                        </span>
                                        {option}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </CardContent>
                </Card>
            ))}

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
                <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={isSubmitting || answers.some(a => a === null)}
                    className="w-full sm:w-auto px-12"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        'Submit Assessment'
                    )}
                </Button>
            </div>

            {answers.some(a => a === null) && (
                <p className="text-center text-sm text-muted-foreground">
                    Please answer all {questions.length} questions to submit.
                </p>
            )}
        </div>
    )
}
