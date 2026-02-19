import {
    LayoutDashboard, Users, FileText, CheckSquare, Settings,
    Calendar, CheckCircle2, HelpCircle, Search, Bell,
    Wallet, BarChart3, FolderKanban
} from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isRoleAtLeast, type OrgRole, ROLE_LABELS } from "@/lib/rbac/types";
import { OrganizationProvider } from "@/context/OrganizationContext";
import { UserNav } from "@/components/dashboard/user-nav";
import { NavLinkClient } from "../../components/dashboard/nav-link";

// =============================================================================
// 5-Role Navigation Config — Single source of truth for sidebar items
// =============================================================================

type NavItem = {
    href: string;
    icon: React.ReactNode;
    label: string;
    minRole: OrgRole;
};

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
    {
        title: 'Workspace',
        items: [
            { href: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Overview', minRole: 'employee' },
            { href: '/dashboard/projects', icon: <FolderKanban size={18} />, label: 'Projects', minRole: 'employee' },
            { href: '/dashboard/scout', icon: <Search size={18} />, label: 'Talent Scout', minRole: 'recruiter' },
            { href: '/dashboard/hiring', icon: <Users size={18} />, label: 'Hiring', minRole: 'recruiter' },
            { href: '/dashboard/hired', icon: <CheckCircle2 size={18} />, label: 'Onboarded', minRole: 'hr' },
        ],
    },
    {
        title: 'People',
        items: [
            { href: '/dashboard/team', icon: <Users size={18} />, label: 'Team', minRole: 'hr' },
            { href: '/dashboard/announcements', icon: <Bell size={18} />, label: 'Announcements', minRole: 'employee' },
            { href: '/dashboard/leave', icon: <Calendar size={18} />, label: 'Leave', minRole: 'employee' },
            { href: '/dashboard/performance', icon: <BarChart3 size={18} />, label: 'Performance', minRole: 'employee' },
        ],
    },
    {
        title: 'Admin',
        items: [
            { href: '/dashboard/settings', icon: <Settings size={18} />, label: 'Settings', minRole: 'hr' },
        ],
    },
];

// =============================================================================
// Layout Component
// =============================================================================

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    const userRole = session.role;
    const userName = session.name;
    const userEmail = session.email;
    const roleLabel = ROLE_LABELS[userRole] ?? 'Member';

    // Filter nav items by role
    const filteredSections = NAV_SECTIONS
        .map(section => ({
            ...section,
            items: section.items.filter(item => isRoleAtLeast(userRole, item.minRole)),
        }))
        .filter(section => section.items.length > 0);

    return (
        <OrganizationProvider
            initialUser={{
                id: session.userId,
                name: session.name,
                email: session.email,
            }}
            initialOrganization={session.organizationId !== 'legacy' ? {
                id: session.organizationId,
                name: session.organizationName,
                slug: '',
                logo_url: null,
                plan: 'starter',
                subscription_status: 'active',
                max_employees: 25,
            } : null}
            initialRole={userRole}
        >
            <div className="flex min-h-screen">
                {/* ═══════════════════════════════════════════════════════════
                    SIDEBAR - Role-Filtered Navigation
                ═══════════════════════════════════════════════════════════ */}
                <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 sticky top-0 h-screen">
                    {/* Logo */}
                    <div className="h-16 flex items-center px-6 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#14532d] to-[#166534] flex items-center justify-center text-white font-bold text-sm shadow-md">
                                H
                            </div>
                            <span className="font-bold text-gray-900 text-lg">HEMS</span>
                        </div>
                    </div>

                    {/* Role-Filtered Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {filteredSections.map((section) => (
                            <div key={section.title}>
                                <div className="px-3 py-2 mt-4 first:mt-0">
                                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                        {section.title}
                                    </span>
                                </div>
                                {section.items.map((item) => (
                                    <NavLinkClient
                                        key={item.href}
                                        href={item.href}
                                        icon={item.icon}
                                        label={item.label}
                                    />
                                ))}
                            </div>
                        ))}
                    </nav>

                    {/* User Profile Footer with Role Badge */}
                    <div className="p-4 border-t border-gray-100">
                        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
                                {userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                                <div className="flex items-center gap-1.5">
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${userRole === 'owner' ? 'bg-purple-500' :
                                        userRole === 'hr' ? 'bg-blue-500' :
                                            userRole === 'manager' ? 'bg-emerald-500' :
                                                userRole === 'recruiter' ? 'bg-amber-500' :
                                                    'bg-gray-400'
                                        }`} />
                                    <p className="text-xs text-gray-500 truncate">{roleLabel}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ═══════════════════════════════════════════════════════════
                    MAIN CONTENT
                ═══════════════════════════════════════════════════════════ */}
                <div className="flex-1 flex flex-col">
                    {/* Floating Top Bar */}
                    <header className="h-16 flex items-center justify-between px-6 sticky top-0 z-40 bg-[#f8faf6]/80 backdrop-blur-md border-b border-green-100/50">
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
                    <main className="flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </OrganizationProvider>
    );
}
