'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    User, Bell, Shield, CreditCard, Camera, Mail, Lock,
    Smartphone, Download, Check, Eye, EyeOff, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

type TabType = 'profile' | 'notifications' | 'security' | 'billing'

// Toggle Switch Component
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-gradient-to-r from-[#e07850] to-[#d45a3a]' : 'bg-[#e8e4e0]'
                }`}
        >
            <motion.div
                animate={{ x: enabled ? 22 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
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
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center shadow-lg">
                        <User className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-[#1a1a1a]">Account Settings</h1>
                        <p className="text-[#6b6b6b] text-sm mt-1">Manage your profile, preferences, and security</p>
                    </div>
                </div>

                {/* Help Bubble */}
                <div className="hidden md:flex items-center gap-2 bg-white rounded-full px-5 py-3 shadow-md border border-[#e8e4e0]">
                    <Sparkles className="w-5 h-5 text-[#e07850]" />
                    <span className="text-[#1a1a1a] font-medium">Hey, Need help?</span>
                    <span className="text-2xl">👋</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-[#e8e4e0] mb-6">
                <div className="flex gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === tab.id
                                ? 'text-[#e07850]'
                                : 'text-[#a0a0a0] hover:text-[#1a1a1a]'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="settings-tab-indicator"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e07850]"
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
                        <div className="bg-white rounded-3xl border border-[#e8e4e0] shadow-md overflow-hidden">
                            {/* Cover + Avatar */}
                            <div className="h-24 bg-gradient-to-r from-[#e07850] to-[#d45a3a] relative">
                                <div className="absolute -bottom-12 left-6">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#e07850] to-[#d45a3a] border-4 border-white flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                            {getInitials(profile.fullName)}
                                        </div>
                                        <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border border-[#e8e4e0] shadow flex items-center justify-center hover:bg-[#faf8f5] transition-colors">
                                            <Camera size={14} className="text-[#6b6b6b]" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-16 p-6">
                                <button className="text-sm text-[#e07850] font-medium hover:text-[#d45a3a] mb-6">
                                    Change Photo
                                </button>

                                {/* Form Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-[#1a1a1a] mb-2">Full Name</label>
                                        <input
                                            type="text"
                                            value={profile.fullName}
                                            onChange={(e) => setProfile(p => ({ ...p, fullName: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#faf8f5] border border-[#e8e4e0] rounded-xl text-[#1a1a1a] focus:ring-2 focus:ring-[#e07850]/20 focus:border-[#e07850]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#1a1a1a] mb-2">
                                            Work Email
                                            <span className="text-xs text-[#a0a0a0] ml-2">(Managed by IT)</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={profile.email}
                                            disabled
                                            className="w-full px-4 py-2.5 bg-[#f5f3f0] border border-[#e8e4e0] rounded-xl text-[#a0a0a0] cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#1a1a1a] mb-2">Job Title</label>
                                        <input
                                            type="text"
                                            value={profile.role}
                                            onChange={(e) => setProfile(p => ({ ...p, role: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#faf8f5] border border-[#e8e4e0] rounded-xl text-[#1a1a1a] focus:ring-2 focus:ring-[#e07850]/20 focus:border-[#e07850]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#1a1a1a] mb-2">Department</label>
                                        <select
                                            value={profile.department}
                                            onChange={(e) => setProfile(p => ({ ...p, department: e.target.value }))}
                                            className="w-full px-4 py-2.5 bg-[#faf8f5] border border-[#e8e4e0] rounded-xl text-[#1a1a1a] focus:ring-2 focus:ring-[#e07850]/20 focus:border-[#e07850]"
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

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-[#1a1a1a] mb-2">Bio</label>
                                    <textarea
                                        value={profile.bio}
                                        onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                                        rows={3}
                                        className="w-full px-4 py-2.5 bg-[#faf8f5] border border-[#e8e4e0] rounded-xl text-[#1a1a1a] focus:ring-2 focus:ring-[#e07850]/20 focus:border-[#e07850] resize-none"
                                    />
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-gradient-to-r from-[#e07850] to-[#d45a3a] text-white rounded-full font-medium hover:from-[#d45a3a] hover:to-[#c04a2a] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md"
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
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <div className="bg-white rounded-3xl border border-[#e8e4e0] shadow-md p-6">
                            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-6">Notification Preferences</h2>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-[#1a1a1a]">Email Alerts</h3>
                                        <p className="text-sm text-[#6b6b6b]">Receive daily summaries of activity</p>
                                    </div>
                                    <Toggle
                                        enabled={notifications.emailAlerts}
                                        onChange={(val) => setNotifications(n => ({ ...n, emailAlerts: val }))}
                                    />
                                </div>

                                <div className="border-t border-[#e8e4e0] pt-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-[#1a1a1a]">Candidate Updates</h3>
                                        <p className="text-sm text-[#6b6b6b]">When a candidate accepts an offer</p>
                                    </div>
                                    <Toggle
                                        enabled={notifications.candidateUpdates}
                                        onChange={(val) => setNotifications(n => ({ ...n, candidateUpdates: val }))}
                                    />
                                </div>

                                <div className="border-t border-[#e8e4e0] pt-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-[#1a1a1a]">Mentions</h3>
                                        <p className="text-sm text-[#6b6b6b]">When someone mentions me in a comment</p>
                                    </div>
                                    <Toggle
                                        enabled={notifications.mentions}
                                        onChange={(val) => setNotifications(n => ({ ...n, mentions: val }))}
                                    />
                                </div>

                                <div className="border-t border-[#e8e4e0] pt-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-[#1a1a1a]">Weekly Digest</h3>
                                        <p className="text-sm text-[#6b6b6b]">Summary of hiring activity every Monday</p>
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
                                className="mt-8 px-6 py-2.5 bg-gradient-to-r from-[#e07850] to-[#d45a3a] text-white rounded-full font-medium hover:from-[#d45a3a] hover:to-[#c04a2a] transition-colors disabled:opacity-50 shadow-md"
                            >
                                {saving ? 'Saving...' : 'Save Preferences'}
                            </button>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            {/* Change Password */}
                            <div className="bg-white rounded-3xl border border-[#e8e4e0] shadow-md p-6">
                                <h2 className="text-lg font-semibold text-[#1a1a1a] mb-6 flex items-center gap-2">
                                    <Lock size={18} className="text-[#e07850]" />
                                    Change Password
                                </h2>

                                <div className="space-y-4 max-w-md">
                                    <div>
                                        <label className="block text-sm font-medium text-[#1a1a1a] mb-2">Current Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                className="w-full px-4 py-2.5 bg-[#faf8f5] border border-[#e8e4e0] rounded-xl text-[#1a1a1a] focus:ring-2 focus:ring-[#e07850]/20 focus:border-[#e07850] pr-10 placeholder-[#a0a0a0]"
                                            />
                                            <button
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0a0] hover:text-[#1a1a1a]"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#1a1a1a] mb-2">New Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full px-4 py-2.5 bg-[#faf8f5] border border-[#e8e4e0] rounded-xl text-[#1a1a1a] focus:ring-2 focus:ring-[#e07850]/20 focus:border-[#e07850] placeholder-[#a0a0a0]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#1a1a1a] mb-2">Confirm New Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full px-4 py-2.5 bg-[#faf8f5] border border-[#e8e4e0] rounded-xl text-[#1a1a1a] focus:ring-2 focus:ring-[#e07850]/20 focus:border-[#e07850] placeholder-[#a0a0a0]"
                                        />
                                    </div>
                                    <button className="px-6 py-2.5 bg-gradient-to-r from-[#e07850] to-[#d45a3a] text-white rounded-full font-medium hover:from-[#d45a3a] hover:to-[#c04a2a] transition-colors shadow-md">
                                        Update Password
                                    </button>
                                </div>
                            </div>

                            {/* 2FA */}
                            <div className="bg-white rounded-3xl border border-[#e8e4e0] shadow-md p-6">
                                <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 flex items-center gap-2">
                                    <Smartphone size={18} className="text-[#e07850]" />
                                    Two-Factor Authentication
                                </h2>

                                <div className="flex items-center justify-between p-4 bg-[#faf8f5] rounded-2xl border border-[#e8e4e0]">
                                    <div>
                                        <p className="font-medium text-[#1a1a1a]">2FA is currently OFF</p>
                                        <p className="text-sm text-[#6b6b6b]">Add extra security to your account</p>
                                    </div>
                                    <button className="px-4 py-2 border border-[#e07850]/50 text-[#e07850] rounded-full font-medium hover:bg-[#e07850]/10 transition-colors">
                                        Enable 2FA
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Billing Tab */}
                    {activeTab === 'billing' && (
                        <div className="space-y-6">
                            {/* Current Plan */}
                            <div className="bg-white rounded-3xl border border-[#e8e4e0] shadow-md p-6">
                                <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Current Plan</h2>

                                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#e07850]/10 to-[#d45a3a]/10 rounded-2xl border border-[#e07850]/20">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-[#1a1a1a] text-lg">Pro Plan</h3>
                                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">Active</span>
                                        </div>
                                        <p className="text-[#6b6b6b]">$19/user/month • 10 users</p>
                                    </div>
                                    <button className="px-4 py-2 border border-[#e8e4e0] text-[#6b6b6b] rounded-full font-medium hover:bg-[#faf8f5] transition-colors">
                                        Upgrade Plan
                                    </button>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="bg-white rounded-3xl border border-[#e8e4e0] shadow-md p-6">
                                <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Payment Method</h2>

                                <div className="flex items-center justify-between p-4 border border-[#e8e4e0] rounded-2xl bg-[#faf8f5]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center text-white text-xs font-bold">
                                            VISA
                                        </div>
                                        <div>
                                            <p className="font-medium text-[#1a1a1a]">•••• •••• •••• 4242</p>
                                            <p className="text-sm text-[#a0a0a0]">Expires 12/2027</p>
                                        </div>
                                    </div>
                                    <button className="text-sm text-[#e07850] font-medium hover:text-[#d45a3a]">
                                        Edit
                                    </button>
                                </div>
                            </div>

                            {/* Invoice History */}
                            <div className="bg-white rounded-3xl border border-[#e8e4e0] shadow-md p-6">
                                <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">Invoice History</h2>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[#e8e4e0]">
                                                <th className="text-left py-3 font-medium text-[#6b6b6b]">Date</th>
                                                <th className="text-left py-3 font-medium text-[#6b6b6b]">Amount</th>
                                                <th className="text-left py-3 font-medium text-[#6b6b6b]">Status</th>
                                                <th className="text-right py-3 font-medium text-[#6b6b6b]">Invoice</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#e8e4e0]">
                                            <tr className="hover:bg-[#faf8f5] transition-colors">
                                                <td className="py-3 text-[#1a1a1a]">Jan 01, 2026</td>
                                                <td className="py-3 text-[#1a1a1a] font-medium">$190.00</td>
                                                <td className="py-3">
                                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">Paid</span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <button className="text-[#e07850] hover:text-[#d45a3a] flex items-center gap-1 ml-auto">
                                                        <Download size={14} />
                                                        PDF
                                                    </button>
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-[#faf8f5] transition-colors">
                                                <td className="py-3 text-[#1a1a1a]">Dec 01, 2025</td>
                                                <td className="py-3 text-[#1a1a1a] font-medium">$190.00</td>
                                                <td className="py-3">
                                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">Paid</span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <button className="text-[#e07850] hover:text-[#d45a3a] flex items-center gap-1 ml-auto">
                                                        <Download size={14} />
                                                        PDF
                                                    </button>
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-[#faf8f5] transition-colors">
                                                <td className="py-3 text-[#1a1a1a]">Nov 01, 2025</td>
                                                <td className="py-3 text-[#1a1a1a] font-medium">$190.00</td>
                                                <td className="py-3">
                                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">Paid</span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <button className="text-[#e07850] hover:text-[#d45a3a] flex items-center gap-1 ml-auto">
                                                        <Download size={14} />
                                                        PDF
                                                    </button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
