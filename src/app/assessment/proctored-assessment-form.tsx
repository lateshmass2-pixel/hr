'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { submitAssessment, rejectApplication } from "./actions"
import { Loader2, CheckCircle2, XCircle, ShieldAlert, Camera, ArrowRight, BrainCircuit, Code2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { AiProctor } from "@/components/quiz/AiProctor"
import { toast } from 'sonner'
import { motion, AnimatePresence } from "framer-motion"

type MCQ = {
    id?: string
    question: string
    options: string[]
}

type AssessmentResult = {
    score: number
    passed: boolean
    feedback: string
}

type QuizPhase = 'consent' | 'aptitude' | 'intermission' | 'technical' | 'submitted' | 'rejected'

export function ProctoredAssessmentForm({ aptitude = [], technical = [], applicationId, candidateName }: {
    aptitude: MCQ[],
    technical: MCQ[],
    applicationId: string,
    candidateName: string
}) {
    const [phase, setPhase] = useState<QuizPhase>('consent')

    // Separate state for each section
    const [aptitudeAnswers, setAptitudeAnswers] = useState<(number | null)[]>(new Array(aptitude.length).fill(null))
    const [technicalAnswers, setTechnicalAnswers] = useState<(number | null)[]>(new Array(technical.length).fill(null))

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [result, setResult] = useState<AssessmentResult | null>(null)

    // Derived state
    const currentQuestions = phase === 'aptitude' ? aptitude : technical
    const currentAnswers = phase === 'aptitude' ? aptitudeAnswers : technicalAnswers
    const setCurrentAnswers = phase === 'aptitude' ? setAptitudeAnswers : setTechnicalAnswers

    const answeredCount = currentAnswers.filter(a => a !== null).length
    const totalQuestions = currentQuestions.length
    const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0

    const handleAnswerChange = (questionIndex: number, optionIndex: number) => {
        const newAnswers = [...currentAnswers]
        newAnswers[questionIndex] = optionIndex
        setCurrentAnswers(newAnswers)
    }

    const handleStart = () => setPhase('aptitude')

    const handleDisqualification = async () => {
        setPhase('rejected')
        await rejectApplication(applicationId, 'Disqualified: Suspicious activity detected during proctored assessment')
    }

    const handleAptitudeSubmit = () => {
        if (aptitudeAnswers.some(a => a === null)) {
            toast.error('Please answer all aptitude questions first.')
            return
        }
        setPhase('intermission')
        window.scrollTo(0, 0)
    }

    const handleTechnicalStart = () => {
        setPhase('technical')
        window.scrollTo(0, 0)
    }

    const handleFinalSubmit = async () => {
        if (technicalAnswers.some(a => a === null)) {
            toast.error('Please answer all technical questions.')
            return
        }

        setIsSubmitting(true)
        try {
            // Combine answers: Aptitude first, then Technical
            // NOTE: The backend must expect a flat array matching the order of questions
            const allAnswers = [...aptitudeAnswers, ...technicalAnswers] as number[]

            const response = await submitAssessment(applicationId, allAnswers)

            if (response.message === 'Success') {
                setPhase('submitted')
                setResult({
                    score: response.score ?? 0,
                    passed: response.passed ?? false,
                    feedback: response.feedback ?? ''
                })
            } else {
                toast.error('Error submitting assessment: ' + response.message)
            }
        } catch (e) {
            console.error(e)
            toast.error('An unexpected error occurred.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // --------------------------------------------------------------------------
    // RENDER: CONSENT
    // --------------------------------------------------------------------------
    if (phase === 'consent') {
        return (
            <Card className="max-w-lg mx-auto border-2 border-orange-200 shadow-xl">
                <CardHeader className="text-center pb-2 bg-gradient-to-b from-orange-50 to-white pt-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center border-4 border-white shadow-sm">
                        <Camera className="w-8 h-8 text-orange-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">Proctored Assessment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                        <h4 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" />
                            AI Proctoring Active
                        </h4>
                        <ul className="text-sm text-orange-700 space-y-2">
                            <li className="flex items-start gap-2">
                                <span className="mt-1">•</span>
                                <span>Webcam will be monitored throughout</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1">•</span>
                                <span>You must stay visible in the frame</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="mt-1">•</span>
                                <span>Multi-person detection implies cheating</span>
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <BrainCircuit className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-medium text-sm text-gray-900">Part A: Aptitude</p>
                                <p className="text-xs text-gray-500">{aptitude.length} Questions • Logic & Reasoning</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                <Code2 className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                                <p className="font-medium text-sm text-gray-900">Part B: Technical</p>
                                <p className="text-xs text-gray-500">{technical.length} Questions • Role Specific</p>
                            </div>
                        </div>
                    </div>

                    <Button
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold h-11"
                        onClick={handleStart}
                    >
                        Start Assessment
                    </Button>
                </CardContent>
            </Card>
        )
    }

    // --------------------------------------------------------------------------
    // RENDER: DISQUALIFIED
    // --------------------------------------------------------------------------
    if (phase === 'rejected') {
        return (
            <Card className="max-w-lg mx-auto border-2 border-red-300 bg-red-50">
                <CardContent className="pt-12 pb-12 flex flex-col items-center text-center space-y-6">
                    <div className="h-24 w-24 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
                        <XCircle className="h-14 w-14 text-red-600" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-red-800 mb-2">Disqualified</h2>
                        <p className="text-red-700 text-lg">Suspicious activity detected.</p>
                    </div>
                    <div className="w-full p-4 rounded-xl bg-white/50 border border-red-200 text-left">
                        <p className="text-sm text-red-800 leading-relaxed">
                            Our AI proctor flagged multiple violations (looking away, no face detected, or multiple faces). Your application has been automatically rejected.
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // --------------------------------------------------------------------------
    // RENDER: SUBMITTED
    // --------------------------------------------------------------------------
    if (phase === 'submitted' && result) {
        return (
            <Card className="max-w-lg mx-auto border-2 border-green-200 bg-green-50/50">
                <CardContent className="pt-12 pb-12 flex flex-col items-center text-center space-y-6">
                    <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="h-12 w-12 text-green-600" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-green-800 mb-2">Assessment Complete!</h2>
                        <p className="text-green-700">Your answers have been recorded.</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl shadow-sm border border-green-100 w-full">
                        <p className="text-sm text-gray-600">
                            We will review your results and get back to you shortly via email.
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // --------------------------------------------------------------------------
    // RENDER: INTERMISSION
    // --------------------------------------------------------------------------
    if (phase === 'intermission') {
        return (
            <div className="max-w-xl mx-auto py-12 px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                >
                    <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
                        <BrainCircuit className="w-16 h-16 text-white/20 absolute" />
                        <h2 className="text-3xl font-bold text-white relative z-10">Part A Complete!</h2>
                    </div>
                    <div className="p-8 text-center space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-gray-900">Take a breath.</h3>
                            <p className="text-gray-500">
                                You've finished the aptitude section. The next part covers technical skills specific to the role.
                            </p>
                        </div>

                        <div className="py-4 flex justify-center">
                            <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-full font-medium text-sm border border-purple-100">
                                <Code2 className="w-4 h-4" />
                                Next: Technical Section ({technical.length} Questions)
                            </div>
                        </div>

                        <Button
                            size="lg"
                            onClick={handleTechnicalStart}
                            className="w-full bg-slate-900 hover:bg-slate-800 h-12 text-lg"
                        >
                            Start Technical Section <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                        <p className="text-xs text-gray-400">Once you start, you cannot go back to Aptitude.</p>
                    </div>
                </motion.div>
            </div>
        )
    }

    // --------------------------------------------------------------------------
    // RENDER: QUIZ (APTITUDE or TECHNICAL)
    // --------------------------------------------------------------------------
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <AiProctor onDisqualify={handleDisqualification} isActive={true} />

            {/* Header / Progress */}
            <div className="bg-white/80 backdrop-blur-md sticky top-4 z-20 rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex justify-between items-center mb-3">
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                            {phase === 'aptitude' ? 'Part A: Aptitude' : 'Part B: Technical'}
                        </h3>
                        <p className="text-xs text-gray-500"> Question {answeredCount} of {totalQuestions}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${phase === 'aptitude' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                        {phase === 'aptitude' ? 'Logic & Reasoning' : 'Domain Skills'}
                    </div>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            {/* Question List */}
            <div className="space-y-6 pb-20">
                {currentQuestions.map((q, idx) => (
                    <motion.div
                        key={`${phase}-${idx}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <Card className={`transition-all duration-300 ${currentAnswers[idx] !== null
                            ? 'ring-2 ring-green-500/20 border-green-200 bg-green-50/10'
                            : 'hover:shadow-md'
                            }`}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-medium flex gap-4 leading-relaxed text-gray-800">
                                    <span className="shrink-0 w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center text-sm font-bold border border-gray-200">
                                        {idx + 1}
                                    </span>
                                    {q.question}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <RadioGroup
                                    value={currentAnswers[idx]?.toString() ?? ""}
                                    onValueChange={(value) => handleAnswerChange(idx, parseInt(value))}
                                    className="space-y-3"
                                >
                                    {q.options.map((option, optIdx) => (
                                        <div
                                            key={optIdx}
                                            className={`relative flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${currentAnswers[idx] === optIdx
                                                ? 'border-indigo-600 bg-indigo-50/50'
                                                : 'border-transparent bg-gray-50 hover:bg-gray-100'
                                                }`}
                                            onClick={() => handleAnswerChange(idx, optIdx)}
                                        >
                                            <RadioGroupItem value={optIdx.toString()} id={`${phase}-q${idx}-opt${optIdx}`} />
                                            <Label htmlFor={`${phase}-q${idx}-opt${optIdx}`} className="flex-1 cursor-pointer font-normal text-gray-700">
                                                <span className="font-semibold text-gray-400 mr-3 w-4 inline-block">
                                                    {String.fromCharCode(65 + optIdx)}
                                                </span>
                                                {option}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Footer Action */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-30">
                <div className="max-w-2xl mx-auto flex justify-between items-center">
                    <span className="text-sm text-gray-500 hidden sm:inline">
                        {currentAnswers.some(a => a === null)
                            ? `${totalQuestions - answeredCount} questions remaining`
                            : 'All questions answered'}
                    </span>

                    {phase === 'aptitude' ? (
                        <Button
                            onClick={handleAptitudeSubmit}
                            disabled={currentAnswers.some(a => a === null)}
                            className="w-full sm:w-auto px-8 bg-blue-600 hover:bg-blue-700 font-semibold"
                        >
                            Proceed to Technical <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleFinalSubmit}
                            disabled={isSubmitting || currentAnswers.some(a => a === null)}
                            className="w-full sm:w-auto px-8 bg-black hover:bg-slate-800 text-white font-semibold"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                            ) : (
                                <>Submit Final Assessment <CheckCircle2 className="ml-2 w-4 h-4" /></>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
