'use client';

import { theme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PageHeroProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    className?: string;
}

export function PageHero({ title, subtitle, action, className }: PageHeroProps) {
    return (
        <div
            className={cn(
                "relative flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 rounded-3xl shadow-xl overflow-hidden",
                theme.heroGradient,
                className
            )}
        >
            {/* Background Pattern - Subtle Grid */}
            <div className="absolute inset-0 z-0 opacity-[0.05]"
                style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                    backgroundSize: '24px 24px',
                }}
            />

            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative z-10"
            >
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    {title}
                </h1>
                {subtitle && (
                    <p className="mt-2 text-green-100 font-medium max-w-2xl">
                        {subtitle}
                    </p>
                )}
            </motion.div>

            {action && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative z-10 flex-shrink-0"
                >
                    {action}
                </motion.div>
            )}
        </div>
    );
}
