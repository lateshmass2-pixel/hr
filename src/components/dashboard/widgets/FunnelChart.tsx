'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

interface FunnelData {
    name: string;
    value: number;
    fill?: string;
}

interface FunnelChartProps {
    data: FunnelData[];
}

const COLORS = ['#14532d', '#15803d', '#16a34a', '#86efac']; // Green spectrum: 900, 700, 600, 300

export function FunnelChart({ data }: FunnelChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex h-[300px] w-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
                <p className="text-sm text-gray-500">No funnel data available</p>
            </div>
        );
    }

    // Calculate conversion rates
    const maxVal = Math.max(...data.map(d => d.value));

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-100"
        >
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Hiring Funnel</h3>
                    <p className="text-sm text-slate-500">Candidate progression overview</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <span className="h-2 w-2 rounded-full bg-blue-400" /> Conversions
                    </span>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        layout="vertical"
                        data={data}
                        margin={{ top: 0, right: 30, left: 20, bottom: 5 }}
                        barSize={32}
                    >
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748B', fontSize: 13, fontWeight: 500 }}
                            width={80}
                        />
                        <Tooltip
                            cursor={{ fill: '#F1F5F9', opacity: 0.4 }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-xl">
                                            <p className="font-semibold text-slate-900">{data.name}</p>
                                            <p className="text-sm text-slate-500">
                                                Candidates: <span className="font-medium text-slate-900">{data.value}</span>
                                            </p>
                                            <p className="mt-1 text-xs text-slate-400">
                                                {Math.round((data.value / maxVal) * 100)}% of total
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={1500}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Conversion Stat - Simplified footer */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-4">
                <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Applications</p>
                    <p className="text-lg font-bold text-slate-900">{data.find(d => d.name === 'Applied')?.value || 0}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Conversion Rate</p>
                    <p className="text-lg font-bold text-emerald-600">
                        {data.length > 0 && data[0].value > 0
                            ? ((data[data.length - 1].value / data[0].value) * 100).toFixed(1) + '%'
                            : '0%'}
                    </p>
                </div>
            </div>

        </motion.div>
    );
}
