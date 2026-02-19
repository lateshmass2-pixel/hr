import { SettingsForm } from "./settings-form"
import { Settings, Sparkles, Shield, Clock, AlertTriangle } from "lucide-react"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHero } from "@/components/layout/PageHero"
import { Card } from "@/components/ui/card"

export default function SettingsPage() {
    return (
        <PageContainer>
            <PageHero
                title="Settings"
                subtitle="Manage your account settings and preferences"
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Settings Form - Takes 2 columns */}
                <div className="lg:col-span-2">
                    <SettingsForm />
                </div>

                {/* Quick Info Sidebar */}
                <div className="space-y-6">
                    {/* Security Status Card */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                                <Shield className="w-5 h-5 text-white" />
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
                    </Card>

                    {/* Time Tracking Card */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-[#6b6b6b]">Account Age</span>
                            <span className="text-xs text-[#e07850] font-medium bg-[#e07850]/10 px-2 py-1 rounded-full">Active</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-5 h-5 text-[#14532d]" />
                            <p className="text-2xl font-bold text-[#1a1a1a]">-</p>
                        </div>
                        <p className="text-sm text-[#6b6b6b]">108 hours, 23 minutes</p>
                        <div className="mt-4 h-1 bg-[#e8e4e0] rounded-full overflow-hidden">
                            <div className="h-full w-2/3 bg-gradient-to-r from-[#e07850] to-[#d45a3a] rounded-full" />
                        </div>
                    </Card>

                    {/* Quick Tips */}
                    <Card className="bg-[#1a1a1a] border-none shadow-lg text-white">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#e07850]" />
                            Security Tips
                        </h4>
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
                    </Card>
                </div>
            </div>
        </PageContainer>
    )
}
