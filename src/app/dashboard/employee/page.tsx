import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, ClipboardList, CheckCircle2, Clock, CheckSquare } from "lucide-react"
import { updateTaskStatus } from "./actions"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

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

    return (
        <div className="min-h-screen bg-hems-bg">
            <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900">My Workspace</h2>
                        <p className="text-gray-500 mt-1">
                            Welcome, <span className="font-medium text-gray-900">{userName}</span>
                        </p>
                    </div>
                    <form action={signOut}>
                        <Button variant="outline" type="submit" className="border-gray-200 text-gray-600 hover:border-hems-primary hover:text-hems-primary">
                            <LogOut className="mr-2 h-4 w-4" /> Sign Out
                        </Button>
                    </form>
                </div>

                {/* Active Tasks */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <div className="bg-purple-100 text-purple-600 rounded-full p-2">
                            <ClipboardList className="h-5 w-5" />
                        </div>
                        My Active Tasks
                    </h3>
                    {activeTasks.length === 0 ? (
                        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-12 text-center">
                            <p className="text-gray-500">No active tasks assigned to you.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {activeTasks.map(task => (
                                <div
                                    key={task.id}
                                    className="bg-white rounded-lg border border-gray-200 p-5 hover:border-hems-primary/30 transition-colors"
                                >
                                    {/* Header */}
                                    <div className="flex justify-between items-start gap-2 mb-3">
                                        <Badge variant="outline" className="bg-gray-50 border-gray-200 text-gray-600 text-xs">
                                            {task.project?.title || 'No Project'}
                                        </Badge>
                                        <Badge className={
                                            task.priority === 'HIGH'
                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                : 'bg-gray-100 text-gray-600 border-gray-200'
                                        }>
                                            {task.priority}
                                        </Badge>
                                    </div>

                                    {/* Title */}
                                    <h4 className="font-semibold text-base text-gray-900 mb-2">{task.title}</h4>

                                    {/* Deadline */}
                                    {task.deadline && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                                            <Clock className="h-3 w-3" />
                                            Due {format(new Date(task.deadline), 'MMM d')}
                                        </div>
                                    )}

                                    {/* Description */}
                                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mb-4">
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
                                            className="w-full border-gray-200 text-gray-600 hover:border-hems-primary hover:text-hems-primary hover:bg-white"
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
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <div className="bg-purple-100 text-purple-600 rounded-full p-2">
                            <CheckSquare className="h-5 w-5" />
                        </div>
                        Task History
                    </h3>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {completedTasks.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No completed tasks yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Task
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Project
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Completed
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-50">
                                        {completedTasks.map(task => (
                                            <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <p className="text-sm font-medium text-gray-900 line-through">
                                                        {task.title}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <p className="text-sm text-gray-500">
                                                        {task.project?.title || '-'}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <p className="text-sm text-gray-500">
                                                        {format(new Date(task.updated_at), 'MMM d, yyyy')}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <Badge className="bg-green-50 text-green-700 border-green-200">
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
