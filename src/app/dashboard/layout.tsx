
import Link from "next/link";
import { LayoutDashboard, Users, FileText, CheckSquare, Settings, Calendar, CheckCircle2, HelpCircle, Search } from "lucide-react";
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
    const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="flex min-h-screen bg-[#F3F4F6]">
            {/* Sidebar (Clean Enterprise Style) */}
            <aside className="w-64 bg-white hidden md:flex flex-col fixed h-full z-50 border-r border-gray-200">
                {/* Profile Header at Top */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg">
                            {userInitials}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">{userName}</p>
                            <p className="text-sm text-gray-500">{role === 'HR_ADMIN' ? 'Human Resource' : 'Employee'}</p>
                        </div>
                    </div>
                </div>

                {/* Logo */}
                <div className="px-6 py-4">
                    <span className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">H</div>
                        HEMS
                    </span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                    {role === 'HR_ADMIN' ? (
                        <>
                            <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                Workspace
                            </div>
                            <NavLinkClient href="/dashboard" icon={<LayoutDashboard size={20} />} label="Overview" />
                            <NavLinkClient href="/dashboard/projects" icon={<CheckSquare size={20} />} label="Projects" />
                            <NavLinkClient href="/dashboard/scout" icon={<Search size={20} />} label="Talent Scout" />
                            <NavLinkClient href="/dashboard/hiring" icon={<Users size={20} />} label="Generic Hiring" />
                            <NavLinkClient href="/dashboard/hired" icon={<CheckCircle2 size={20} />} label="Onboarded" />

                            <div className="px-3 py-2 mt-6 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                People
                            </div>
                            <NavLinkClient href="/dashboard/team" icon={<Users size={20} />} label="Team" />
                            <NavLinkClient href="/dashboard/leave" icon={<Calendar size={20} />} label="Leave" />
                            <NavLinkClient href="/dashboard/performance" icon={<FileText size={20} />} label="Reviews" />
                            <NavLinkClient href="/dashboard/settings" icon={<Settings size={20} />} label="Settings" />
                        </>
                    ) : (
                        <>
                            <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                Employee
                            </div>
                            <NavLinkClient href="/dashboard/employee" icon={<LayoutDashboard size={20} />} label="My Dashboard" />
                            <NavLinkClient href="/dashboard/employee/leave" icon={<Calendar size={20} />} label="Leave" />
                            <div className="my-2 border-t border-gray-100" />
                            <NavLinkClient href="/dashboard/employee/settings" icon={<Settings size={20} />} label="Settings" />
                        </>
                    )}
                </nav>

                {/* Footer Section */}
                <div className="p-4 border-t border-gray-100">
                    <button className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors w-full rounded-xl">
                        <HelpCircle size={18} />
                        Help Center
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:pl-64 transition-all duration-300">
                <header className="h-16 flex items-center justify-between px-8 sticky top-0 z-40 bg-[#F3F4F6]/95 backdrop-blur-sm border-b border-gray-100">
                    <h1 className="font-medium text-sm text-gray-500">
                        Workspace / <span className="text-gray-900 font-semibold">{role === 'HR_ADMIN' ? 'HR Dashboard' : 'My Dashboard'}</span>
                    </h1>
                    <UserNav />
                </header>
                <main className="flex-1 p-6 overflow-auto bg-[#F3F4F6]">
                    {children}
                </main>
            </div>
        </div>
    );
}
