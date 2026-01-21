'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface BentoGridProps {
    children: ReactNode
    className?: string
}

/**
 * BentoGrid - 2026 Design System
 * 
 * A responsive grid container that creates a Bento-style layout.
 * Automatically handles 1-column mobile → 4-column desktop transitions.
 * 
 * Usage:
 * ```tsx
 * <BentoGrid>
 *   <BentoCell colSpan={2}>Welcome Card</BentoCell>
 *   <BentoCell>Stat 1</BentoCell>
 *   <BentoCell>Stat 2</BentoCell>
 *   <BentoCell colSpan={2} rowSpan={2}>Large Card</BentoCell>
 * </BentoGrid>
 * ```
 */
export function BentoGrid({ children, className }: BentoGridProps) {
    return (
        <div
            className={cn(
                // Base grid setup
                "grid gap-4 md:gap-5",
                // Responsive columns: 1 on mobile, 4 on desktop
                "grid-cols-1 md:grid-cols-4",
                // Auto rows with minimum height
                "auto-rows-[minmax(180px,auto)]",
                className
            )}
        >
            {children}
        </div>
    )
}

export default BentoGrid
