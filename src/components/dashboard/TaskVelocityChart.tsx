'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface TaskVelocityChartProps {
    completedTasks: number
    pendingTasks: number
}

const COLORS = ['#10b981', '#f59e0b']

export function TaskVelocityChart({ completedTasks, pendingTasks }: TaskVelocityChartProps) {
    const data = [
        { name: 'Completed', value: completedTasks },
        { name: 'Pending', value: pendingTasks },
    ]

    const total = completedTasks + pendingTasks
    const completionRate = total > 0 ? Math.round((completedTasks / total) * 100) : 0

    if (total === 0) {
        return (
            <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-md p-6">
                <h3 className="font-semibold text-[#0F172A] mb-4">Task Velocity</h3>
                <div className="h-[200px] flex items-center justify-center text-[#94A3B8]">
                    No tasks yet
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#0F172A]">Task Velocity</h3>
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                    {completionRate}% Complete
                </span>
            </div>
            <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                borderRadius: '12px',
                                border: '1px solid #E2E8F0',
                                backgroundColor: '#ffffff',
                                color: '#0F172A',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value) => <span className="text-sm text-[#475569]">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2 text-sm">
                <div className="text-center">
                    <div className="font-bold text-[#0F172A]">{completedTasks}</div>
                    <div className="text-[#475569] text-xs">Completed</div>
                </div>
                <div className="text-center">
                    <div className="font-bold text-[#0F172A]">{pendingTasks}</div>
                    <div className="text-[#475569] text-xs">Pending</div>
                </div>
            </div>
        </div>
    )
}
