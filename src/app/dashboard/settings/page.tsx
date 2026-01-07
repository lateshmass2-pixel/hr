'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    User, Bell, Shield, CreditCard, Camera, Mail, Lock,
    Smartphone, Download, Check, Eye, EyeOff
} from 'lucide-react'

type TabType = 'profile' | 'notifications' | 'security' | 'billing'

// Toggle Switch Component
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-orange-500' : 'bg-gray-300'
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
            alert('✅ Settings updated successfully!')
        }, 1000)
    }

    function getInitials(name: string) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase()
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
                <p className="text-gray-500 text-sm mt-1">Manage your profile, preferences, and security</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <div className="flex gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === tab.id
                                ? 'text-orange-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="settings-tab-indicator"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
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
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            {/* Cover + Avatar */}
                            <div className="h-24 bg-gradient-to-r from-orange-400 to-red-400 relative">
                                <div className="absolute -bottom-12 left-6">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-500 border-4 border-white flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                            {getInitials(profile.fullName)}
                                        </div>
                                        <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center hover:bg-gray-50 transition-colors">
                                            <Camera size={14} className="text-gray-600" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-16 p-6">
                                <button className="text-sm text-orange-600 font-medium hover:text-orange-700 mb-6">
                                    Change Photo
                                </button>

                                {/* Form Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                        <input
                                            type="text"
                                            value={profile.fullName}
                                            onChange={(e) => setProfile(p => ({ ...p, fullName: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Work Email
                                            <span className="text-xs text-gray-400 ml-2">(Managed by IT)</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={profile.email}
                                            disabled
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                                        <input
                                            type="text"
                                            value={profile.role}
                                            onChange={(e) => setProfile(p => ({ ...p, role: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                                        <select
                                            value={profile.department}
                                            onChange={(e) => setProfile(p => ({ ...p, department: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
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
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                                    <textarea
                                        value={profile.bio}
                                        onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                                        rows={3}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                                    />
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
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
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h2>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-gray-900">Email Alerts</h3>
                                        <p className="text-sm text-gray-500">Receive daily summaries of activity</p>
                                    </div>
                                    <Toggle
                                        enabled={notifications.emailAlerts}
                                        onChange={(val) => setNotifications(n => ({ ...n, emailAlerts: val }))}
                                    />
                                </div>

                                <div className="border-t border-gray-100 pt-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-gray-900">Candidate Updates</h3>
                                        <p className="text-sm text-gray-500">When a candidate accepts an offer</p>
                                    </div>
                                    <Toggle
                                        enabled={notifications.candidateUpdates}
                                        onChange={(val) => setNotifications(n => ({ ...n, candidateUpdates: val }))}
                                    />
                                </div>

                                <div className="border-t border-gray-100 pt-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-gray-900">Mentions</h3>
                                        <p className="text-sm text-gray-500">When someone mentions me in a comment</p>
                                    </div>
                                    <Toggle
                                        enabled={notifications.mentions}
                                        onChange={(val) => setNotifications(n => ({ ...n, mentions: val }))}
                                    />
                                </div>

                                <div className="border-t border-gray-100 pt-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-gray-900">Weekly Digest</h3>
                                        <p className="text-sm text-gray-500">Summary of hiring activity every Monday</p>
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
                                className="mt-8 px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Preferences'}
                            </button>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            {/* Change Password */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                                    <Lock size={18} className="text-gray-500" />
                                    Change Password
                                </h2>

                                <div className="space-y-4 max-w-md">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-10"
                                            />
                                            <button
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>
                                    <button className="px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors">
                                        Update Password
                                    </button>
                                </div>
                            </div>

                            {/* 2FA */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Smartphone size={18} className="text-gray-500" />
                                    Two-Factor Authentication
                                </h2>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium text-gray-900">2FA is currently OFF</p>
                                        <p className="text-sm text-gray-500">Add extra security to your account</p>
                                    </div>
                                    <button className="px-4 py-2 border border-orange-300 text-orange-600 rounded-lg font-medium hover:bg-orange-50 transition-colors">
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
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>

                                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-900 text-lg">Pro Plan</h3>
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">Active</span>
                                        </div>
                                        <p className="text-gray-600">$19/user/month • 10 users</p>
                                    </div>
                                    <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                                        Upgrade Plan
                                    </button>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>

                                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center text-white text-xs font-bold">
                                            VISA
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">•••• •••• •••• 4242</p>
                                            <p className="text-sm text-gray-500">Expires 12/2027</p>
                                        </div>
                                    </div>
                                    <button className="text-sm text-orange-600 font-medium hover:text-orange-700">
                                        Edit
                                    </button>
                                </div>
                            </div>

                            {/* Invoice History */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice History</h2>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-100">
                                                <th className="text-left py-3 font-medium text-gray-500">Date</th>
                                                <th className="text-left py-3 font-medium text-gray-500">Amount</th>
                                                <th className="text-left py-3 font-medium text-gray-500">Status</th>
                                                <th className="text-right py-3 font-medium text-gray-500">Invoice</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            <tr>
                                                <td className="py-3 text-gray-900">Jan 01, 2026</td>
                                                <td className="py-3 text-gray-900 font-medium">$190.00</td>
                                                <td className="py-3">
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">Paid</span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <button className="text-orange-600 hover:text-orange-700 flex items-center gap-1 ml-auto">
                                                        <Download size={14} />
                                                        PDF
                                                    </button>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 text-gray-900">Dec 01, 2025</td>
                                                <td className="py-3 text-gray-900 font-medium">$190.00</td>
                                                <td className="py-3">
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">Paid</span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <button className="text-orange-600 hover:text-orange-700 flex items-center gap-1 ml-auto">
                                                        <Download size={14} />
                                                        PDF
                                                    </button>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="py-3 text-gray-900">Nov 01, 2025</td>
                                                <td className="py-3 text-gray-900 font-medium">$190.00</td>
                                                <td className="py-3">
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">Paid</span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <button className="text-orange-600 hover:text-orange-700 flex items-center gap-1 ml-auto">
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
