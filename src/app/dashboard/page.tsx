import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { AddEmployeeDialog } from "./add-employee-dialog";
import { EmployeeList } from "./employee-list";
import { Users, Briefcase, CheckSquare, FileText } from "lucide-react";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Fetch all stats in parallel
    const [
        { count: activeProjects },
        { count: pendingTasks },
        { count: applications },
        { count: teamMembers },
        { data: employees }
    ] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'COMPLETED'),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'EMPLOYEE'),
        supabase.from('profiles').select('*').eq('role', 'EMPLOYEE').order('created_at', { ascending: false })
    ]);

    const stats = [
        {
            label: "Active Projects",
            value: activeProjects || 0,
            icon: Briefcase,
            color: "text-blue-500"
        },
        {
            label: "Pending Tasks",
            value: pendingTasks || 0,
            icon: CheckSquare,
            color: "text-orange-500"
        },
        {
            label: "Applications",
            value: applications || 0,
            icon: FileText,
            color: "text-purple-500"
        },
        {
            label: "Team Members",
            value: teamMembers || 0,
            icon: Users,
            color: "text-green-500"
        },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground mt-1">
                        Welcome back, {user.user_metadata?.full_name?.split(' ')[0] || 'Admin'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <AddEmployeeDialog />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.label}
                            </CardTitle>
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                {/* Team Management Section */}
                <Card className="md:col-span-7">
                    <CardHeader>
                        <CardTitle>Team Management</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <EmployeeList employees={employees || []} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
