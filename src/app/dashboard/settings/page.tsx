'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Building2, CreditCard, Bell, Camera, Save } from 'lucide-react'

type TabType = 'profile' | 'organization' | 'billing' | 'notifications'

interface TabItem {
    id: TabType
    label: string
    icon: React.ElementType
}

const tabs: TabItem[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
]

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('profile')

    // Form state
    const [formData, setFormData] = useState({
        fullName: 'John Doe',
        email: 'john.doe@company.com',
        jobTitle: 'HR Manager',
        department: 'Human Resources',
        bio: 'Experienced HR professional with 10+ years in talent acquisition and employee development.',
    })

    function handleInputChange(field: string, value: string) {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    function handleSave() {
        alert('Settings saved successfully!')
    }

    function getInitials(name: string) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
                <p className="text-gray-500 text-sm mt-1">Manage your account preferences and settings</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-8">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex items-center gap-2 pb-4 text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? 'text-orange-600'
                                    : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="settings-tab-indicator"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
                                />
                            )}
                        </button>
                    ))}
                </nav>
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
                    {activeTab === 'profile' && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            {/* Avatar Section */}
                            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-100">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white text-3xl font-bold">
                                        {getInitials(formData.fullName)}
                                    </div>
                                    <button className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors">
                                        <Camera size={14} className="text-gray-600" />
                                    </button>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{formData.fullName}</h3>
                                    <p className="text-sm text-gray-500">{formData.jobTitle}</p>
                                    <button className="mt-2 text-sm text-orange-600 font-medium hover:underline">
                                        Change Photo
                                    </button>
                                </div>
                            </div>

                            {/* Form Grid */}
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Full Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.fullName}
                                            onChange={e => handleInputChange('fullName', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={e => handleInputChange('email', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>

                                    {/* Job Title */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Job Title
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.jobTitle}
                                            onChange={e => handleInputChange('jobTitle', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>

                                    {/* Department */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Department
                                        </label>
                                        <select
                                            value={formData.department}
                                            onChange={e => handleInputChange('department', e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                                        >
                                            <option value="Human Resources">Human Resources</option>
                                            <option value="Engineering">Engineering</option>
                                            <option value="Design">Design</option>
                                            <option value="Marketing">Marketing</option>
                                            <option value="Finance">Finance</option>
                                            <option value="Operations">Operations</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Bio */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Bio
                                    </label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={e => handleInputChange('bio', e.target.value)}
                                        rows={4}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                                        placeholder="Tell us a bit about yourself..."
                                    />
                                    <p className="mt-1 text-xs text-gray-500">{formData.bio.length}/500 characters</p>
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="flex justify-end mt-8 pt-6 border-t border-gray-100">
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors shadow-sm"
                                >
                                    <Save size={18} />
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'organization' && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Settings</h3>
                            <p className="text-gray-500">Manage your organization's details, branding, and preferences.</p>
                            <div className="mt-6 p-8 border-2 border-dashed border-gray-200 rounded-xl text-center">
                                <Building2 className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-500">Organization settings coming soon</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing & Plans</h3>
                            <p className="text-gray-500">Manage your subscription, payment methods, and billing history.</p>
                            <div className="mt-6 p-8 border-2 border-dashed border-gray-200 rounded-xl text-center">
                                <CreditCard className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-500">Billing settings coming soon</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
                            <p className="text-gray-500">Control how and when you receive notifications.</p>

                            <div className="mt-6 space-y-4">
                                {[
                                    { label: 'Email Notifications', desc: 'Receive updates via email' },
                                    { label: 'Push Notifications', desc: 'Get browser push notifications' },
                                    { label: 'Leave Approvals', desc: 'Notify when leave requests need approval' },
                                    { label: 'New Applications', desc: 'Alert when new candidates apply' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-gray-900">{item.label}</h4>
                                            <p className="text-sm text-gray-500">{item.desc}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" defaultChecked className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors shadow-sm"
                                >
                                    <Save size={18} />
                                    Save Preferences
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
