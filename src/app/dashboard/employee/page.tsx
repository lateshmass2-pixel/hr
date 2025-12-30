import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Employee Workspace</h2>
                    <p className="text-muted-foreground">
                        Welcome, <span className="font-medium">{userName}</span>
                    </p>
                </div>
                <form action={signOut}>
                    <Button variant="outline" type="submit">
                        <LogOut className="mr-2 h-4 w-4" /> Sign Out
                    </Button>
                </form>
            </div>

            {/* Active Tasks */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-blue-500" /> Current Tasks
                </h3>
                {activeTasks.length === 0 ? (
                    <Card className="bg-muted/50 border-dashed">
                        <CardContent className="h-32 flex items-center justify-center text-muted-foreground">
                            No active tasks assigned to you.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {activeTasks.map(task => (
                            <Card key={task.id} className="border-l-4 border-l-blue-500">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="outline" className="mb-2 uppercase text-xs">
                                            {task.project?.title || 'No Project'}
                                        </Badge>
                                        <Badge variant={task.priority === 'HIGH' ? 'destructive' : 'secondary'}>
                                            {task.priority}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-base">{task.title}</CardTitle>
                                    {task.deadline && (
                                        <CardDescription className="flex items-center gap-1 text-xs">
                                            <Clock className="h-3 w-3" />
                                            Due {format(new Date(task.deadline), 'MMM d')}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                        {task.description}
                                    </p>
                                    <form action={async () => {
                                        'use server'
                                        await updateTaskStatus(task.id, 'READY_FOR_REVIEW')
                                    }}>
                                        <Button size="sm" className="w-full">
                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Done
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Task History */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-green-500" /> Task History
                </h3>
                <Card>
                    <CardContent className="p-0">
                        {completedTasks.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                No completed tasks yet.
                            </div>
                        ) : (
                            <div className="divide-y">
                                {completedTasks.map(task => (
                                    <div key={task.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                                        <div className="space-y-1">
                                            <p className="font-medium text-sm line-through text-muted-foreground">
                                                {task.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {task.project?.title} • {format(new Date(task.updated_at), 'MMM d, yyyy')}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            {task.status.replace(/_/g, ' ')}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
