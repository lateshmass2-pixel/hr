
import Link from "next/link";
import { LayoutDashboard, Users, FileText, CheckSquare, Settings, Calendar, CheckCircle2, HelpCircle, Search, Megaphone, Bell, FileQuestion, Gift, Inbox, Sparkles, ChevronLeft, ChevronUp, ChevronDown } from "lucide-react";
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

    // Default to EMPLOYEE if no profile/role found to be safe
    const role = profile?.role || 'EMPLOYEE';
    const userName = profile?.full_name || user.user_metadata?.full_name || 'User';
    const userEmail = user.email || '';
    const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="flex min-h-screen bg-[#0d0d0d]">
            {/* Sidebar (Dark Workly Style) */}
            <aside className="w-64 bg-[#141414] hidden md:flex flex-col fixed h-full z-50 border-r border-[#2a2a2a]">
                {/* Profile Header at Top */}
                <div className="p-4 border-b border-[#2a2a2a]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {userInitials}
                        </div>
                        <div>
                            <p className="font-semibold text-white text-sm">{userName}</p>
                            <p className="text-xs text-zinc-500">Human Resource</p>
                        </div>
                    </div>
                </div>

                {/* Logo */}
                <div className="px-5 py-3">
                    <span className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-violet-400 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            H
                        </div>
                        HEMS
                    </span>
                </div>

                {/* Main Navigation */}
                <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                    {role === 'HR_ADMIN' ? (
                        <>
                            {/* WORKSPACE Section */}
                            <div className="pb-2">
                                <span className="px-3 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                                    Workspace
                                </span>
                            </div>
                            <NavLinkClient href="/dashboard" icon={<LayoutDashboard size={20} />} label="Overview" />
                            <NavLinkClient href="/dashboard/projects" icon={<CheckSquare size={20} />} label="Projects" />
                            <NavLinkClient href="/dashboard/scout" icon={<Search size={20} />} label="Talent Scout" />
                            <NavLinkClient href="/dashboard/hiring" icon={<Users size={20} />} label="Generic Hiring" />
                            <NavLinkClient href="/dashboard/hired" icon={<CheckCircle2 size={20} />} label="Onboarded" />

                            {/* PEOPLE Section */}
                            <div className="pt-6 pb-2">
                                <span className="px-3 text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                                    People
                                </span>
                            </div>
                            <NavLinkClient href="/dashboard/team" icon={<Users size={20} />} label="Team" />
                            <NavLinkClient href="/dashboard/announcements" icon={<Bell size={20} />} label="Announcements" />
                            <NavLinkClient href="/dashboard/leave" icon={<Calendar size={20} />} label="Leave" />
                            <NavLinkClient href="/dashboard/performance" icon={<FileText size={20} />} label="Performance" />
                            <NavLinkClient href="/dashboard/settings" icon={<Settings size={20} />} label="Settings" />
                        </>
                    ) : (
                        <>
                            <NavLinkClient href="/dashboard/employee" icon={<CheckSquare size={20} />} label="Tasks" />
                            <NavLinkClient href="/dashboard/employee/leave" icon={<Calendar size={20} />} label="Leave" />
                            <NavLinkClient href="/dashboard/employee/settings" icon={<Settings size={20} />} label="Settings" />
                        </>
                    )}
                </nav>

                {/* Help Center Footer */}
                <div className="p-4 border-t border-[#2a2a2a]">
                    <button className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-500 hover:text-white hover:bg-[#1a1a1a] transition-colors w-full rounded-lg">
                        <HelpCircle size={18} />
                        Help Center
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:pl-64 transition-all duration-300">
                <header className="h-16 flex items-center justify-between px-8 sticky top-0 z-40 bg-[#0d0d0d]/95 backdrop-blur-sm border-b border-[#2a2a2a]">
                    <h1 className="font-medium text-sm text-zinc-500">
                        Workspace / <span className="text-white font-semibold">{role === 'HR_ADMIN' ? 'HR Dashboard' : 'My Dashboard'}</span>
                    </h1>
                    <UserNav />
                </header>
                <main className="flex-1 p-6 overflow-auto bg-[#0d0d0d]">
                    {children}
                </main>
            </div>
        </div>
    );
}
