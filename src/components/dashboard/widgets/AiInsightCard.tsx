'use client';

import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AiInsightCardProps {
    insight: string;
    trend?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function AiInsightCard({ insight, trend, actionLabel = "View details", onAction }: AiInsightCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-50 to-emerald-100 p-[1px] border border-green-200/50"
        >
            {/* Animated Gradient Border */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-green-300 to-emerald-400 opacity-20 blur-sm transition-opacity duration-1000 group-hover:opacity-40 animate-gradient-x" />

            <div className="relative h-full rounded-3xl bg-white/90 p-5 backdrop-blur-xl">
                <div className="flex items-start gap-4">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#14532d] to-[#15803d] text-white shadow-lg shadow-green-900/10">
                        <Sparkles size={20} className="animate-pulse" />

                        {/* Ping effect */}
                        <span className="absolute -right-1 -top-1 flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
                        </span>
                    </div>

                    <div className="flex-1">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-[#14532d]">
                            AI Insight
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] uppercase font-bold text-green-800 tracking-wider">
                                Alpha
                            </span>
                        </h4>

                        <p className="mt-2 text-sm font-medium text-slate-700 leading-relaxed">
                            {insight}
                        </p>

                        {trend && (
                            <p className="mt-1 text-xs text-slate-500">
                                {trend}
                            </p>
                        )}

                        <div className="mt-4 flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 p-0 text-[#15803d] hover:text-[#14532d] hover:bg-transparent group/btn"
                                onClick={onAction}
                            >
                                <span className="mr-1">{actionLabel}</span>
                                <ArrowRight size={14} className="transition-transform group-hover/btn:translate-x-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
