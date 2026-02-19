import { getSession } from "@/lib/auth/session";
import { isRoleAtLeast } from "@/lib/rbac/types";
import DashboardClient from "./dashboard-client";
import { EmployeeWorkplace } from "@/components/dashboard/EmployeeWorkplace";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
            supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
            supabase.from('applications').select('status, position, candidate_name'),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'EMPLOYEE'),
            supabase.from('profiles').select('*').eq('role', 'EMPLOYEE').order('created_at', { ascending: false }),
            supabase.from('leave_requests').select('*, profile:profiles(full_name)').eq('status', 'pending').limit(5)
        ]);

        return (
            <DashboardClient
                teamMembers={teamMembers || 0}
                employees={employees || []}
                applicationsData={applications || []}
                pendingLeaveRequests={leaveRequests || []}
            />
        );
    }

    // Manager sees employee workplace (with project management capabilities)
    // Recruiter sees employee workplace (with hiring focus)
    // Employee sees personal workspace
    return <EmployeeWorkplace />;
}
