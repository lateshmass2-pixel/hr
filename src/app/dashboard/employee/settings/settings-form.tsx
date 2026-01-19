'use client'

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react"

export function SettingsForm() {
    const [loading, setLoading] = useState(false)
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
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] shadow-lg overflow-hidden">
            <div className="p-6 border-b border-[#2a2a2a]">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <KeyRound className="h-5 w-5 text-violet-400" /> Change Password
                </h3>
                <p className="text-zinc-400 text-sm mt-1">
                    Update your password to keep your account secure.
                </p>
            </div>
            <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-zinc-300">New Password</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            placeholder="••••••••"
                            className="bg-[#0d0d0d] border-[#2a2a2a] text-white placeholder-zinc-500 focus:ring-violet-500/50 focus:border-violet-500/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-zinc-300">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            required
                            placeholder="••••••••"
                            className="bg-[#0d0d0d] border-[#2a2a2a] text-white placeholder-zinc-500 focus:ring-violet-500/50 focus:border-violet-500/50"
                        />
                    </div>

                    {message && (
                        <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${message.type === 'success'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                            {message.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
                            {message.text}
                        </div>
                    )}

                    <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-500 text-white">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                            </>
                        ) : (
                            'Update Password'
                        )}
                    </Button>
                </form>
            </div>
        </div>
    )
}
