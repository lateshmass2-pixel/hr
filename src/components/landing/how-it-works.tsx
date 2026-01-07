"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useScroll, useMotionValueEvent } from "framer-motion"
import { Upload, Sparkles, UserCheck, Rocket, CheckCircle } from "lucide-react"

const steps = [
    {
        id: 1,
        icon: Upload,
        title: "Post Your Job",
        description: "Create a job listing in seconds. Our AI suggests the best requirements based on your role.",
        color: "from-orange-500 to-red-500",
    },
    {
        id: 2,
        icon: Sparkles,
        title: "AI Screens Candidates",
        description: "Our AI automatically parses resumes, ranks candidates, and identifies the best matches.",
        color: "from-purple-500 to-pink-500",
    },
    {
        id: 3,
        icon: UserCheck,
        title: "Interview & Hire",
        description: "Schedule interviews with one click. Get AI-generated questions tailored to each candidate.",
        color: "from-blue-500 to-cyan-500",
    },
    {
        id: 4,
        icon: Rocket,
        title: "Seamless Onboarding",
        description: "Automate the entire onboarding process. Documents, training, and setup - all handled.",
        color: "from-emerald-500 to-teal-500",
    },
]

export function HowItWorks() {
    const containerRef = useRef<HTMLDivElement>(null)
    const [activeStep, setActiveStep] = useState(0)

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"],
    })

    useMotionValueEvent(scrollYProgress, "change", (latest) => {
        const stepIndex = Math.min(
            Math.floor(latest * steps.length),
            steps.length - 1
        )
        setActiveStep(stepIndex)
    })

    return (
        <section ref={containerRef} className="relative min-h-[300vh] bg-gray-50">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50 to-white" />

            <div className="sticky top-0 h-screen flex items-center overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 w-full">
                    {/* Section Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <span className="inline-block bg-orange-100 text-orange-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                            How It Works
                        </span>
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                            From job post to <span className="gradient-text-orange">hired</span> in 4 steps
                        </h2>
                    </motion.div>

                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Left - Steps Navigation */}
                        <div className="space-y-6">
                            {steps.map((step, index) => (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: -30 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`relative flex items-start gap-4 p-6 rounded-2xl transition-all duration-500 cursor-pointer ${activeStep === index
                                            ? "bg-white shadow-lg border-2 border-orange-200"
                                            : "bg-transparent hover:bg-white/50"
                                        }`}
                                    onClick={() => setActiveStep(index)}
                                >
                                    {/* Step Number */}
                                    <div className={`relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${activeStep === index ? step.color : "from-gray-200 to-gray-300"
                                        } transition-all duration-500`}>
                                        {activeStep > index ? (
                                            <CheckCircle className="h-6 w-6 text-white" />
                                        ) : (
                                            <span className="text-white font-bold text-lg">{step.id}</span>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <h3 className={`text-lg font-bold mb-1 transition-colors duration-300 ${activeStep === index ? "text-gray-900" : "text-gray-500"
                                            }`}>
                                            {step.title}
                                        </h3>
                                        <p className={`text-sm leading-relaxed transition-colors duration-300 ${activeStep === index ? "text-gray-600" : "text-gray-400"
                                            }`}>
                                            {step.description}
                                        </p>
                                    </div>

                                    {/* Active indicator */}
                                    {activeStep === index && (
                                        <motion.div
                                            layoutId="activeIndicator"
                                            className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 to-red-500 rounded-l-2xl"
                                        />
                                    )}
                                </motion.div>
                            ))}
                        </div>

                        {/* Right - Visual */}
                        <div className="relative hidden lg:block">
                            <div className="relative aspect-square max-w-lg mx-auto">
                                {/* Background glow */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${steps[activeStep].color} opacity-10 rounded-3xl blur-3xl transition-all duration-500`} />

                                {/* Main visual card */}
                                <motion.div
                                    key={activeStep}
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="relative bg-white rounded-3xl shadow-2xl p-8 border border-gray-100"
                                >
                                    {/* Icon */}
                                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${steps[activeStep].color} flex items-center justify-center mb-6`}>
                                        {(() => {
                                            const Icon = steps[activeStep].icon
                                            return <Icon className="h-10 w-10 text-white" />
                                        })()}
                                    </div>

                                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                                        Step {steps[activeStep].id}: {steps[activeStep].title}
                                    </h3>

                                    <p className="text-gray-600 leading-relaxed mb-6">
                                        {steps[activeStep].description}
                                    </p>

                                    {/* Visual representation based on step */}
                                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                        {activeStep === 0 && (
                                            <div className="space-y-3">
                                                <div className="h-3 bg-gray-200 rounded-full w-3/4" />
                                                <div className="h-3 bg-gray-200 rounded-full w-full" />
                                                <div className="h-3 bg-gray-200 rounded-full w-1/2" />
                                                <div className="mt-4 flex gap-2">
                                                    <div className="h-8 bg-orange-500 rounded-lg w-24" />
                                                    <div className="h-8 bg-gray-200 rounded-lg w-20" />
                                                </div>
                                            </div>
                                        )}
                                        {activeStep === 1 && (
                                            <div className="space-y-3">
                                                {[92, 85, 78].map((score, i) => (
                                                    <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100">
                                                        <div className="w-10 h-10 rounded-full bg-gray-200" />
                                                        <div className="flex-1">
                                                            <div className="h-2 bg-gray-200 rounded w-24 mb-1" />
                                                            <div className="h-2 bg-gray-100 rounded w-16" />
                                                        </div>
                                                        <span className={`text-sm font-bold ${score > 90 ? "text-emerald-600" : score > 80 ? "text-blue-600" : "text-gray-600"
                                                            }`}>{score}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {activeStep === 2 && (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border-2 border-blue-200">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <UserCheck className="h-5 w-5 text-blue-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-semibold text-gray-900">Interview Scheduled</div>
                                                        <div className="text-xs text-gray-500">Tomorrow at 2:00 PM</div>
                                                    </div>
                                                </div>
                                                <div className="h-2 bg-gray-200 rounded-full w-full" />
                                                <div className="h-2 bg-gray-200 rounded-full w-2/3" />
                                            </div>
                                        )}
                                        {activeStep === 3 && (
                                            <div className="space-y-2">
                                                {["Welcome Email", "Documents", "Training", "Setup Complete"].map((task, i) => (
                                                    <div key={i} className="flex items-center gap-2">
                                                        <CheckCircle className={`h-5 w-5 ${i < 3 ? "text-emerald-500" : "text-gray-300"}`} />
                                                        <span className={`text-sm ${i < 3 ? "text-gray-700" : "text-gray-400"}`}>{task}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>

                                {/* Progress indicator */}
                                <div className="absolute -right-8 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                                    {steps.map((_, index) => (
                                        <div
                                            key={index}
                                            className={`w-2 h-2 rounded-full transition-all duration-300 ${activeStep === index
                                                    ? "bg-orange-500 scale-150"
                                                    : activeStep > index
                                                        ? "bg-orange-300"
                                                        : "bg-gray-300"
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
