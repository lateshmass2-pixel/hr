
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
        redirect("/sign-in");
    }

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-black">
            {/* Sidebar */}
            <aside className="w-64 border-r border-gray-200 dark:border-white/10 bg-white dark:bg-black hidden md:block">
                <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-white/10">
                    <span className="font-bold text-lg">HEMS Portal</span>
                </div>
                <nav className="p-4 space-y-2">
                    <NavLink href="/dashboard" icon={<LayoutDashboard size={20} />} label="Overview" />
                    <NavLink href="/dashboard/projects" icon={<CheckSquare size={20} />} label="Projects & Tasks" />
                    <NavLink href="/dashboard/hiring" icon={<Users size={20} />} label="Hiring Pipeline" />
                    <NavLink href="/dashboard/performance" icon={<FileText size={20} />} label="Performance" />
                    <NavLink href="/dashboard/settings" icon={<Settings size={20} />} label="Settings" />
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                <header className="h-16 border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-6 bg-white dark:bg-black">
                    <h1 className="font-medium text-sm text-gray-500">Workspace / HR</h1>
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
