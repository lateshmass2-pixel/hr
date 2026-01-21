'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

type GradientVariant = 'pink' | 'peach' | 'blue' | 'mint' | 'indigo'

interface GradientStatCardProps {
    title: string
    value: number | string
    trend?: string
    trendDirection?: 'up' | 'down'
    icon?: ReactNode
    variant: GradientVariant
    href?: string
    subtitle?: string
}

const variantStyles: Record<GradientVariant, { gradient: string; iconBg: string; iconColor: string }> = {
    pink: {
        gradient: 'gradient-pink',
        iconBg: 'bg-pink-100/80',
        iconColor: 'text-pink-600',
    },
    peach: {
        gradient: 'gradient-peach',
        iconBg: 'bg-orange-100/80',
        iconColor: 'text-orange-600',
    },
    blue: {
        gradient: 'gradient-peach',
        iconBg: 'bg-orange-100/80',
        iconColor: 'text-orange-600',
    },
    mint: {
        gradient: 'gradient-mint',
        iconBg: 'bg-emerald-100/80',
        iconColor: 'text-emerald-600',
    },
    indigo: {
        gradient: 'gradient-indigo',
        iconBg: 'bg-blue-100/80',
        iconColor: 'text-blue-600',
    },
}

/**
 * GradientStatCard - Pastel Gradient Design System
 * 
 * A stat card with soft pastel gradients matching the reference design.
 * 
 * @example
 * ```tsx
 * <GradientStatCard
 *   title="Total Employees"
 *   value={156}
 *   trend="+12%"
 *   variant="pink"
 *   icon={<Users size={20} />}
 * />
 * ```
 */
export function GradientStatCard({
    title,
    value,
    trend,
    trendDirection = 'up',
    icon,
    variant,
    href,
    subtitle,
}: GradientStatCardProps) {
    const styles = variantStyles[variant]

    const CardWrapper = href ? motion.a : motion.div

    return (
        <CardWrapper
            href={href}
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
                'gradient-card block',
                styles.gradient,
                href && 'cursor-pointer'
            )}
        >
            {/* Header: Icon + Trend */}
            <div className="flex items-start justify-between mb-4">
                {icon && (
                    <div className={cn(
                        'w-11 h-11 rounded-2xl flex items-center justify-center',
                        styles.iconBg,
                        styles.iconColor
                    )}>
                        {icon}
                    </div>
                )}

                {trend && (
                    <div className={cn(
                        'trend-badge',
                        trendDirection === 'up' ? 'trend-badge-up' : 'trend-badge-down'
                    )}>
                        {trendDirection === 'up' ? (
                            <TrendingUp size={12} />
                        ) : (
                            <TrendingDown size={12} />
                        )}
                        {trend}
                    </div>
                )}
            </div>

            {/* Value */}
            <div className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                {value}
            </div>

            {/* Title */}
            <div className="text-sm font-medium text-gray-600">
                {title}
            </div>

            {/* Subtitle (optional) */}
            {subtitle && (
                <div className="text-xs text-gray-500 mt-1">
                    {subtitle}
                </div>
            )}
        </CardWrapper>
    )
}

/**
 * SoftCard - White card with soft shadow
 */
export function SoftCard({
    children,
    className,
    hover = false,
    padding = 'md',
}: {
    children: ReactNode
    className?: string
    hover?: boolean
    padding?: 'sm' | 'md' | 'lg'
}) {
    const paddingClasses = {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    }

    return (
        <div className={cn(
            hover ? 'soft-card-hover' : 'soft-card',
            paddingClasses[padding],
            className
        )}>
            {children}
        </div>
    )
}

export default GradientStatCard
