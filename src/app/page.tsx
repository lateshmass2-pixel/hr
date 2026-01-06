import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Users, BarChart3, Layout, ArrowRight, Play } from "lucide-react"
import { DashboardPreview } from "@/components/landing/dashboard-preview"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="absolute top-0 w-full z-50 py-6 px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            <h1 className="text-white font-bold text-2xl">HEMS Portal</h1>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-white/80 hover:text-white transition-colors font-medium text-sm">Features</a>
              <a href="#pricing" className="text-white/80 hover:text-white transition-colors font-medium text-sm">Pricing</a>
              <a href="#about" className="text-white/80 hover:text-white transition-colors font-medium text-sm">About</a>
            </div>
          </div>
          <Link href="/login">
            <button className="bg-white/10 border border-white/20 text-white px-5 py-2 rounded-full hover:bg-white/20 transition-all font-medium text-sm">
              Sign In
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#5e2d73] via-[#49225B] to-[#3a1b49] pt-32 pb-20 px-6 overflow-hidden min-h-screen flex items-center">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight">
                  The AI-Powered Operating System for Modern HR
                </h1>
                <p className="text-lg text-purple-100/90 leading-relaxed">
                  Streamline hiring, automate performance reviews, and manage your team with the power of Artificial Intelligence.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login?tab=signup">
                  <button className="bg-white text-[#49225B] font-bold px-8 py-3 rounded-lg hover:bg-purple-50 hover:scale-105 transition-all shadow-lg shadow-purple-900/20">
                    Get Started <ArrowRight className="inline ml-2 h-5 w-5" />
                  </button>
                </Link>
                <button className="bg-transparent border border-white/30 text-white font-semibold px-8 py-3 rounded-lg hover:bg-white/10 transition-all flex items-center gap-2 justify-center">
                  <Play className="h-5 w-5" /> Watch Demo
                </button>
              </div>
              <div className="flex items-center gap-8 pt-4">
                <div className="text-white/90">
                  <div className="text-3xl font-bold">500+</div>
                  <div className="text-sm text-purple-200">Companies</div>
                </div>
                <div className="text-white/90">
                  <div className="text-3xl font-bold">50K+</div>
                  <div className="text-sm text-purple-200">Employees</div>
                </div>
                <div className="text-white/90">
                  <div className="text-3xl font-bold">99%</div>
                  <div className="text-sm text-purple-200">Satisfaction</div>
                </div>
              </div>
            </div>

            {/* Right Visual */}
            <div className="relative hidden lg:block">
              <DashboardPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-[#F8F9FC]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl font-bold text-gray-900">Why Choose HEMS?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built for modern HR teams who want to focus on people, not paperwork.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="bg-purple-100 text-purple-600 rounded-full p-4 w-16 h-16 flex items-center justify-center mb-6">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AI Hiring Pipeline</h3>
              <p className="text-gray-600 leading-relaxed">
                Auto-rank candidates, generate interview questions, and create offer letters instantly with our AI-powered recruitment system.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="bg-purple-100 text-purple-600 rounded-full p-4 w-16 h-16 flex items-center justify-center mb-6">
                <BarChart3 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Performance</h3>
              <p className="text-gray-600 leading-relaxed">
                AI-generated performance appraisals based on real task completion data, project contributions, and team feedback.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="bg-purple-100 text-purple-600 rounded-full p-4 w-16 h-16 flex items-center justify-center mb-6">
                <Layout className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Employee Self-Service</h3>
              <p className="text-gray-600 leading-relaxed">
                Empower your team to manage tasks, request leave, and update settings in one beautiful, intuitive portal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-[#49225B] to-[#6E3482]">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl font-bold text-white">Ready to Transform Your HR?</h2>
          <p className="text-xl text-purple-100">
            Join hundreds of companies already using HEMS to build better teams.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login?tab=signup">
              <button className="bg-white text-hems-primary hover:bg-gray-100 font-semibold px-8 py-3 rounded-lg transition-all">
                Start Free Trial
              </button>
            </Link>
            <Link href="/login">
              <button className="bg-transparent border border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-3 rounded-lg transition-all">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <h3 className="text-white font-bold text-lg">HEMS Portal</h3>
              <p className="text-sm">
                The modern HR operating system powered by AI.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2026 HEMS Portal. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
