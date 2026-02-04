import {
    LayoutDashboard, Users, FileText, CheckSquare, Settings,
    Calendar, CheckCircle2, HelpCircle, Search, Bell,
    Wallet, BarChart3, FolderKanban
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserNav } from "@/components/dashboard/user-nav";
import { NavLinkClient } from "../../components/dashboard/nav-link";

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

    const role = profile?.role || 'EMPLOYEE';
    const isHR = role === 'HR_ADMIN';
    const userName = profile?.full_name || user.user_metadata?.full_name || 'User';
    const userEmail = user.email || '';
    const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="flex min-h-screen" style={{ background: '#F8F9FB' }}>
            {/* ═══════════════════════════════════════════════════════════
                SIDEBAR - Clean White with Soft Pill Active States
            ═══════════════════════════════════════════════════════════ */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 sticky top-0 h-screen">
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                            H
                        </div>
                        <span className="font-bold text-gray-900 text-lg">HEMS</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {isHR ? (
                        <>
                            {/* WORKSPACE */}
                            <div className="px-3 py-2">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                    Workspace
                                </span>
                            </div>
                            <NavLinkClient href="/dashboard" icon={<LayoutDashboard size={18} />} label="Overview" />
                            <NavLinkClient href="/dashboard/projects" icon={<FolderKanban size={18} />} label="Projects" />
                            <NavLinkClient href="/dashboard/scout" icon={<Search size={18} />} label="Talent Scout" />
                            <NavLinkClient href="/dashboard/hiring" icon={<Users size={18} />} label="Hiring" />
                            <NavLinkClient href="/dashboard/hired" icon={<CheckCircle2 size={18} />} label="Onboarded" />

                            {/* PEOPLE */}
                            <div className="px-3 py-2 mt-6">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                    People
                                </span>
                            </div>
                            <NavLinkClient href="/dashboard/team" icon={<Users size={18} />} label="Team" />
                            <NavLinkClient href="/dashboard/announcements" icon={<Bell size={18} />} label="Announcements" />
                            <NavLinkClient href="/dashboard/leave" icon={<Calendar size={18} />} label="Leave" />
                            <NavLinkClient href="/dashboard/performance" icon={<BarChart3 size={18} />} label="Performance" />

                            {/* ADMIN */}
                            <div className="px-3 py-2 mt-6">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                    Admin
                                </span>
                            </div>

                            <NavLinkClient href="/dashboard/settings" icon={<Settings size={18} />} label="Settings" />
                        </>
                    ) : (
                        <>
                            {/* WORKSPACE - Employee */}
                            <div className="px-3 py-2">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                    Workspace
                                </span>
                            </div>
                            <NavLinkClient href="/dashboard" icon={<LayoutDashboard size={18} />} label="Overview" />
                            <NavLinkClient href="/dashboard/projects" icon={<FolderKanban size={18} />} label="My Projects" />

                            {/* PERSONAL */}
                            <div className="px-3 py-2 mt-6">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                    Personal
                                </span>
                            </div>
                            <NavLinkClient href="/dashboard/performance" icon={<BarChart3 size={18} />} label="Performance" />
                            <NavLinkClient href="/dashboard/leave" icon={<Calendar size={18} />} label="Leave" />
                            <NavLinkClient href="/dashboard/settings" icon={<Settings size={18} />} label="Settings" />
                        </>
                    )}
                </nav>

                {/* User Profile Footer */}
                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
                            <Users className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                            <p className="text-xs text-gray-500 truncate">{isHR ? 'HR Admin' : 'Employee'}</p>
                        </div>
                    </div>
                </div>

            </aside>

            {/* ═══════════════════════════════════════════════════════════
                MAIN CONTENT
            ═══════════════════════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col">
                {/* Floating Top Bar */}
                <header className="h-16 flex items-center justify-between px-6 sticky top-0 z-40 bg-[#F8F9FB]">
                    {/* Search Bar */}
                    <div className="relative w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search employees, projects..."
                            className="search-input pl-11"
                        />
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-4">
                        {/* Notification Bell */}
                        <button className="relative w-10 h-10 rounded-full bg-white shadow-card flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors">
                            <Bell size={18} />
                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
                        </button>

                        <UserNav />
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
