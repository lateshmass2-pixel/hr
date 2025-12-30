'use client'

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

        console.log('Using Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
        const supabase = createClient()
        console.log('Sending update request...')
        const { data, error } = await supabase.auth.updateUser({ password })
        console.log('Update result:', { data, error })

        if (error) {
            setMessage({ type: 'error', text: error.message })
        } else {
            setMessage({ type: 'success', text: "Password updated successfully" })
            // Reset form
            form.reset()
        }
        setLoading(false)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5" /> Change Password
                </CardTitle>
                <CardDescription>
                    Update your password to keep your account secure.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                    <div className="space-y-2">
                        <Label htmlFor="password">New Password</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            required
                            placeholder="••••••••"
                        />
                    </div>

                    {message && (
                        <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${message.type === 'success'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            {message.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
                            {message.text}
                        </div>
                    )}

                    <Button type="submit" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                            </>
                        ) : (
                            'Update Password'
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
