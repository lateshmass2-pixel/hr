import { SettingsForm } from "./settings-form"
import { Settings, Sparkles } from "lucide-react"

export default function SettingsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] via-[#f5f3f0] to-[#faf8f5] p-8">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center shadow-lg">
                        <Settings className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-[#1a1a1a]">Settings</h2>
                        <p className="text-[#6b6b6b] text-sm">
                            Manage your account settings and preferences
                        </p>
                    </div>
                </div>


            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Settings Form - Takes 2 columns */}
                <div className="lg:col-span-2">
                    <SettingsForm />
                </div>

                {/* Quick Info Sidebar */}
                <div className="space-y-6">
                    {/* Security Status Card */}
                    <div className="bg-white rounded-3xl p-6 shadow-md border border-[#e8e4e0] hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <span className="text-sm text-[#6b6b6b]">System Lock</span>
                        </div>
                        <div className="relative w-28 h-28 mx-auto mb-4">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="56" cy="56" r="48" fill="none" stroke="#e8e4e0" strokeWidth="8" />
                                <circle cx="56" cy="56" r="48" fill="none" stroke="#e07850" strokeWidth="8"
                                    strokeDasharray="301.6" strokeDashoffset="193" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-[#1a1a1a]">36%</span>
                                <span className="text-xs text-[#6b6b6b]">Growth rate</span>
                            </div>
                        </div>
                    </div>

                    {/* Time Tracking Card */}
                    <div className="bg-white rounded-3xl p-6 shadow-md border border-[#e8e4e0] hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-[#6b6b6b]">Account Age</span>
                            <span className="text-xs text-[#e07850] font-medium bg-[#e07850]/10 px-2 py-1 rounded-full">Active</span>
                        </div>
                        <p className="text-2xl font-bold text-[#1a1a1a]">13 Days</p>
                        <p className="text-sm text-[#6b6b6b]">108 hours, 23 minutes</p>
                        <div className="mt-4 h-1 bg-[#e8e4e0] rounded-full overflow-hidden">
                            <div className="h-full w-2/3 bg-gradient-to-r from-[#e07850] to-[#d45a3a] rounded-full" />
                        </div>
                    </div>

                    {/* Quick Tips */}
                    <div className="bg-[#1a1a1a] rounded-3xl p-6 shadow-lg">
                        <h4 className="text-white font-semibold mb-3">Security Tips</h4>
                        <ul className="space-y-2 text-sm text-zinc-400">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#e07850]" />
                                Use a strong, unique password
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#e07850]" />
                                Enable two-factor authentication
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#e07850]" />
                                Change password regularly
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
