'use client'

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, Lock, CheckCircle, ArrowLeft, User, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

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
            // This is a workaround since Supabase doesn't expose user existence directly
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
            <div className="flex min-h-screen items-center justify-center bg-black">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                    <p className="text-zinc-400 text-sm">Checking session...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black selection:bg-blue-500/30">

            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[120px]" />
            </div>

            <div className="relative z-10 w-full max-w-md px-4 animate-in fade-in zoom-in-95 duration-500">

                {/* Header */}
                <div className="text-center mb-8 space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-white">HEMS</h1>
                    <p className="text-zinc-400 text-sm">HR & Employee Management System</p>
                </div>

                {/* Success State (Verification Sent) */}
                {success ? (
                    <Card className="border-white/10 bg-zinc-900/50 backdrop-blur-xl shadow-2xl">
                        <CardContent className="pt-10 pb-10 flex flex-col items-center text-center space-y-6">
                            <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                                <CheckCircle className="h-10 w-10 text-green-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-semibold text-white">Verification Link Sent</h2>
                                <p className="text-zinc-400 text-sm max-w-xs mx-auto">
                                    We've sent a confirmation link to your email. Please verify your account before logging in.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                className="border-white/10 text-white hover:bg-white/5 hover:text-white w-full"
                                onClick={() => {
                                    setSuccess(false)
                                    setActiveTab("login")
                                }}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                            </Button>
                        </CardContent>
                    </Card>
                ) : (

                    /* Forms State */
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-zinc-900/50 backdrop-blur-md border border-white/5 mb-6 p-1 h-12">
                            <TabsTrigger
                                value="login"
                                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 h-10 transition-all"
                            >
                                Login
                            </TabsTrigger>
                            <TabsTrigger
                                value="signup"
                                className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 h-10 transition-all"
                            >
                                Sign Up
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="login" className="animate-in slide-in-from-left-2 duration-300">
                            <Card className="border-white/10 bg-zinc-900/50 backdrop-blur-md shadow-2xl">
                                <CardHeader>
                                    <CardTitle className="text-xl text-white">Welcome Back</CardTitle>
                                    <CardDescription className="text-zinc-500">Sign in to your account.</CardDescription>
                                </CardHeader>
                                <form onSubmit={onLogin}>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Email</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                                                <Input
                                                    id="email"
                                                    name="email"
                                                    type="email"
                                                    placeholder="name@company.com"
                                                    defaultValue={prefillEmail}
                                                    required
                                                    className="bg-black/50 border-white/10 text-white pl-10 focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-zinc-700"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="password" className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Password</Label>
                                                <a href="#" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Forgot?</a>
                                            </div>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                                                <Input
                                                    id="password"
                                                    name="password"
                                                    type="password"
                                                    placeholder="••••••••"
                                                    required
                                                    className="bg-black/50 border-white/10 text-white pl-10 focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-zinc-700"
                                                />
                                            </div>
                                        </div>
                                        {error && (
                                            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium animate-in fade-in flex items-start gap-2">
                                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                <span>{error}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full bg-[#0066FF] hover:bg-blue-600 text-white shadow-[#0066FF]/25 shadow-lg transition-all" disabled={loading}>
                                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </TabsContent>

                        <TabsContent value="signup" className="animate-in slide-in-from-right-2 duration-300">
                            <Card className="border-white/10 bg-zinc-900/50 backdrop-blur-md shadow-2xl">
                                <CardHeader>
                                    <CardTitle className="text-xl text-white">Create Account</CardTitle>
                                    <CardDescription className="text-zinc-500">Get started as an HR Admin.</CardDescription>
                                </CardHeader>
                                <form onSubmit={onSignup}>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="fullName" className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Full Name</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                                                <Input
                                                    id="fullName"
                                                    name="fullName"
                                                    placeholder="John Doe"
                                                    required
                                                    className="bg-black/50 border-white/10 text-white pl-10 focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-zinc-700"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="sign-email" className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Email</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                                                <Input
                                                    id="sign-email"
                                                    name="email"
                                                    type="email"
                                                    placeholder="name@company.com"
                                                    required
                                                    className="bg-black/50 border-white/10 text-white pl-10 focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-zinc-700"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="sign-password" className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Password</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                                                <Input
                                                    id="sign-password"
                                                    name="password"
                                                    type="password"
                                                    required
                                                    className="bg-black/50 border-white/10 text-white pl-10 focus:ring-blue-500/50 focus:border-blue-500 placeholder:text-zinc-700"
                                                />
                                            </div>
                                        </div>
                                        {error && (
                                            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium animate-in fade-in flex items-start gap-2">
                                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                <span>{error}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full bg-[#0066FF] hover:bg-blue-600 text-white shadow-[#0066FF]/25 shadow-lg transition-all" disabled={loading}>
                                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Account"}
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </div>
    )
}
