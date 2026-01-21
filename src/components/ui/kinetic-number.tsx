'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useSpring, useTransform, animate } from 'framer-motion'
import { cn } from '@/lib/utils'

interface KineticNumberProps {
    value: number | string
    className?: string
    duration?: number
    delay?: number
}

/**
 * KineticNumber - 2026 Design System
 * 
 * Displays numbers with a slot-machine "roll" animation.
 * Each digit animates in with a staggered delay for dramatic effect.
 * 
 * Usage:
 * ```tsx
 * <KineticNumber value={1234} className="text-4xl font-bold" />
 * ```
 */
export function KineticNumber({
    value,
    className,
    duration = 0.8,
    delay = 0
}: KineticNumberProps) {
    const [displayValue, setDisplayValue] = useState(0)
    const [hasAnimated, setHasAnimated] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value

    useEffect(() => {
        // Intersection Observer for viewport-based animation trigger
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasAnimated) {
                        setHasAnimated(true)

                        // Animate from 0 to target value
                        const controls = animate(0, numericValue, {
                            duration: duration,
                            delay: delay,
                            ease: [0.16, 1, 0.3, 1], // Custom easing for smooth roll
                            onUpdate: (latest) => {
                                setDisplayValue(Math.round(latest))
                            },
                        })

                        return () => controls.stop()
                    }
                })
            },
            { threshold: 0.3 }
        )

        if (ref.current) {
            observer.observe(ref.current)
        }

        return () => observer.disconnect()
    }, [numericValue, duration, delay, hasAnimated])

    // Convert to string and split into individual digits for styling
    const digits = displayValue.toString().split('')

    return (
        <div ref={ref} className={cn('overflow-hidden', className)}>
            <span className="inline-flex">
                {digits.map((digit, index) => (
                    <motion.span
                        key={`${index}-${digit}`}
                        initial={{ y: 20, opacity: 0 }}
                        animate={hasAnimated ? { y: 0, opacity: 1 } : {}}
                        transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 25,
                            delay: index * 0.05,
                        }}
                        className="inline-block tabular-nums"
                    >
                        {digit}
                    </motion.span>
                ))}
            </span>
        </div>
    )
}

/**
 * KineticCounter - Alternative with continuous counting animation
 */
interface KineticCounterProps {
    from?: number
    to: number
    className?: string
    duration?: number
}

export function KineticCounter({
    from = 0,
    to,
    className,
    duration = 1.5
}: KineticCounterProps) {
    const [count, setCount] = useState(from)
    const [hasAnimated, setHasAnimated] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasAnimated) {
                        setHasAnimated(true)

                        const controls = animate(from, to, {
                            duration: duration,
                            ease: [0.34, 1.56, 0.64, 1], // Bouncy spring
                            onUpdate: (latest) => setCount(Math.round(latest)),
                        })

                        return () => controls.stop()
                    }
                })
            },
            { threshold: 0.3 }
        )

        if (ref.current) {
            observer.observe(ref.current)
        }

        return () => observer.disconnect()
    }, [from, to, duration, hasAnimated])

    return (
        <motion.div
            ref={ref}
            className={cn('tabular-nums', className)}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={hasAnimated ? { scale: 1, opacity: 1 } : {}}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            {count.toLocaleString()}
        </motion.div>
    )
}

export default KineticNumber
