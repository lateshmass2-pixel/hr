import { createClient } from "@/lib/supabase/server";
import { AddEmployeeDialog } from "./add-employee-dialog";
import { EmployeeList } from "./employee-list";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Fetch all stats in parallel
    const [
        { count: activeProjects },
        { count: pendingTasks },
        { data: applications },
        { count: teamMembers },
        { data: employees },
        { data: leaveRequests }
    ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'COMPLETED'),
        supabase.from('applications').select('status, position, candidate_name'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'EMPLOYEE'),
        supabase.from('profiles').select('*').eq('role', 'EMPLOYEE').order('created_at', { ascending: false }),
        supabase.from('leave_requests').select('*, profile:profiles(full_name)').eq('status', 'pending').limit(5)
    ]);

    return (
        <DashboardClient
            pendingTasks={pendingTasks || 0}
            teamMembers={teamMembers || 0}
            employees={employees || []}
            applicationsData={applications || []}
            pendingLeaveRequests={leaveRequests || []}
            userName={user.user_metadata?.full_name?.split(' ')[0] || 'Admin'}
        />
    );
}
