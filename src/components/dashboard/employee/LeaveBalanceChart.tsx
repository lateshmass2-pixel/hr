'use client'

import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

const data = [
    { name: 'Casual', value: 4, total: 12, fill: '#06b6d4', label: 'Casual Leave' },
    { name: 'Sick', value: 1, total: 7, fill: '#ec4899', label: 'Sick Leave' },
    { name: 'Privilege', value: 0, total: 15, fill: '#8b5cf6', label: 'Privilege Leave' },
]

export function LeaveBalanceChart() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-8"
        >
            <div className="flex-1 w-full">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Leave Balance</h3>
                        <p className="text-sm text-gray-500">Remaining holidays for 2024</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {data.map((item, index) => (
                        <div key={item.name} className="flex flex-col items-center">
                            <div className="h-32 w-32 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadialBarChart
                                        innerRadius="70%"
                                        outerRadius="100%"
                                        barSize={10}
                                        data={[{ value: item.value }]}
                                        startAngle={90}
                                        endAngle={-270}
                                    >
                                        <PolarAngleAxis
                                            type="number"
                                            domain={[0, item.total]}
                                            angleAxisId={0}
                                            tick={false}
                                        />
                                        <RadialBar
                                            background
                                            dataKey="value"
                                            cornerRadius={10}
                                            fill={item.fill}
                                        />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xl font-bold text-gray-900">{item.total - item.value}</span>
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">Left</span>
                                </div>
                            </div>
                            <div className="text-center mt-2">
                                <p className="font-semibold text-gray-900">{item.label}</p>
                                <p className="text-xs text-gray-500">{item.value}/{item.total} used</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full md:w-auto flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8">
                <Button className="h-14 px-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 text-white font-semibold text-lg transition-all hover:scale-105 active:scale-95">
                    <Plus className="mr-2 h-5 w-5" />
                    Apply for Leave
                </Button>
                <p className="text-xs text-center text-gray-400 mt-3 max-w-[200px]">
                    Need a break? Submit a request for approval.
                </p>
            </div>
        </motion.div>
    )
}
