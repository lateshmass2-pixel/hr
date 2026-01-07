"use client"

import { motion } from "framer-motion"
import { Check, Zap, Building2, Rocket } from "lucide-react"
import Link from "next/link"

const plans = [
    {
        name: "Startup",
        icon: Rocket,
        price: "$49",
        period: "/month",
        description: "Perfect for small teams getting started",
        features: [
            "Up to 25 employees",
            "Basic recruitment tools",
            "Employee directory",
            "Leave management",
            "Email support",
        ],
        cta: "Start Free Trial",
        popular: false,
    },
    {
        name: "Growth",
        icon: Zap,
        price: "$149",
        period: "/month",
        description: "For growing companies scaling fast",
        features: [
            "Up to 100 employees",
            "AI-powered recruitment",
            "Performance reviews",
            "Learning management",
            "Payroll integration",
            "Priority support",
            "Custom reports",
        ],
        cta: "Start Free Trial",
        popular: true,
    },
    {
        name: "Enterprise",
        icon: Building2,
        price: "Custom",
        period: "",
        description: "For large organizations with complex needs",
        features: [
            "Unlimited employees",
            "Advanced AI features",
            "Custom integrations",
            "Dedicated success manager",
            "SLA guarantee",
            "On-premise option",
            "Security audit",
            "Custom training",
        ],
        cta: "Contact Sales",
        popular: false,
    },
]

export function PricingSection() {
    return (
        <section id="pricing" className="py-24 px-6 bg-white">
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
                        Pricing
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                        Simple, transparent <span className="gradient-text-orange">pricing</span>
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Choose the plan that fits your team. All plans include a 14-day free trial.
                    </p>
                </motion.div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-8">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className={`relative rounded-3xl p-8 ${plan.popular
                                    ? "bg-white border-2 border-orange-500 shadow-2xl shadow-orange-100"
                                    : "bg-gray-50 border border-gray-200"
                                }`}
                        >
                            {/* Popular Badge */}
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                    <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg">
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            {/* Plan Header */}
                            <div className="text-center mb-8">
                                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 ${plan.popular
                                        ? "bg-gradient-to-br from-orange-500 to-red-500 text-white"
                                        : "bg-gray-200 text-gray-600"
                                    }`}>
                                    <plan.icon className="h-7 w-7" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                                <p className="text-gray-600 text-sm">{plan.description}</p>
                            </div>

                            {/* Price */}
                            <div className="text-center mb-8">
                                <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                                <span className="text-gray-500 text-lg">{plan.period}</span>
                            </div>

                            {/* Features */}
                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${plan.popular ? "bg-orange-100" : "bg-gray-200"
                                            }`}>
                                            <Check className={`h-3 w-3 ${plan.popular ? "text-orange-600" : "text-gray-600"
                                                }`} />
                                        </div>
                                        <span className="text-gray-700 text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA Button */}
                            <Link href={plan.name === "Enterprise" ? "/contact" : "/signup"}>
                                <button className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${plan.popular
                                        ? "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg hover:shadow-orange-200 hover:scale-[1.02]"
                                        : "bg-gray-900 text-white hover:bg-gray-800"
                                    }`}>
                                    {plan.cta}
                                </button>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                {/* Trust badges */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="mt-16 text-center"
                >
                    <p className="text-gray-500 text-sm mb-4">Trusted by 500+ companies worldwide</p>
                    <div className="flex items-center justify-center gap-8 opacity-50">
                        {["Google", "Microsoft", "Airbnb", "Spotify", "Uber"].map((company) => (
                            <div key={company} className="text-gray-400 font-bold text-xl">
                                {company}
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
