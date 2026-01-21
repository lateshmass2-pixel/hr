
import {
    LayoutDashboard, Users, FileText, CheckSquare, Settings,
    Calendar, CheckCircle2, HelpCircle, Search, Bell,
    Wallet, BarChart3, FolderKanban
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserNav } from "@/components/dashboard/user-nav";
import { NavLinkClient } from "../../components/dashboard/nav-link";
import { cn } from "@/lib/utils";
import { Inter } from "next/font/google";

const font = Inter({ subsets: ["latin"] });

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single();

    // Default to EMPLOYEE if no profile/role found to be safe
    const role = profile?.role || 'EMPLOYEE';
    const isHR = role === 'HR_ADMIN';
    const userName = profile?.full_name || user.user_metadata?.full_name || 'User';
    const userEmail = user.email || '';
    const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className={cn("flex min-h-screen bg-[#FAFAFA]", font.className)}>
            {/* Sidebar - Dark Mode (Linear Style) */}
            <aside className="w-64 bg-[#1C1C1C] hidden md:flex flex-col fixed h-full z-50 border-r border-[#2C2C2C] shadow-2xl">
                {/* Profile Header */}
                <div className="p-4 border-b border-[#2C2C2C]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center text-white font-medium text-xs border border-white/10">
                            {userInitials}
                        </div>
                        <div>
                            <p className="font-medium text-white text-sm tracking-tight">{userName}</p>
                            <p className="text-[11px] text-gray-400 tracking-tight">{isHR ? 'HR Administrator' : 'Team Member'}</p>
                        </div>
                    </div>
                </div>

                {/* Logo */}
                <div className="px-5 py-5">
                    <span className="text-sm font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        HEMS <span className="text-[10px] bg-[#2C2C2C] px-1.5 py-0.5 rounded text-gray-500 border border-[#3C3C3C]">v2.0</span>
                    </span>
                </div>

                {/* Main Navigation */}
                <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
                    {isHR ? (
                        <>
                            {/* WORKSPACE Section - HR */}
                            <div className="pb-2 pt-4 px-3">
                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                                    Workspace
                                </span>
                            </div>
                            <NavLinkClient href="/dashboard" icon={<LayoutDashboard size={20} />} label="Overview" />
                            <NavLinkClient href="/dashboard/projects" icon={<FolderKanban size={20} />} label="Projects" />
                            <NavLinkClient href="/dashboard/scout" icon={<Search size={20} />} label="Talent Scout" />
                            <NavLinkClient href="/dashboard/hiring" icon={<Users size={20} />} label="Generic Hiring" />
                            <NavLinkClient href="/dashboard/hired" icon={<CheckCircle2 size={20} />} label="Onboarded" />

                            {/* PEOPLE Section - HR */}
                            <div className="pt-6 pb-2 px-3">
                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                                    People
                                </span>
                            </div>
                            <NavLinkClient href="/dashboard/team" icon={<Users size={18} />} label="Team" />
                            <NavLinkClient href="/dashboard/announcements" icon={<Bell size={18} />} label="Announcements" />
                            <NavLinkClient href="/dashboard/leave" icon={<Calendar size={18} />} label="Leave" />
                            <NavLinkClient href="/dashboard/performance" icon={<BarChart3 size={18} />} label="Performance" />

                            {/* ADMIN Section - HR */}
                            <div className="pt-6 pb-2 px-3">
                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                                    Admin
                                </span>
                            </div>
                            <NavLinkClient href="/dashboard/payroll" icon={<Wallet size={18} />} label="Payroll" />
                            <NavLinkClient href="/dashboard/settings" icon={<Settings size={18} />} label="Settings" />
                        </>
                    ) : (
                        <>
                            {/* WORKSPACE Section - Employee */}
                            <div className="pb-2 pt-4 px-3">
                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                                    Workspace
                                </span>
                            </div>
                            <NavLinkClient href="/dashboard" icon={<LayoutDashboard size={18} />} label="Overview" />
                            <NavLinkClient href="/dashboard/projects" icon={<FolderKanban size={18} />} label="My Projects" />

                            {/* PERSONAL Section - Employee */}
                            <div className="pt-6 pb-2 px-3">
                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                                    Personal
                                </span>
                            </div>
                            <NavLinkClient href="/dashboard/performance" icon={<BarChart3 size={18} />} label="My Performance" />
                            <NavLinkClient href="/dashboard/leave" icon={<Calendar size={18} />} label="Leave Requests" />
                            <NavLinkClient href="/dashboard/settings" icon={<Settings size={18} />} label="Settings" />
                        </>
                    )}
                </nav>

                {/* Help Center Footer */}
                <div className="p-4 border-t border-[#2C2C2C] bg-[#1C1C1C]">
                    <button className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-[#2C2C2C] transition-all w-full rounded-lg">
                        <HelpCircle size={16} />
                        Help Center
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:pl-64 transition-all duration-300">
                {/* Header with Glassmorphism */}
                <header className="h-14 flex items-center justify-between px-8 sticky top-0 z-40 bg-white/60 backdrop-blur-xl border-b border-gray-200/50">
                    <h1 className="font-medium text-sm text-gray-500 tracking-tight">
                        Workspace / <span className="text-gray-900 font-semibold">{isHR ? 'HR Dashboard' : 'My Dashboard'}</span>
                    </h1>
                    <UserNav />
                </header>
                <main className="flex-1 p-6 overflow-auto bg-[#FAFAFA]">
                    {children}
                </main>
            </div>
        </div>
    );
}
