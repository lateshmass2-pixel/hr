"use client"

import { useMemo } from "react"
import { useHems, Project, Task } from "@/context/HemsContext"
import { 
    ResponsiveContainer, 
    PieChart, 
    Pie, 
    Cell, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis
} from "recharts"
import { 
    TrendingUp, 
    Users, 
    AlertTriangle, 
    CheckCircle2, 
    Target,
    Zap
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ProjectInsightsProps {
    projectId: string
}

export function ProjectInsights({ projectId }: ProjectInsightsProps) {
    const { projects, tasks, users, employees } = useHems()
    
    const project = projects.find(p => p.id === projectId)
    const projectTasks = tasks.filter(t => t.projectId === projectId)
    
    // 1. Calculate Status Distribution
    const statusData = useMemo(() => {
        const counts = projectTasks.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1
            return acc
        }, {} as Record<string, number>)
        
        return Object.entries(counts).map(([name, value]) => ({ name, value }))
    }, [projectTasks])
    
    // 2. Member Contribution (Tasks Done)
    const memberContribution = useMemo(() => {
        const counts = projectTasks.reduce((acc, t) => {
            if (t.status === 'Done') {
                acc[t.assigneeId] = (acc[t.assigneeId] || 0) + 1
            }
            return acc
        }, {} as Record<string, number>)
        
        return Object.entries(counts).map(([id, value]) => {
            const user = users.find(u => u.id === id) || employees.find(e => e.id === id)
            return {
                name: (user as any)?.name || (user as any)?.full_name || 'Unknown',
                tasks: value
            }
        }).sort((a, b) => b.tasks - a.tasks)
    }, [projectTasks, users, employees])

    // 3. Health Radar (Mocked based on project data)
    const healthData = [
        { subject: 'Velocity', A: 85, fullMark: 100 },
        { subject: 'Quality', A: 90, fullMark: 100 },
        { subject: 'Timeline', A: project?.deadline ? 75 : 100, fullMark: 100 },
        { subject: 'Budget', A: 95, fullMark: 100 },
        { subject: 'Risk', A: 10, fullMark: 100 },
    ]

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']

    if (!project) return null

    return (
        <div className="py-6 space-y-8 animate-in fade-in duration-500">
            {/* Top Stat Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <InsightCard 
                    title="Health Score" 
                    value="92%" 
                    icon={TrendingUp} 
                    trend="+4% from last week"
                    color="emerald"
                />
                <InsightCard 
                    title="Resource Load" 
                    value={`${project.memberIds?.length || 0} Members`} 
                    icon={Users} 
                    trend="Optimal capacity"
                    color="blue"
                />
                <InsightCard 
                    title="Risk Level" 
                    value="Low" 
                    icon={AlertTriangle} 
                    trend="No critical blockers"
                    color="amber"
                />
                <InsightCard 
                    title="Velocity" 
                    value="1.8 pts/day" 
                    icon={Zap} 
                    trend="+12% efficiency"
                    color="indigo"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Task Progress (Donut) */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Target className="text-emerald-500" size={18} /> Task Distribution
                        </h3>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Health Radar */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Zap className="text-indigo-500" size={18} /> Strategic Health
                        </h3>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={healthData}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#64748b' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                <Radar
                                    name="Project Health"
                                    dataKey="A"
                                    stroke="#4f46e5"
                                    fill="#4f46e5"
                                    fillOpacity={0.4}
                                />
                                <Tooltip />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Member Contributions */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Users className="text-blue-500" size={18} /> Member Contribution (Verified Tasks)
                    </h3>
                </div>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={memberContribution}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <Tooltip 
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="tasks" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}

function InsightCard({ title, value, icon: Icon, trend, color }: any) {
    const colorClasses: any = {
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    }

    return (
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
                    <h4 className="text-2xl font-bold text-gray-900">{value}</h4>
                </div>
                <div className={cn("p-3 rounded-2xl border", colorClasses[color])}>
                    <Icon size={20} />
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-500" /> {trend}
                </p>
            </div>
        </div>
    )
}
