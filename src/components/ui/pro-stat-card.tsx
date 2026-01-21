'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ProStatCardProps {
    title: string
    value: number | string
    trend?: {
        value: number
        label: string
        isPositive?: boolean
    }
    sparklineData?: number[]
    icon: React.ReactNode
    iconGradient?: string
    href?: string
    badge?: string
    badgeColor?: 'emerald' | 'blue' | 'purple' | 'amber' | 'coral'
}

const badgeColors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    coral: 'bg-[#e07850]/10 text-[#e07850] border-[#e07850]/20'
}

export function ProStatCard({
    title,
    value,
    trend,
    sparklineData,
    icon,
    iconGradient = 'from-[#e07850] to-[#d45a3a]',
    href,
    badge,
    badgeColor = 'emerald'
}: ProStatCardProps) {
    // Transform sparkline data for recharts
    const chartData = sparklineData?.map((v, i) => ({ value: v, index: i })) || []

    const CardContent = (
        <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
                "relative overflow-hidden bg-white p-5 rounded-3xl border border-[#e8e4e0]",
                "shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group h-full"
            )}
        >
            {/* Sparkline Background */}
            {sparklineData && sparklineData.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20 group-hover:opacity-30 transition-opacity">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#e07850" stopOpacity={0.4} />
                                    <stop offset="100%" stopColor="#e07850" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#e07850"
                                strokeWidth={2}
                                fill="url(#sparkGradient)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Top Row: Icon + Badge/Trend */}
            <div className="flex justify-between items-start mb-2 relative z-10">
                <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-white",
                    "bg-gradient-to-br shadow-md group-hover:scale-105 transition-transform",
                    iconGradient
                )}>
                    {icon}
                </div>

                {/* Trend Indicator */}
                {trend && (
                    <span className={cn(
                        "text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 border",
                        trend.isPositive !== false
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-700 border-red-200"
                    )}>
                        {trend.isPositive !== false ? (
                            <TrendingUp size={10} />
                        ) : (
                            <TrendingDown size={10} />
                        )}
                        {trend.label}
                    </span>
                )}

                {/* Badge (alternative to trend) */}
                {badge && !trend && (
                    <span className={cn(
                        "text-xs font-medium px-2 py-1 rounded-full border",
                        badgeColors[badgeColor]
                    )}>
                        {badge}
                    </span>
                )}
            </div>

            {/* Value */}
            <div className="text-3xl font-bold text-[#1a1a1a] mt-3 relative z-10">
                {value}
            </div>

            {/* Title */}
            <div className="text-sm text-[#6b6b6b] relative z-10">
                {title}
            </div>
        </motion.div>
    )

    if (href) {
        return <Link href={href}>{CardContent}</Link>
    }

    return CardContent
}
