import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, ClipboardList, CheckCircle2, Clock, CheckSquare, Megaphone, AlertCircle } from "lucide-react"
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
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-white">My Workspace</h2>
                        <p className="text-zinc-400 mt-1">
                            Welcome, <span className="font-medium text-white">{userName}</span>
                        </p>
                    </div>
                    <form action={signOut}>
                        <Button variant="outline" type="submit" className="bg-[#1a1a1a] border-[#2a2a2a] text-zinc-300 hover:bg-[#222] hover:border-violet-500/50 hover:text-white">
                            <LogOut className="mr-2 h-4 w-4" /> Sign Out
                        </Button>
                    </form>
                </div>

                {/* Announcements Section */}
                {announcements.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <div className="bg-violet-500/20 text-violet-400 rounded-full p-2">
                                <Megaphone className="h-5 w-5" />
                            </div>
                            Company Announcements
                        </h3>
                        <div className="grid gap-4">
                            {announcements.slice(0, 3).map((announcement: { id: string; title: string; content: string; priority: string; created_at: string; creator?: { full_name: string } }) => (
                                <div
                                    key={announcement.id}
                                    className={`bg-[#1a1a1a] rounded-xl border p-5 ${announcement.priority === 'HIGH'
                                        ? 'border-red-500/30 bg-red-500/5'
                                        : 'border-[#2a2a2a]'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {announcement.priority === 'HIGH' && (
                                            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-white">{announcement.title}</h4>
                                                <Badge className={
                                                    announcement.priority === 'HIGH'
                                                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                                        : announcement.priority === 'LOW'
                                                            ? 'bg-zinc-700 text-zinc-300 border-zinc-600'
                                                            : 'bg-violet-500/20 text-violet-400 border-violet-500/30'
                                                }>
                                                    {announcement.priority}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-zinc-400 mb-2">{announcement.content}</p>
                                            <p className="text-xs text-zinc-500">
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
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <div className="bg-violet-500/20 text-violet-400 rounded-full p-2">
                            <ClipboardList className="h-5 w-5" />
                        </div>
                        My Active Tasks
                    </h3>
                    {activeTasks.length === 0 ? (
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-lg p-12 text-center">
                            <p className="text-zinc-500">No active tasks assigned to you.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {activeTasks.map(task => (
                                <div
                                    key={task.id}
                                    className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-5 hover:border-violet-500/50 transition-colors"
                                >
                                    {/* Header */}
                                    <div className="flex justify-between items-start gap-2 mb-3">
                                        <Badge variant="outline" className="bg-[#0d0d0d] border-[#2a2a2a] text-zinc-400 text-xs">
                                            {task.project?.title || 'No Project'}
                                        </Badge>
                                        <Badge className={
                                            task.priority === 'HIGH'
                                                ? 'bg-violet-500/20 text-violet-400 border-violet-500/30'
                                                : 'bg-zinc-700 text-zinc-300 border-zinc-600'
                                        }>
                                            {task.priority}
                                        </Badge>
                                    </div>

                                    {/* Title */}
                                    <h4 className="font-semibold text-base text-white mb-2">{task.title}</h4>

                                    {/* Deadline */}
                                    {task.deadline && (
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-3">
                                            <Clock className="h-3 w-3" />
                                            Due {format(new Date(task.deadline), 'MMM d')}
                                        </div>
                                    )}

                                    {/* Description */}
                                    <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed mb-4">
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
                                            className="w-full bg-[#0d0d0d] border-[#2a2a2a] text-zinc-300 hover:bg-violet-500/20 hover:border-violet-500/50 hover:text-violet-400"
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
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <div className="bg-violet-500/20 text-violet-400 rounded-full p-2">
                            <CheckSquare className="h-5 w-5" />
                        </div>
                        Task History
                    </h3>
                    <div className="bg-[#1a1a1a] rounded-xl shadow-lg border border-[#2a2a2a] overflow-hidden">
                        {completedTasks.length === 0 ? (
                            <div className="p-8 text-center text-zinc-500">
                                No completed tasks yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-[#0d0d0d] border-b border-[#2a2a2a]">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                                Task
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                                Project
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                                Completed
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#2a2a2a]">
                                        {completedTasks.map(task => (
                                            <tr key={task.id} className="hover:bg-[#222] transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <p className="text-sm font-medium text-zinc-400 line-through">
                                                        {task.title}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <p className="text-sm text-zinc-500">
                                                        {task.project?.title || '-'}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <p className="text-sm text-zinc-500">
                                                        {format(new Date(task.updated_at), 'MMM d, yyyy')}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
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
