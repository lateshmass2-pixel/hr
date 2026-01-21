"use client"

import { motion } from "framer-motion"
import { FileText, DollarSign, UserPlus, GraduationCap, CheckCircle, Sparkles, Zap, Clock } from "lucide-react"

export function BentoGrid() {
    return (
        <section id="features" className="py-24 px-6 bg-gradient-to-b from-white to-gray-50">
            <div className="max-w-7xl mx-auto">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16 space-y-4"
                >
                    <span className="inline-block bg-orange-100 text-orange-600 text-sm font-semibold px-4 py-1.5 rounded-full">
                        Features
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                        Everything you need in <span className="gradient-text-orange">one platform</span>
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Powerful modules that work together seamlessly to transform your HR operations.
                    </p>
                </motion.div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-4">
                    {/* AI Recruitment - Large Card (Spans 2 cols) */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        className="md:col-span-2 group relative bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:glow-orange-lg transition-all duration-300 overflow-hidden"
                    >
                        {/* Hover glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-red-500/0 group-hover:from-orange-500/5 group-hover:to-red-500/5 transition-all duration-300 rounded-3xl" />

                        <div className="relative z-10 flex flex-col md:flex-row gap-6">
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-orange-100 text-orange-600 rounded-2xl p-3">
                                        <Sparkles className="h-6 w-6" />
                                    </div>
                                    <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                        AI POWERED
                                    </span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">AI Recruitment</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Auto-rank candidates, parse resumes instantly, and get AI-generated interview questions tailored to each role.
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                    {["Resume Parsing", "Auto-Ranking", "Smart Matching"].map((tag) => (
                                        <span key={tag} className="bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Resume Scanning Animation */}
                            <div className="flex-shrink-0 w-full md:w-52">
                                <div className="relative bg-gray-50 rounded-xl p-4 border border-gray-200 overflow-hidden">
                                    {/* Scanning line */}
                                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-scan-line" />

                                    {/* Mock resume content */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-gray-400" />
                                            <span className="text-sm font-semibold text-gray-700">resume.pdf</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-2 bg-gray-200 rounded w-full" />
                                            <div className="h-2 bg-gray-200 rounded w-3/4" />
                                            <div className="h-2 bg-gray-200 rounded w-5/6" />
                                        </div>
                                        <div className="flex items-center gap-2 pt-2">
                                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                                            <span className="text-xs text-emerald-600 font-semibold">96% Match</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Smart Payroll - Tall Card (Spans 2 rows) */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        whileHover={{ scale: 1.02 }}
                        className="md:row-span-2 group relative bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:glow-orange-lg transition-all duration-300 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-red-500/0 group-hover:from-orange-500/5 group-hover:to-red-500/5 transition-all duration-300 rounded-3xl" />

                        <div className="relative z-10 h-full flex flex-col">
                            <div className="space-y-4 mb-6">
                                <div className="bg-green-100 text-green-600 rounded-2xl p-3 w-fit">
                                    <DollarSign className="h-6 w-6" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">Smart Payroll</h3>
                                <p className="text-gray-600">
                                    Automated salary calculations, tax deductions, and instant payslip generation.
                                </p>
                            </div>

                            {/* Scrolling payments list */}
                            <div className="flex-1 relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                                <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-gray-50 to-transparent z-10" />
                                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-gray-50 to-transparent z-10" />

                                <div className="animate-scroll-up space-y-3 p-4">
                                    {[
                                        { name: "Sarah Johnson", amount: "$5,200", status: "Paid" },
                                        { name: "Michael Chen", amount: "$4,800", status: "Paid" },
                                        { name: "Emily Davis", amount: "$6,100", status: "Pending" },
                                        { name: "James Wilson", amount: "$5,500", status: "Paid" },
                                        { name: "Lisa Anderson", amount: "$4,900", status: "Paid" },
                                        { name: "Robert Taylor", amount: "$5,800", status: "Processing" },
                                        { name: "Sarah Johnson", amount: "$5,200", status: "Paid" },
                                        { name: "Michael Chen", amount: "$4,800", status: "Paid" },
                                    ].map((payment, i) => (
                                        <div key={i} className="bg-white rounded-lg p-3 border border-gray-100 flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900">{payment.name}</div>
                                                <div className="text-xs text-gray-500">{payment.amount}</div>
                                            </div>
                                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${payment.status === "Paid" ? "bg-emerald-100 text-emerald-700" :
                                                payment.status === "Pending" ? "bg-amber-100 text-amber-700" :
                                                    "bg-purple-100 text-purple-700"
                                                }`}>
                                                {payment.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* One-Click Onboarding - Small Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        whileHover={{ scale: 1.02 }}
                        className="group relative bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:glow-orange-lg transition-all duration-300 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-red-500/0 group-hover:from-orange-500/5 group-hover:to-red-500/5 transition-all duration-300 rounded-3xl" />

                        <div className="relative z-10 space-y-4">
                            <div className="bg-purple-100 text-purple-600 rounded-2xl p-3 w-fit">
                                <UserPlus className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">One-Click Onboarding</h3>
                            <p className="text-gray-600 text-sm">
                                Automated workflows for new hires. Documents, training, and setup - all in one click.
                            </p>

                            {/* Mini progress visual */}
                            <div className="flex items-center gap-2 pt-2">
                                {[1, 2, 3, 4].map((step, i) => (
                                    <div key={step} className="flex items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-purple-500 text-white" : "bg-gray-200 text-gray-500"
                                            }`}>
                                            {i < 3 ? <CheckCircle className="h-4 w-4" /> : step}
                                        </div>
                                        {i < 3 && <div className={`w-4 h-0.5 ${i < 2 ? "bg-purple-500" : "bg-gray-200"}`} />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Employee Learning - Small Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        whileHover={{ scale: 1.02 }}
                        className="group relative bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:glow-orange-lg transition-all duration-300 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-red-500/0 group-hover:from-orange-500/5 group-hover:to-red-500/5 transition-all duration-300 rounded-3xl" />

                        <div className="relative z-10 space-y-4">
                            <div className="bg-orange-100 text-orange-600 rounded-2xl p-3 w-fit">
                                <GraduationCap className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Employee Learning</h3>
                            <p className="text-gray-600 text-sm">
                                Track skill development with personalized learning paths and certifications.
                            </p>

                            {/* Mini courses visual */}
                            <div className="space-y-2 pt-2">
                                {[
                                    { name: "Leadership 101", progress: 85 },
                                    { name: "Communication", progress: 60 },
                                ].map((course, i) => (
                                    <div key={i} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-700 font-medium">{course.name}</span>
                                            <span className="text-gray-500">{course.progress}%</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                whileInView={{ width: `${course.progress}%` }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                                                className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
