'use client'

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, Lock, CheckCircle, ArrowLeft, User, AlertCircle } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [checkingSession, setCheckingSession] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [activeTab, setActiveTab] = useState("login")
    const [prefillEmail, setPrefillEmail] = useState("")

    // Initialize tab from URL
    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab === 'signup') setActiveTab('signup')
    }, [searchParams])

    // Check for existing session on mount
    useEffect(() => {
        async function checkSession() {
            try {
                const { data: { session } } = await supabase.auth.getSession()

                if (session?.user) {
                    // User is already logged in, fetch role and redirect
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', session.user.id)
                        .single()

                    // Redirect based on role
                    if (profile?.role === 'HR_ADMIN') {
                        router.push('/dashboard')
                    } else if (profile?.role === 'EMPLOYEE') {
                        router.push('/dashboard/employee')
                    } else {
                        router.push('/onboarding')
                    }
                } else {
                    // No session, show login form
                    setCheckingSession(false)
                }
            } catch (err) {
                console.error('Session check error:', err)
                setCheckingSession(false)
            }
        }

        checkSession()
    }, [router, supabase])

    // Login Handler
    async function onLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const email = formData.get("email") as string
        const password = formData.get("password") as string

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (signInError) throw signInError

            // Check Role & Redirect
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                router.refresh()

                if (profile?.role === 'HR_ADMIN') router.push('/dashboard')
                else if (profile?.role === 'EMPLOYEE') router.push('/dashboard/employee')
                else router.push('/onboarding')
            }
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    // Signup Handler with Pre-Check for Existing Users
    async function onSignup(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccess(false)

        const formData = new FormData(e.currentTarget)
        const email = formData.get("email") as string
        const password = formData.get("password") as string
        const fullName = formData.get("fullName") as string

        try {
            // Pre-check: Try to query if user exists in profiles table
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('email')
                .eq('email', email)
                .maybeSingle()

            if (existingProfile) {
                // User already exists - switch to login tab
                setPrefillEmail(email)
                setActiveTab('login')
                setError('This email is already registered. Please log in instead.')
                setLoading(false)
                return
            }

            // User doesn't exist, proceed with signup
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName }
                }
            })

            if (signUpError) {
                // Fallback: Check for duplicate user errors
                const isDuplicate = signUpError.message.toLowerCase().includes('already registered') ||
                    signUpError.message.toLowerCase().includes('user already exists') ||
                    signUpError.message.toLowerCase().includes('email already in use')

                if (isDuplicate) {
                    setPrefillEmail(email)
                    setActiveTab('login')
                    setError('This email is already registered. Please log in instead.')
                    setLoading(false)
                    return
                }

                throw signUpError
            }

            // Success! Show verification message
            setSuccess(true)
            setLoading(false)
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    // Show loading spinner while checking session
    if (checkingSession) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F8F9FC]">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-hems-primary mx-auto" />
                    <p className="text-gray-500 text-sm">Checking session...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC] p-4">
            <div className="w-full max-w-md">

                {/* Success State (Verification Sent) */}
                {success ? (
                    <div className="bg-white rounded-2xl p-8 shadow-xl shadow-purple-500/10 border border-gray-100">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="h-16 w-16 rounded-full bg-green-50 flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-semibold text-gray-900">Verification Link Sent</h2>
                                <p className="text-gray-500 text-sm max-w-xs mx-auto">
                                    We've sent a confirmation link to your email. Please verify your account before logging in.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                className="border-gray-200 text-gray-600 hover:border-hems-primary hover:text-hems-primary w-full"
                                onClick={() => {
                                    setSuccess(false)
                                    setActiveTab("login")
                                }}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                            </Button>
                        </div>
                    </div>
                ) : (

                    /* Forms State */
                    <div className="bg-white rounded-2xl p-8 shadow-xl shadow-purple-500/10 border border-gray-100">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-[#49225B]">HEMS Portal</h1>
                            <p className="text-gray-500 mt-2">Welcome back! Please sign in to continue.</p>
                        </div>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-gray-100 mb-6 p-1 h-11">
                                <TabsTrigger
                                    value="login"
                                    className="data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600 transition-all"
                                >
                                    Login
                                </TabsTrigger>
                                <TabsTrigger
                                    value="signup"
                                    className="data-[state=active]:bg-white data-[state=active]:text-gray-900 text-gray-600 transition-all"
                                >
                                    Sign Up
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="login">
                                <form onSubmit={onLogin} className="space-y-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-gray-700 text-sm font-medium">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="email"
                                                name="email"
                                                type="email"
                                                placeholder="name@company.com"
                                                defaultValue={prefillEmail}
                                                required
                                                className="bg-gray-50 border-gray-200 focus:border-hems-primary focus:ring-2 focus:ring-purple-100 rounded-lg p-3 pl-10 w-full transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="password" className="text-gray-700 text-sm font-medium">Password</Label>
                                            <a href="#" className="text-xs text-hems-primary hover:text-hems-primary/80 transition-colors">Forgot?</a>
                                        </div>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="password"
                                                name="password"
                                                type="password"
                                                placeholder="••••••••"
                                                required
                                                className="bg-gray-50 border-gray-200 focus:border-hems-primary focus:ring-2 focus:ring-purple-100 rounded-lg p-3 pl-10 w-full transition-all"
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
                                        className="w-full bg-hems-primary text-white font-semibold py-3 rounded-lg hover:bg-hems-primary/90 transition-transform active:scale-95"
                                        disabled={loading}
                                    >
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="signup">
                                <form onSubmit={onSignup} className="space-y-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName" className="text-gray-700 text-sm font-medium">Full Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="fullName"
                                                name="fullName"
                                                placeholder="John Doe"
                                                required
                                                className="bg-gray-50 border-gray-200 focus:border-hems-primary focus:ring-2 focus:ring-purple-100 rounded-lg p-3 pl-10 w-full transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sign-email" className="text-gray-700 text-sm font-medium">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="sign-email"
                                                name="email"
                                                type="email"
                                                placeholder="name@company.com"
                                                required
                                                className="bg-gray-50 border-gray-200 focus:border-hems-primary focus:ring-2 focus:ring-purple-100 rounded-lg p-3 pl-10 w-full transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sign-password" className="text-gray-700 text-sm font-medium">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="sign-password"
                                                name="password"
                                                type="password"
                                                required
                                                className="bg-gray-50 border-gray-200 focus:border-hems-primary focus:ring-2 focus:ring-purple-100 rounded-lg p-3 pl-10 w-full transition-all"
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
                                        className="w-full bg-hems-primary text-white font-semibold py-3 rounded-lg hover:bg-hems-primary/90 transition-transform active:scale-95"
                                        disabled={loading}
                                    >
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Account"}
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </div>
        </div>
    )
}
