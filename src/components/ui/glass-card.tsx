'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

type GlassVariant = 'default' | 'solid' | 'strip' | 'hover'

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
    children: ReactNode
    variant?: GlassVariant
    padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
    className?: string
    interactive?: boolean
}

const variantClasses: Record<GlassVariant, string> = {
    default: 'glass-panel',
    solid: 'glass-panel-solid',
    strip: 'glass-strip',
    hover: 'glass-panel-hover',
}

const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
}

/**
 * GlassCard - Warm & Airy Design System
 * 
 * A reusable glassmorphism card component with warm orange glow shadows.
 * 
 * Variants:
 * - `default` - Standard frosted glass panel
 * - `solid` - More opaque for important content
 * - `strip` - Thinner glass for list items
 * - `hover` - Interactive with lift animation
 * 
 * @example
 * ```tsx
 * <GlassCard variant="solid" padding="lg">
 *   <h2>Welcome back!</h2>
 * </GlassCard>
 * ```
 */
export function GlassCard({
    children,
    variant = 'default',
    padding = 'md',
    className,
    interactive = false,
    ...motionProps
}: GlassCardProps) {
    return (
        <motion.div
            whileHover={interactive ? { y: -4, scale: 1.01 } : undefined}
            whileTap={interactive ? { scale: 0.99 } : undefined}
            transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
            }}
            className={cn(
                variantClasses[variant],
                paddingClasses[padding],
                interactive && 'cursor-pointer',
                className
            )}
            {...motionProps}
        >
            {children}
        </motion.div>
    )
}

/**
 * GlassStrip - For list items and candidate rows
 */
export function GlassStrip({
    children,
    className,
    expanded = false,
    ...motionProps
}: {
    children: ReactNode
    className?: string
    expanded?: boolean
} & Omit<HTMLMotionProps<'div'>, 'children'>) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
                expanded ? 'candidate-row-expanded' : 'candidate-row',
                className
            )}
            {...motionProps}
        >
            {children}
        </motion.div>
    )
}

/**
 * SoftStatCard - Large stat display with thin typography
 */
export function SoftStatCard({
    icon,
    value,
    label,
    trend,
    onClick,
}: {
    icon: ReactNode
    value: number | string
    label: string
    trend?: string
    onClick?: () => void
}) {
    return (
        <GlassCard
            variant="default"
            padding="lg"
            interactive={!!onClick}
            onClick={onClick}
            className="flex flex-col gap-4"
        >
            <div className="soft-stat-icon">
                {icon}
            </div>
            <div>
                <div className="soft-stat-number">{value}</div>
                <div className="soft-stat-label">{label}</div>
            </div>
            {trend && (
                <span className="text-xs font-medium text-accent-orange">
                    {trend}
                </span>
            )}
        </GlassCard>
    )
}

export default GlassCard
