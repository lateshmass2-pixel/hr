import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, ClipboardList, CheckCircle2, Clock, CheckSquare, Megaphone, AlertCircle, Sparkles } from "lucide-react"
import { updateTaskStatus } from "./actions"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { getAnnouncements } from "../announcements/actions"

export const dynamic = 'force-dynamic'

async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}

export default async function EmployeeDashboard() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single()

    const userName = profile?.full_name || user.email || 'Employee'

    // Fetch tasks
    const { data: tasks } = await supabase
        .from('tasks')
        .select('*, project:projects(title)')
        .eq('assignee_id', user.id)
        .order('deadline', { ascending: true })

    const activeTasks = tasks?.filter(t => ['TODO', 'IN_PROGRESS'].includes(t.status)) || []
    const completedTasks = tasks?.filter(t => ['READY_FOR_REVIEW', 'COMPLETED'].includes(t.status)) || []

    // Fetch announcements
    const announcements = await getAnnouncements()

    return (
        <div className="min-h-screen">
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center shadow-lg">
                            <CheckSquare className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-[#1a1a1a]">My Workspace</h2>
                            <p className="text-[#6b6b6b] text-sm mt-1">
                                Welcome, <span className="font-semibold text-[#1a1a1a]">{userName}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Help Bubble */}
                        <div className="hidden md:flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-md border border-[#e8e4e0]">
                            <Sparkles className="w-4 h-4 text-[#e07850]" />
                            <span className="text-[#1a1a1a] text-sm font-medium">Need help?</span>
                            <span className="text-lg">👋</span>
                        </div>
                        <form action={signOut}>
                            <Button variant="outline" type="submit" className="bg-white border-[#e8e4e0] text-[#6b6b6b] hover:bg-[#faf8f5] hover:border-[#e07850]/50 hover:text-[#e07850] rounded-full">
                                <LogOut className="mr-2 h-4 w-4" /> Sign Out
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Announcements Section */}
                {announcements.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-[#1a1a1a] flex items-center gap-2">
                            <div className="bg-[#e07850]/10 text-[#e07850] rounded-full p-2">
                                <Megaphone className="h-5 w-5" />
                            </div>
                            Company Announcements
                        </h3>
                        <div className="grid gap-4">
                            {announcements.slice(0, 3).map((announcement: { id: string; title: string; content: string; priority: string; created_at: string; creator?: { full_name: string } }) => (
                                <div
                                    key={announcement.id}
                                    className={`bg-white rounded-2xl border p-5 shadow-md ${announcement.priority === 'HIGH'
                                        ? 'border-red-200 bg-red-50'
                                        : 'border-[#e8e4e0]'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {announcement.priority === 'HIGH' && (
                                            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-[#1a1a1a]">{announcement.title}</h4>
                                                <Badge className={
                                                    announcement.priority === 'HIGH'
                                                        ? 'bg-red-50 text-red-700 border-red-200'
                                                        : announcement.priority === 'LOW'
                                                            ? 'bg-[#f5f3f0] text-[#6b6b6b] border-[#e8e4e0]'
                                                            : 'bg-[#e07850]/10 text-[#e07850] border-[#e07850]/20'
                                                }>
                                                    {announcement.priority}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-[#6b6b6b] mb-2">{announcement.content}</p>
                                            <p className="text-xs text-[#a0a0a0]">
                                                {format(new Date(announcement.created_at), "MMM d, yyyy")} • {announcement.creator?.full_name || 'HR Team'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Active Tasks */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-[#1a1a1a] flex items-center gap-2">
                        <div className="bg-[#e07850]/10 text-[#e07850] rounded-full p-2">
                            <ClipboardList className="h-5 w-5" />
                        </div>
                        My Active Tasks
                    </h3>
                    {activeTasks.length === 0 ? (
                        <div className="bg-white border border-[#e8e4e0] rounded-3xl shadow-md p-12 text-center">
                            <ClipboardList className="h-12 w-12 text-[#a0a0a0] mx-auto mb-4" />
                            <p className="text-[#6b6b6b]">No active tasks assigned to you.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {activeTasks.map(task => (
                                <div
                                    key={task.id}
                                    className="bg-white rounded-2xl border border-[#e8e4e0] p-5 hover:shadow-lg hover:border-[#e07850]/30 transition-all shadow-md"
                                >
                                    {/* Header */}
                                    <div className="flex justify-between items-start gap-2 mb-3">
                                        <Badge variant="outline" className="bg-[#faf8f5] border-[#e8e4e0] text-[#6b6b6b] text-xs">
                                            {task.project?.title || 'No Project'}
                                        </Badge>
                                        <Badge className={
                                            task.priority === 'HIGH'
                                                ? 'bg-[#e07850]/10 text-[#e07850] border-[#e07850]/20'
                                                : 'bg-[#f5f3f0] text-[#6b6b6b] border-[#e8e4e0]'
                                        }>
                                            {task.priority}
                                        </Badge>
                                    </div>

                                    {/* Title */}
                                    <h4 className="font-semibold text-base text-[#1a1a1a] mb-2">{task.title}</h4>

                                    {/* Deadline */}
                                    {task.deadline && (
                                        <div className="flex items-center gap-1.5 text-xs text-[#a0a0a0] mb-3">
                                            <Clock className="h-3 w-3" />
                                            Due {format(new Date(task.deadline), 'MMM d')}
                                        </div>
                                    )}

                                    {/* Description */}
                                    <p className="text-sm text-[#6b6b6b] line-clamp-2 leading-relaxed mb-4">
                                        {task.description}
                                    </p>

                                    {/* Action Button */}
                                    <form action={async () => {
                                        'use server'
                                        await updateTaskStatus(task.id, 'READY_FOR_REVIEW')
                                    }}>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full bg-[#faf8f5] border-[#e8e4e0] text-[#6b6b6b] hover:bg-[#e07850]/10 hover:border-[#e07850]/50 hover:text-[#e07850]"
                                        >
                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Done
                                        </Button>
                                    </form>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Task History */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-[#1a1a1a] flex items-center gap-2">
                        <div className="bg-[#e07850]/10 text-[#e07850] rounded-full p-2">
                            <CheckSquare className="h-5 w-5" />
                        </div>
                        Task History
                    </h3>
                    <div className="bg-white rounded-3xl shadow-md border border-[#e8e4e0] overflow-hidden">
                        {completedTasks.length === 0 ? (
                            <div className="p-8 text-center text-[#a0a0a0]">
                                No completed tasks yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[#faf8f5] border-b border-[#e8e4e0]">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-[#6b6b6b] uppercase tracking-wider">
                                                Task
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-[#6b6b6b] uppercase tracking-wider">
                                                Project
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-[#6b6b6b] uppercase tracking-wider">
                                                Completed
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-[#6b6b6b] uppercase tracking-wider">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#e8e4e0]">
                                        {completedTasks.map(task => (
                                            <tr key={task.id} className="hover:bg-[#faf8f5] transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <p className="text-sm font-medium text-[#a0a0a0] line-through">
                                                        {task.title}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <p className="text-sm text-[#6b6b6b]">
                                                        {task.project?.title || '-'}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <p className="text-sm text-[#6b6b6b]">
                                                        {format(new Date(task.updated_at), 'MMM d, yyyy')}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                        {task.status.replace(/_/g, ' ')}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
