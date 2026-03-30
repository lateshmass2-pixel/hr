'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { Button } from './button'

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    actionLabel?: string
    onAction?: () => void
    className?: string
    iconColor?: string
    iconBgColor?: string
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className,
    iconColor = 'text-[#0A3B2A]',
    iconBgColor = 'bg-[#0A3B2A]/10'
}: EmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn(
                "flex flex-col items-center justify-center py-16 px-8 text-center",
                className
            )}
        >
            {/* Large Icon with Background Circle */}
            <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className={cn(
                    "w-24 h-24 rounded-full flex items-center justify-center mb-6",
                    "shadow-lg shadow-[#0A3B2A]/10",
                    iconBgColor
                )}
            >
                <Icon className={cn("w-10 h-10", iconColor)} strokeWidth={1.5} />
            </motion.div>

            {/* Title */}
            <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-bold text-[#0F172A] mb-2"
            >
                {title}
            </motion.h3>

            {/* Description */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-[#475569] max-w-sm mb-6"
            >
                {description}
            </motion.p>

            {/* CTA Button */}
            {actionLabel && onAction && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <Button
                        onClick={onAction}
                        className="bg-gradient-to-r from-[#0A3B2A] to-[#064e3b] text-white hover:from-[#064e3b] hover:to-[#022c22] shadow-lg shadow-[#0A3B2A]/20"
                    >
                        {actionLabel}
                    </Button>
                </motion.div>
            )}
        </motion.div>
    )
}
