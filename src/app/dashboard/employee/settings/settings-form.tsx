'use client'

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, KeyRound, CheckCircle2, Shield, Eye, EyeOff, Lock, RefreshCw } from "lucide-react"

export function SettingsForm() {
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = e.currentTarget
        setLoading(true)
        setMessage(null)

        const formData = new FormData(form)
        const password = formData.get('password') as string
        const confirmPassword = formData.get('confirmPassword') as string

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: "Passwords don't match" })
            setLoading(false)
            return
        }

        if (password.length < 6) {
            setMessage({ type: 'error', text: "Password must be at least 6 characters" })
            setLoading(false)
            return
        }

        const supabase = createClient()
        const { data, error } = await supabase.auth.updateUser({ password })

        if (error) {
            setMessage({ type: 'error', text: error.message })
        } else {
            setMessage({ type: 'success', text: "Password updated successfully" })
            form.reset()
        }
        setLoading(false)
    }

    return (
        <div className="bg-white rounded-3xl shadow-md border border-[#E2E8F0] overflow-hidden hover:shadow-lg transition-shadow">
            {/* Card Header */}
            <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0A3B2A] to-[#064e3b] flex items-center justify-center shadow-md">
                        <KeyRound className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-[#0F172A]">Change Password</h3>
                        <p className="text-[#475569] text-sm">
                            Update your password to keep your account secure
                        </p>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 bg-[#F1F5F9] rounded-full px-4 py-2">
                    <Shield className="w-4 h-4 text-[#0A3B2A]" />
                    <span className="text-sm font-medium text-[#0F172A]">Secure</span>
                </div>
            </div>

            {/* Card Body */}
            <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Password Strength Indicator */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* New Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-[#0F172A] font-medium flex items-center gap-2">
                                <Lock className="w-4 h-4 text-[#475569]" />
                                New Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="••••••••"
                                    className="bg-[#FAFCF8] border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8] focus:ring-[#0A3B2A]/30 focus:border-[#0A3B2A] rounded-xl h-12 pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#0F172A] transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-[#0F172A] font-medium flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 text-[#475569]" />
                                Confirm Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    placeholder="••••••••"
                                    className="bg-[#FAFCF8] border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8] focus:ring-[#0A3B2A]/30 focus:border-[#0A3B2A] rounded-xl h-12 pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#0F172A] transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Message Display */}
                    {message && (
                        <div className={`p-4 rounded-2xl text-sm flex items-center gap-3 ${message.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            {message.type === 'success' && <CheckCircle2 className="h-5 w-5" />}
                            {message.type === 'error' && (
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            )}
                            <span className="font-medium">{message.text}</span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-4 pt-2">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-gradient-to-r from-[#0A3B2A] to-[#064e3b] hover:from-[#064e3b] hover:to-[#022c22] text-white rounded-full px-8 py-3 h-12 font-semibold shadow-lg hover:shadow-xl transition-all"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Updating...
                                </>
                            ) : (
                                <>
                                    Update Password
                                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </>
                            )}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] rounded-full px-8 py-3 h-12 font-medium"
                            onClick={() => {
                                const form = document.querySelector('form')
                                form?.reset()
                                setMessage(null)
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </div>

            {/* Card Footer - Security Info */}
            <div className="px-6 py-4 bg-[#FAFCF8] border-t border-[#E2E8F0]">
                <div className="flex items-center gap-4 text-sm text-[#475569]">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>256-bit encryption</span>
                    </div>
                    <div className="w-px h-4 bg-[#E2E8F0]" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#0A3B2A]" />
                        <span>Last updated: Never</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
