'use client';

import { motion } from 'framer-motion';
import { Users, FolderKanban, Briefcase, Zap } from 'lucide-react';
import { KineticCounter } from '@/components/ui/kinetic-number';

interface HeroProps {
    userName: string;
    stats: {
        totalEmployees: number;
        activeProjects: number;
        openRoles: number;
        pendingActions: number;
    };
}

export function Hero({ userName, stats }: HeroProps) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-r from-[#0f3d2e] via-[#134e4a] to-[#14532d] shadow-xl"
        >
            {/* Background Pattern - Subtle Grid */}
            <div className="absolute inset-0 z-0 opacity-[0.05]"
                style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                    backgroundSize: '24px 24px',
                }}
            />

            {/* Glowing Orbs */}
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl filter" />
            <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl filter" />

            <div className="relative z-10 p-8 lg:p-10">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                    {/* Greeting Section */}
                    <div className="max-w-xl space-y-2">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                        >
                            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-200 backdrop-blur-md border border-white/10">
                                <span className="mr-1.5 flex h-2 w-2 relative">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                                </span>
                                System Operational
                            </span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.6 }}
                            className="text-4xl font-extrabold tracking-tight text-white lg:text-5xl"
                        >
                            {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-emerald-200">{userName}</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.6 }}
                            className="text-lg text-slate-300 font-medium"
                        >
                            Here's your command center overview for today.
                        </motion.p>
                    </div>

                    {/* Quick Stats Grid - Inside Hero */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                        className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:w-auto"
                    >
                        <HeroStat
                            label="Employees"
                            value={stats.totalEmployees}
                            icon={<Users className="text-blue-400" size={18} />}
                            delay={0.6}
                        />
                        <HeroStat
                            label="Projects"
                            value={stats.activeProjects}
                            icon={<FolderKanban className="text-emerald-400" size={18} />}
                            delay={0.7}
                        />
                        <HeroStat
                            label="Open Rolls"
                            value={stats.openRoles}
                            icon={<Briefcase className="text-amber-400" size={18} />}
                            delay={0.8}
                        />
                        <HeroStat
                            label="Actions"
                            value={stats.pendingActions}
                            icon={<Zap className="text-rose-400" size={18} />}
                            delay={0.9}
                        />
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}

function HeroStat({ label, value, icon, delay }: { label: string; value: number; icon: React.ReactNode; delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            className="group flex flex-col justify-between rounded-2xl bg-white/5 p-4 backdrop-blur-md transition-all hover:bg-white/10 hover:shadow-lg hover:-translate-y-1 border border-white/5"
        >
            <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-slate-200 transition-colors">
                    {label}
                </span>
                <div className="opacity-70 group-hover:opacity-100 transition-opacity">
                    {icon}
                </div>
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">
                <KineticCounter to={value} />
            </div>
        </motion.div>
    );
}
