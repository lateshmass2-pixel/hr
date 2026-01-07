"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Play, Menu, X, Sparkles } from "lucide-react"
import { useState } from "react"
import { HeroMockup } from "@/components/landing/hero-mockup"
import { BentoGrid } from "@/components/landing/bento-grid"
import { HowItWorks } from "@/components/landing/how-it-works"
import { PricingSection } from "@/components/landing/pricing-section"

// Animation variants for staggered text
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const scrollToFeatures = (e: React.MouseEvent) => {
    e.preventDefault()
    const element = document.getElementById("features")
    element?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-12">
              <Link href="/" className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-xl p-2">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="text-xl font-bold text-gray-900">HEMS</span>
              </Link>
              <div className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm">
                  Features
                </a>
                <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm">
                  Pricing
                </a>
                <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm">
                  How It Works
                </a>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <Link href="/login">
                <button className="text-gray-600 hover:text-gray-900 font-medium text-sm px-4 py-2 transition-colors">
                  Sign In
                </button>
              </Link>
              <Link href="/signup">
                <button className="bg-gray-900 text-white font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-gray-800 transition-all">
                  Get Started
                </button>
              </Link>
            </div>
            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="md:hidden pt-4 pb-2 space-y-4"
            >
              <a href="#features" className="block text-gray-600 hover:text-gray-900 font-medium">Features</a>
              <a href="#pricing" className="block text-gray-600 hover:text-gray-900 font-medium">Pricing</a>
              <Link href="/login" className="block text-gray-600 hover:text-gray-900 font-medium">Sign In</Link>
              <Link href="/signup" className="block bg-gray-900 text-white font-semibold text-center px-5 py-2.5 rounded-full">
                Get Started
              </Link>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 px-6 overflow-hidden">
        {/* Background gradient orbs */}
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-orange-200/30 rounded-full blur-[100px] -z-10" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-red-200/20 rounded-full blur-[100px] -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content - Staggered Animation */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              {/* Badge */}
              <motion.div variants={itemVariants}>
                <span className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 text-sm font-semibold px-4 py-2 rounded-full">
                  <Sparkles className="h-4 w-4" />
                  AI-Powered HR Platform
                </span>
              </motion.div>

              {/* Headline with Gradient */}
              <motion.h1
                variants={itemVariants}
                className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.1] tracking-tight"
              >
                The Operating System for{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-500">
                  Modern HR
                </span>
              </motion.h1>

              {/* Subtext */}
              <motion.p
                variants={itemVariants}
                className="text-xl text-gray-600 leading-relaxed max-w-xl"
              >
                Manage hiring, onboarding, and payroll in one unified platform. Powered by AI.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
                <Link href="/signup">
                  <button className="group bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold px-8 py-4 rounded-full hover:shadow-xl hover:shadow-orange-200 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                    Start for Free
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <button
                  onClick={scrollToFeatures}
                  className="group border-2 border-gray-200 text-gray-700 font-semibold px-8 py-4 rounded-full hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="h-5 w-5" />
                  View Demo
                </button>
              </motion.div>

              {/* Stats */}
              <motion.div variants={itemVariants} className="flex items-center gap-8 pt-4">
                <div>
                  <div className="text-3xl font-bold text-gray-900">500+</div>
                  <div className="text-sm text-gray-500">Companies</div>
                </div>
                <div className="h-12 w-px bg-gray-200" />
                <div>
                  <div className="text-3xl font-bold text-gray-900">50K+</div>
                  <div className="text-sm text-gray-500">Employees</div>
                </div>
                <div className="h-12 w-px bg-gray-200" />
                <div>
                  <div className="text-3xl font-bold text-gray-900">99%</div>
                  <div className="text-sm text-gray-500">Satisfaction</div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right - 3D Mockup */}
            <div className="hidden lg:block">
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <BentoGrid />

      {/* How It Works */}
      <HowItWorks />

      {/* Pricing */}
      <PricingSection />

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-[100px]" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center space-y-8 relative z-10"
        >
          <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight">
            Ready to modernize your HR?
          </h2>
          <p className="text-xl text-gray-400">
            Join thousands of companies already using HEMS to build better teams.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/signup">
              <button className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold px-10 py-4 rounded-full hover:shadow-2xl hover:shadow-orange-500/30 hover:scale-[1.02] transition-all">
                Start Free Trial
              </button>
            </Link>
            <Link href="/login">
              <button className="border border-white/20 text-white font-semibold px-10 py-4 rounded-full hover:bg-white/5 transition-all">
                Sign In
              </button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-xl p-2">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="text-xl font-bold text-white">HEMS</span>
              </div>
              <p className="text-gray-500 leading-relaxed max-w-sm">
                The modern HR operating system. Manage your entire workforce with the power of AI.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">© 2026 HEMS. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-white transition-colors text-sm">Twitter</a>
              <a href="#" className="hover:text-white transition-colors text-sm">LinkedIn</a>
              <a href="#" className="hover:text-white transition-colors text-sm">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
