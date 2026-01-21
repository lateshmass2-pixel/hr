'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

type ColSpan = 1 | 2 | 3 | 4
type RowSpan = 1 | 2

interface BentoCellProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
    children: ReactNode
    colSpan?: ColSpan
    rowSpan?: RowSpan
    variant?: 'glass' | 'solid' | 'transparent'
    interactive?: boolean
    className?: string
}

const colSpanClasses: Record<ColSpan, string> = {
    1: 'md:col-span-1',
    2: 'md:col-span-2',
    3: 'md:col-span-3',
    4: 'md:col-span-4',
}

const rowSpanClasses: Record<RowSpan, string> = {
    1: 'md:row-span-1',
    2: 'md:row-span-2',
}

const variantClasses: Record<string, string> = {
    glass: 'glass-card',
    solid: 'glass-card-solid',
    transparent: 'bg-transparent',
}

/**
 * BentoCell - 2026 Design System
 * 
 * An interactive grid cell with spring-based "squishy" animations.
 * Applies Claymorphism glass styling by default.
 * 
 * Props:
 * - colSpan: 1-4 (default: 1)
 * - rowSpan: 1-2 (default: 1)
 * - variant: 'glass' | 'solid' | 'transparent' (default: 'glass')
 * - interactive: enables hover/tap animations (default: true)
 */
export function BentoCell({
    children,
    colSpan = 1,
    rowSpan = 1,
    variant = 'glass',
    interactive = true,
    className,
    ...motionProps
}: BentoCellProps) {
    return (
        <motion.div
            // Spring-based "squishy" interaction
            whileHover={interactive ? { scale: 1.02, y: -4 } : undefined}
            whileTap={interactive ? { scale: 0.98 } : undefined}
            transition={{
                type: 'spring',
                stiffness: 400,
                damping: 17,
            }}
            className={cn(
                // Base layout
                'col-span-1',
                colSpanClasses[colSpan],
                rowSpanClasses[rowSpan],
                // Visual styling
                'rounded-3xl p-6',
                variantClasses[variant],
                // Cursor
                interactive && 'cursor-pointer',
                // Custom classes
                className
            )}
            {...motionProps}
        >
            {children}
        </motion.div>
    )
}

export default BentoCell
