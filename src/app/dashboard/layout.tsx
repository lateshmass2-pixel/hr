
import Link from "next/link";
import { LayoutDashboard, Users, FileText, CheckSquare, Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UserNav } from "@/components/dashboard/user-nav";

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
        .select('role')
        .eq('id', user.id)
        .single();

    // Default to EMPLOYEE if no profile/role found to be safe
    const role = profile?.role || 'EMPLOYEE';

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-black">
            {/* Sidebar */}
            <aside className="w-64 border-r border-gray-200 dark:border-white/10 bg-white dark:bg-black hidden md:block">
                <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-white/10">
                    <span className="font-bold text-lg">HEMS Portal</span>
                </div>
                <nav className="p-4 space-y-2">
                    {role === 'HR_ADMIN' ? (
                        <>
                            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                HR Workspace
                            </div>
                            <NavLink href="/dashboard" icon={<LayoutDashboard size={20} />} label="Overview" />
                            <NavLink href="/dashboard/projects" icon={<CheckSquare size={20} />} label="Projects & Tasks" />
                            <NavLink href="/dashboard/hiring" icon={<Users size={20} />} label="Hiring Pipeline" />
                            <NavLink href="/dashboard/performance" icon={<FileText size={20} />} label="Performance" />
                            <NavLink href="/dashboard/settings" icon={<Settings size={20} />} label="Settings" />
                        </>
                    ) : (
                        <>
                            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Employee
                            </div>
                            <NavLink href="/dashboard/employee" icon={<LayoutDashboard size={20} />} label="My Dashboard" />
                            <div className="my-2 border-t border-gray-100 dark:border-white/10" />
                            <NavLink href="/dashboard/employee/settings" icon={<Settings size={20} />} label="Settings" />
                        </>
                    )}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                <header className="h-16 border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-6 bg-white dark:bg-black">
                    <h1 className="font-medium text-sm text-gray-500">
                        Workspace / {role === 'HR_ADMIN' ? 'HR' : 'Employee'}
                    </h1>
                    <UserNav />
                </header>
                <main className="flex-1 p-6 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    return (
        <Link href={href} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            {icon}
            {label}
        </Link>
    );
}
