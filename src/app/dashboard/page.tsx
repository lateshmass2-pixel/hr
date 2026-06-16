import { getSession } from "@/lib/auth/session";
import { isRoleAtLeast } from "@/lib/rbac/types";
import DashboardClient from "./dashboard-client";
import { EmployeeWorkplace } from "@/components/dashboard/EmployeeWorkplace";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { EmployeeStatus } from "@/types/hems";

export default async function DashboardPage() {
    const session = await getSession();
    if (!session) redirect("/login");

    const supabase = await createClient();

    // -------------------------------------------------------------------
    // Route by role: owner/hr → HR Dashboard, everyone else → Employee
    // -------------------------------------------------------------------

    if (isRoleAtLeast(session.role, 'hr')) {
        // HR/Owner sees full admin dashboard
        const [
            { count: activeProjects },
            { data: applications },
            { count: teamMembers },
            { data: employees },
            { data: leaveRequests }
        ] = await Promise.all([
            supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
            supabase.from('applications').select('id, status, position, candidate_name'),
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'STANDARD_USER'),
            supabase.from('profiles').select('id, full_name, email, position, department, avatar_url, created_at').eq('role', 'STANDARD_USER').order('created_at', { ascending: false }),
            supabase.from('leave_requests').select('id, type, start_date, status, profile:profiles(full_name)').eq('status', 'pending').limit(5)
        ]);

        return (
            <DashboardClient
                teamMembers={teamMembers || 0}
                employees={(employees || []).map(e => ({ ...e, status: 'Active' as EmployeeStatus }))}
                applicationsData={applications || []}
                pendingLeaveRequests={(leaveRequests || []).map((l: any) => ({
                    ...l,
                    profile: Array.isArray(l.profile) ? l.profile[0] : l.profile
                }))}
            />
        );
    }

    // Manager sees employee workplace (with project management capabilities)
    // Recruiter sees employee workplace (with hiring focus)
    // Employee sees personal workspace
    return <EmployeeWorkplace />;
}
