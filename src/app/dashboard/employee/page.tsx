import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CheckSquare, Clock, Star, Zap } from "lucide-react"
import { GradientStatCard } from "@/components/ui/gradient-stat-card"
import { ProjectGlassCard } from "@/components/dashboard/employee/ProjectGlassCard"
import { TaskFocusWidget } from "@/components/dashboard/employee/TaskFocusWidget"
import { LeaveBalanceChart } from "@/components/dashboard/employee/LeaveBalanceChart"
import { formatDistanceToNow } from "date-fns"

export const dynamic = 'force-dynamic'

export default async function EmployeeDashboard() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

    const userName = profile?.full_name || 'Team Member'

    // Fetch Tasks
    const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('assignee_id', user.id)
        .order('deadline', { ascending: true })

    const pendingTasks = tasks?.filter(t => ['TODO', 'IN_PROGRESS'].includes(t.status)) || []
    const nextTask = pendingTasks[0]

    // Calculate stats
    const totalPending = pendingTasks.length
    const nextDeadline = nextTask?.deadline
        ? formatDistanceToNow(new Date(nextTask.deadline), { addSuffix: true }).replace('about ', '')
        : 'None'

    // Fetch Projects using a helper or direct query if possible
    // Assuming 'member_ids' column on projects contains user.id
    const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .contains('member_ids', [user.id])
        .eq('status', 'ACTIVE')

    // Mock project progress for demo if missing
    const activeProjects = projects?.map(p => ({
        ...p,
        progress: p.progress || Math.floor(Math.random() * 40) + 30 // Mock 30-70% if empty
    })) || []

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[2rem] bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                    <div className="text-2xl">👋</div>
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        Good Morning, {userName.split(' ')[0]}
                    </h1>
                    <p className="text-gray-500">Here's your personal command center for today.</p>
                </div>
            </div>

            {/* 1. My Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <GradientStatCard
                    title="My Tasks"
                    value={totalPending}
                    variant="indigo"
                    trend="Pending"
                    icon={<CheckSquare size={20} />}
                />
                <GradientStatCard
                    title="Project Quality"
                    value="98%"
                    variant="mint" // Green Gradient
                    trend="+2.4%"
                    icon={<Star size={20} />}
                />
                <GradientStatCard
                    title="Hours Logged"
                    value="34.5"
                    variant="peach" // Orange Gradient
                    subtitle="This week"
                    icon={<Clock size={20} />}
                />
                <GradientStatCard
                    title="Next Deadline"
                    value={nextDeadline}
                    variant="pink"
                    trend="Urgent"
                    trendDirection="down"
                    icon={<Zap size={20} />}
                />
            </div>

            {/* 2. Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
                {/* Left: Active Projects (Span 2) */}
                <div className="lg:col-span-2 h-full">
                    <ProjectGlassCard projects={activeProjects} />
                </div>

                {/* Right: Task Focus (Span 1) */}
                <div className="lg:col-span-1 h-full">
                    <TaskFocusWidget tasks={pendingTasks} />
                </div>
            </div>

            {/* 3. Leave Balance Widget */}
            <div className="w-full">
                <LeaveBalanceChart />
            </div>
        </div>
    )
}
