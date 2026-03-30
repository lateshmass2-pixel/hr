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
                            <div className="w-12 h-12 rounded-full bg-[#0F172A] flex items-center justify-center">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-sm text-[#475569]">System Lock</span>
                        </div>
                        <div className="relative w-28 h-28 mx-auto mb-4">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="56" cy="56" r="48" fill="none" stroke="#E2E8F0" strokeWidth="8" />
                                <circle cx="56" cy="56" r="48" fill="none" stroke="#0A3B2A" strokeWidth="8"
                                    strokeDasharray="301.6" strokeDashoffset="193" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-[#0F172A]">36%</span>
                                <span className="text-xs text-[#475569]">Growth rate</span>
                            </div>
                        </div>
                    </Card>

                    {/* Time Tracking Card */}
                    <Card className="hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-[#475569]">Account Age</span>
                            <span className="text-xs text-[#0A3B2A] font-medium bg-[#0A3B2A]/10 px-2 py-1 rounded-full">Active</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-5 h-5 text-[#14532d]" />
                            <p className="text-2xl font-bold text-[#0F172A]">-</p>
                        </div>
                        <p className="text-sm text-[#475569]">108 hours, 23 minutes</p>
                        <div className="mt-4 h-1 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div className="h-full w-2/3 bg-gradient-to-r from-[#0A3B2A] to-[#064e3b] rounded-full" />
                        </div>
                    </Card>

                    {/* Quick Tips */}
                    <Card className="bg-[#0F172A] border-none shadow-lg text-white">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#0A3B2A]" />
                            Security Tips
                        </h4>
                        <ul className="space-y-2 text-sm text-zinc-400">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0A3B2A]" />
                                Use a strong, unique password
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0A3B2A]" />
                                Enable two-factor authentication
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0A3B2A]" />
                                Change password regularly
                            </li>
                        </ul>
                    </Card>
                </div>
            </div>
        </PageContainer>
    )
}
