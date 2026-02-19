'use client';

import { motion } from 'framer-motion';
import { KineticCounter } from '@/components/ui/kinetic-number';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    trend?: string;
    trendDirection?: 'up' | 'down' | 'neutral';
    color?: string; // Kept for API compatibility but ignored for styling to enforce theme
    delay?: number;
}

export function KpiCard({ title, value, icon, trend, trendDirection = 'neutral', delay = 0 }: KpiCardProps) {
    // Enforcing strict Green Theme as per requirements
    // Icon bg: bg-green-100
    // Icon text: text-green-700

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="group relative overflow-hidden rounded-3xl bg-white p-6 shadow-lg border border-green-100/50 hover:shadow-xl hover:border-green-200 transition-all duration-300"
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-[#14532d] tracking-tight">
                            <KineticCounter to={value} />
                        </span>
                    </div>
                </div>
                <div className="rounded-xl p-3 bg-green-50 text-[#15803d] ring-1 ring-green-100/50 group-hover:bg-green-100 transition-colors">
                    {icon}
                </div>
            </div>

            {/* Footer with Trend */}
            <div className="mt-4 flex items-center gap-2">
                {trend && (
                    <div className={cn(
                        "flex items-center text-xs font-semibold px-2 py-0.5 rounded-full",
                        trendDirection === 'up' ? "bg-green-100 text-green-700" :
                            trendDirection === 'down' ? "bg-red-50 text-red-600" :
                                "bg-slate-100 text-slate-600"
                    )}>
                        {trendDirection === 'up' && <ArrowUpRight size={14} className="mr-1" />}
                        {trendDirection === 'down' && <ArrowDownRight size={14} className="mr-1" />}
                        {trendDirection === 'neutral' && <Minus size={14} className="mr-1" />}
                        {trend}
                    </div>
                )}
                <span className="text-xs text-slate-400">vs last month</span>
            </div>

            {/* Subtle decorative blob */}
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-10 blur-2xl bg-[#16a34a]" />
        </motion.div>
    );
}
