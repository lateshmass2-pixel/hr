'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    User, Bell, Shield, CreditCard, Camera, Mail, Lock,
    Smartphone, Download, Check, Eye, EyeOff, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHero } from '@/components/layout/PageHero'
import { Card } from '@/components/ui/card'
import { theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

type TabType = 'profile' | 'notifications' | 'security' | 'billing'

// Toggle Switch Component
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!enabled)}
            className={cn(
                "relative w-11 h-6 rounded-full transition-colors",
                enabled ? "bg-[#14532d]" : "bg-slate-200"
            )}
        >
            <motion.div
                animate={{ x: enabled ? 20 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
            />
        </button>
    )
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('profile')
    const [showPassword, setShowPassword] = useState(false)
    const [saving, setSaving] = useState(false)

    // Profile Form State
    const [profile, setProfile] = useState({
        fullName: 'Alex Johnson',
        email: 'alex.johnson@company.com',
        role: 'HR Manager',
        department: 'HR',
        bio: 'Passionate about building great teams and fostering company culture. 5+ years in HR management.',
    })

    // Notification Settings
    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        candidateUpdates: true,
        mentions: true,
        weeklyDigest: false,
    })

    const tabs = [
        { id: 'profile' as const, label: 'My Profile', icon: User },
        { id: 'notifications' as const, label: 'Notifications', icon: Bell },
        { id: 'security' as const, label: 'Security', icon: Shield },
        { id: 'billing' as const, label: 'Billing & Plan', icon: CreditCard },
    ]

    function handleSave() {
        setSaving(true)
        setTimeout(() => {
            setSaving(false)
            toast.success('Settings updated successfully!')
        }, 1000)
    }

    function getInitials(name: string) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase()
    }

    return (
        <PageContainer>
            <PageHero
                title="Account Settings"
                subtitle="Manage your profile, preferences, and security settings."
            />

            {/* Tabs */}
            <div className="border-b border-green-100 mb-6 px-1">
                <div className="flex gap-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-1 py-3 text-sm font-medium transition-colors relative",
                                activeTab === tab.id
                                    ? "text-[#14532d]"
                                    : "text-slate-500 hover:text-[#14532d]"
                            )}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="settings-tab-indicator"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#14532d]"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <Card noPadding className="overflow-hidden">
                            {/* Cover + Avatar */}
                            <div className="h-32 bg-gradient-to-r from-[#14532d] to-[#166534] relative">
                                <div className="absolute -bottom-12 left-8">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#14532d] to-[#166534] border-4 border-white flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-1 ring-slate-100">
                                            {getInitials(profile.fullName)}
                                        </div>
                                        <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-[#f8faf6] transition-colors">
                                            <Camera size={14} className="text-slate-600" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-16 p-8">
                                <div className="flex justify-end mb-6">
                                    <button className="text-sm text-[#14532d] font-semibold hover:text-[#166534] hover:underline">
                                        Change Photo
                                    </button>
                                </div>

                                {/* Form Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-[#14532d] mb-2">Full Name</label>
                                        <input
                                            type="text"
                                            value={profile.fullName}
                                            onChange={(e) => setProfile(p => ({ ...p, fullName: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#f8faf6] border border-green-100 rounded-xl text-slate-800 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#14532d] mb-2">
                                            Work Email
                                            <span className="text-xs text-slate-400 ml-2">(Managed by IT)</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={profile.email}
                                            disabled
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#14532d] mb-2">Job Title</label>
                                        <input
                                            type="text"
                                            value={profile.role}
                                            onChange={(e) => setProfile(p => ({ ...p, role: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#f8faf6] border border-green-100 rounded-xl text-slate-800 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#14532d] mb-2">Department</label>
                                        <select
                                            value={profile.department}
                                            onChange={(e) => setProfile(p => ({ ...p, department: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#f8faf6] border border-green-100 rounded-xl text-slate-800 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none"
                                        >
                                            <option value="HR">Human Resources</option>
                                            <option value="Engineering">Engineering</option>
                                            <option value="Design">Design</option>
                                            <option value="Marketing">Marketing</option>
                                            <option value="Sales">Sales</option>
                                            <option value="Finance">Finance</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <label className="block text-sm font-medium text-[#14532d] mb-2">Bio</label>
                                    <textarea
                                        value={profile.bio}
                                        onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                                        rows={3}
                                        className="w-full px-4 py-2.5 bg-[#f8faf6] border border-green-100 rounded-xl text-slate-800 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none resize-none"
                                    />
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className={cn(theme.primaryButton, "px-8 py-2.5 rounded-full font-medium transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-green-900/10")}
                                >
                                    {saving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                            </div>
                        </Card>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <Card className="p-8">
                            <h2 className="text-xl font-bold text-[#14532d] mb-6">Notification Preferences</h2>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-slate-800">Email Alerts</h3>
                                        <p className="text-sm text-slate-500">Receive daily summaries of activity</p>
                                    </div>
                                    <Toggle
                                        enabled={notifications.emailAlerts}
                                        onChange={(val) => setNotifications(n => ({ ...n, emailAlerts: val }))}
                                    />
                                </div>

                                <div className="border-t border-green-50 pt-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-slate-800">Candidate Updates</h3>
                                        <p className="text-sm text-slate-500">When a candidate accepts an offer</p>
                                    </div>
                                    <Toggle
                                        enabled={notifications.candidateUpdates}
                                        onChange={(val) => setNotifications(n => ({ ...n, candidateUpdates: val }))}
                                    />
                                </div>

                                <div className="border-t border-green-50 pt-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-slate-800">Mentions</h3>
                                        <p className="text-sm text-slate-500">When someone mentions me in a comment</p>
                                    </div>
                                    <Toggle
                                        enabled={notifications.mentions}
                                        onChange={(val) => setNotifications(n => ({ ...n, mentions: val }))}
                                    />
                                </div>

                                <div className="border-t border-green-50 pt-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-slate-800">Weekly Digest</h3>
                                        <p className="text-sm text-slate-500">Summary of hiring activity every Monday</p>
                                    </div>
                                    <Toggle
                                        enabled={notifications.weeklyDigest}
                                        onChange={(val) => setNotifications(n => ({ ...n, weeklyDigest: val }))}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={cn(theme.primaryButton, "mt-10 px-8 py-2.5 rounded-full font-medium shadow-lg shadow-green-900/10 transition-transform active:scale-95 disabled:opacity-50")}
                            >
                                {saving ? 'Saving...' : 'Save Preferences'}
                            </button>
                        </Card>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            {/* Change Password */}
                            <Card className="p-8">
                                <h2 className="text-xl font-bold text-[#14532d] mb-6 flex items-center gap-2">
                                    <Lock size={20} className="text-green-600" />
                                    Change Password
                                </h2>

                                <div className="space-y-5 max-w-md">
                                    <div>
                                        <label className="block text-sm font-medium text-[#14532d] mb-2">Current Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                className="w-full px-4 py-2.5 bg-[#f8faf6] border border-green-100 rounded-xl text-slate-800 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 pr-10 outline-none"
                                            />
                                            <button
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#14532d]"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#14532d] mb-2">New Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full px-4 py-2.5 bg-[#f8faf6] border border-green-100 rounded-xl text-slate-800 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#14532d] mb-2">Confirm New Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full px-4 py-2.5 bg-[#f8faf6] border border-green-100 rounded-xl text-slate-800 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                                        />
                                    </div>
                                    <button className={cn(theme.primaryButton, "px-8 py-2.5 rounded-full font-medium shadow-lg shadow-green-900/10 transition-transform active:scale-95")}>
                                        Update Password
                                    </button>
                                </div>
                            </Card>

                            {/* 2FA */}
                            <Card className="p-8">
                                <h2 className="text-xl font-bold text-[#14532d] mb-4 flex items-center gap-2">
                                    <Smartphone size={20} className="text-green-600" />
                                    Two-Factor Authentication
                                </h2>

                                <div className="flex items-center justify-between p-5 bg-[#f8faf6] rounded-2xl border border-green-100">
                                    <div>
                                        <p className="font-semibold text-[#14532d]">2FA is currently OFF</p>
                                        <p className="text-sm text-slate-500">Add extra security to your account</p>
                                    </div>
                                    <button className="px-5 py-2 border border-green-200 text-green-700 rounded-full font-medium hover:bg-green-50 transition-colors bg-white shadow-sm">
                                        Enable 2FA
                                    </button>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Billing Tab */}
                    {activeTab === 'billing' && (
                        <div className="space-y-6">
                            {/* Current Plan */}
                            <Card className="p-8">
                                <h2 className="text-xl font-bold text-[#14532d] mb-4">Current Plan</h2>

                                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-[#f0fdf4] to-white rounded-2xl border border-green-100">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-[#14532d] text-lg">Pro Plan</h3>
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-200">Active</span>
                                        </div>
                                        <p className="text-slate-600">$19/user/month • 10 users</p>
                                    </div>
                                    <button className="px-5 py-2 border border-green-200 text-slate-600 rounded-full font-medium hover:bg-white transition-colors bg-[#f8faf6]">
                                        Upgrade Plan
                                    </button>
                                </div>
                            </Card>

                            {/* Payment Method */}
                            <Card className="p-8">
                                <h2 className="text-xl font-bold text-[#14532d] mb-4">Payment Method</h2>

                                <div className="flex items-center justify-between p-5 border border-green-100 rounded-2xl bg-[#f8faf6]">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-8 bg-[#14532d] rounded flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                            VISA
                                        </div>
                                        <div>
                                            <p className="font-semibold text-[#14532d]">•••• •••• •••• 4242</p>
                                            <p className="text-sm text-slate-500">Expires 12/2027</p>
                                        </div>
                                    </div>
                                    <button className="text-sm text-green-700 font-semibold hover:text-green-800 hover:underline">
                                        Edit
                                    </button>
                                </div>
                            </Card>

                            {/* Invoice History */}
                            <Card className="p-8">
                                <h2 className="text-xl font-bold text-[#14532d] mb-4">Invoice History</h2>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-green-100">
                                                <th className="text-left py-3 font-semibold text-green-800">Date</th>
                                                <th className="text-left py-3 font-semibold text-green-800">Amount</th>
                                                <th className="text-left py-3 font-semibold text-green-800">Status</th>
                                                <th className="text-right py-3 font-semibold text-green-800">Invoice</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-green-50">
                                            <tr className="hover:bg-[#f8faf6] transition-colors">
                                                <td className="py-3 text-slate-700">Jan 01, 2026</td>
                                                <td className="py-3 text-[#14532d] font-semibold">$190.00</td>
                                                <td className="py-3">
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-200">Paid</span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <button className="text-green-700 hover:text-green-800 flex items-center gap-1 ml-auto font-medium">
                                                        <Download size={14} />
                                                        PDF
                                                    </button>
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-[#f8faf6] transition-colors">
                                                <td className="py-3 text-slate-700">Dec 01, 2025</td>
                                                <td className="py-3 text-[#14532d] font-semibold">$190.00</td>
                                                <td className="py-3">
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-200">Paid</span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <button className="text-green-700 hover:text-green-800 flex items-center gap-1 ml-auto font-medium">
                                                        <Download size={14} />
                                                        PDF
                                                    </button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </PageContainer>
    )
}
