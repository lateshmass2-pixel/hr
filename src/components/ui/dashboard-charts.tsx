'use client'

import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts'
import { SoftCard } from './gradient-stat-card'

// Hiring funnel colors
const DONUT_COLORS = ['#4B7BF5', '#14B8A6', '#F59E0B', '#EC4899']

interface AreaChartCardProps {
    title: string
    subtitle?: string
    data: { month: string; value: number }[]
    color?: string
}

/**
 * AreaChartCard - Smooth area chart with gradient fill
 */
export function AreaChartCard({
    title,
    subtitle,
    data,
    color = '#EC4899'
}: AreaChartCardProps) {
    return (
        <SoftCard className="h-full">
            <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                {subtitle && (
                    <p className="text-sm text-gray-500">{subtitle}</p>
                )}
            </div>

            <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#9CA3AF' }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#9CA3AF' }}
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.15)',
                                padding: '12px 16px'
                            }}
                            labelStyle={{ fontWeight: 600 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={3}
                            fill="url(#areaGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </SoftCard>
    )
}

interface DonutChartCardProps {
    title: string
    data: { name: string; value: number }[]
    colors?: string[]
}

/**
 * DonutChartCard - Thick donut chart for breakdowns
 */
export function DonutChartCard({
    title,
    data,
    colors = DONUT_COLORS
}: DonutChartCardProps) {
    const total = data.reduce((sum, item) => sum + item.value, 0)

    return (
        <SoftCard className="h-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>

            <div className="h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                            strokeWidth={0}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={colors[index % colors.length]}
                                    className="transition-all duration-300 hover:opacity-80"
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.15)',
                                padding: '12px 16px'
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-gray-900">{total}</span>
                    <span className="text-xs text-gray-500">Total</span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3 mt-4">
                {data.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                        <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: colors[index % colors.length] }}
                        />
                        <span className="text-gray-600">{item.name}</span>
                    </div>
                ))}
            </div>
        </SoftCard>
    )
}

interface TimelineEvent {
    id: string
    time: string
    title: string
    avatar?: string
    initials: string
    color: string
}

interface TimelineViewProps {
    title: string
    events: TimelineEvent[]
}

/**
 * TimelineView - Horizontal timeline with avatars
 */
export function TimelineView({ title, events }: TimelineViewProps) {
    return (
        <SoftCard>
            <h3 className="text-lg font-bold text-gray-900 mb-6">{title}</h3>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-100" />

                {/* Events */}
                <div className="flex justify-between relative">
                    {events.map((event, index) => (
                        <div key={event.id} className="flex flex-col items-center">
                            {/* Avatar */}
                            <div
                                className="w-12 h-12 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-sm z-10"
                                style={{ background: event.color }}
                            >
                                {event.initials}
                            </div>

                            {/* Time */}
                            <span className="mt-3 text-sm font-semibold text-gray-900">{event.time}</span>

                            {/* Title */}
                            <span className="text-xs text-gray-500 text-center max-w-[80px] mt-1">
                                {event.title}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </SoftCard>
    )
}

export default { AreaChartCard, DonutChartCard, TimelineView }
