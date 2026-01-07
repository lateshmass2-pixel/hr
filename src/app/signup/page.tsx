'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, Lock, AlertCircle, User, Building } from "lucide-react"

export default function SignupPage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    async function onSignup(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(false)

        const formData = new FormData(e.currentTarget)
        const email = formData.get("email") as string
        const password = formData.get("password") as string
        const fullName = formData.get("fullName") as string
        const companyName = formData.get("companyName") as string

        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        company_name: companyName
                    }
                }
            })

            if (signUpError) throw signUpError

            setSuccess(true)
            setLoading(false)
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen grid lg:grid-cols-2">
                <div className="flex flex-col justify-center p-12 bg-white">
                    <div className="max-w-md mx-auto text-center space-y-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <Mail className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
                        <p className="text-gray-500">
                            We've sent a verification link to your email address. Please sign in after verifying your account.
                        </p>
                        <Button
                            variant="outline"
                            className="w-full mt-4"
                            onClick={() => router.push('/login')}
                        >
                            Return to Login
                        </Button>
                    </div>
                </div>
                <div className="hidden lg:flex bg-gradient-to-br from-orange-400 to-red-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Left Side: The Form */}
            <div className="flex flex-col justify-center p-12 bg-white animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="w-full max-w-md mx-auto space-y-8">
                    {/* Logo & Header */}
                    <div>
                        <div className="flex items-center gap-2 mb-8">
                            <div className="h-8 w-8 bg-orange-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold">H</span>
                            </div>
                            <span className="text-xl font-bold text-gray-900">HEMS</span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create an account</h1>
                        <p className="text-gray-500 mt-2">Start your 14-day free trial.</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={onSignup} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-gray-700 font-medium">Full Name</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    placeholder="John Doe"
                                    required
                                    className="h-11 pl-10 bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500/20"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="companyName" className="text-gray-700 font-medium">Company Name</Label>
                            <div className="relative">
                                <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="companyName"
                                    name="companyName"
                                    placeholder="Acme Inc."
                                    required
                                    className="h-11 pl-10 bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500/20"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="name@company.com"
                                    required
                                    className="h-11 pl-10 bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500/20"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    className="h-11 pl-10 bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500/20"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <Button
                            className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-sm transition-all"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Account"}
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500">Or continue with</span>
                        </div>
                    </div>

                    {/* Socials */}
                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="outline" className="h-11 border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.24.81-.6z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </Button>
                        <Button variant="outline" className="h-11 border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
                            <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            GitHub
                        </Button>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-sm text-gray-500">
                        Already have an account?{' '}
                        <Link href="/login" className="font-semibold text-orange-600 hover:text-orange-700">
                            Log in
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right Side: The Visual */}
            <div className="hidden lg:flex flex-col justify-center items-center p-12 bg-gradient-to-br from-orange-400 to-red-500 relative overflow-hidden">
                {/* Abstract Background Pattern */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                {/* Glassmorphism Card */}
                <div className="relative max-w-md bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 shadow-2xl text-white">
                    <p className="text-xl font-medium leading-relaxed mb-6">
                        "The most intuitive HR platform we've ever used. Onboarding used to take days, now it takes minutes."
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden border-2 border-white/50">
                            {/* Avatar Placeholder */}
                            <div className="w-full h-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold">M</div>
                        </div>
                        <div>
                            <h4 className="font-bold">Michael Chen</h4>
                            <p className="text-sm text-white/80">CTO at TechStart</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
