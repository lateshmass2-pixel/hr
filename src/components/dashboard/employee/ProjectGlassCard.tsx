'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, Calendar, Users } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface Project {
    id: string
    title: string
    description: string
    status: string
    progress: number
    deadline: string
    teamLeadId?: string // To mock lead
}

const gradientCovers = [
    'from-orange-500 to-amber-500',
    'from-blue-500 to-indigo-500',
    'from-emerald-500 to-teal-500',
]

export function ProjectGlassCard({ projects }: { projects: Project[] }) {
    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
            {/* Glass Header */}
            <div className="px-8 py-6 border-b border-gray-100 bg-white/50 backdrop-blur-xl flex items-center justify-between sticky top-0 z-10">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Active Projects</h3>
                    <p className="text-sm text-gray-500">You are collaborating on {projects.length} projects</p>
                </div>
                <div className="flex -space-x-2">
                    {/* Mock Team Avatars Header */}
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
                            {String.fromCharCode(64 + i)}
                        </div>
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400">
                        +
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[400px]">
                {projects.map((project, index) => (
                    <motion.div
                        key={project.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group relative bg-gray-50/50 hover:bg-white border border-transparent hover:border-orange-100 rounded-3xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5 cursor-pointer"
                    >
                        <Link href={`/dashboard/projects/${project.id}`} className="block">
                            <div className="flex flex-col md:flex-row gap-6 items-center">
                                {/* Icon / Progress Circle */}
                                <div className="hidden md:flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-100 group-hover:scale-110 transition-transform duration-300">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg bg-gradient-to-br opacity-80",
                                        gradientCovers[index % gradientCovers.length]
                                    )} />
                                </div>

                                <div className="flex-1 w-full space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-lg text-gray-900 group-hover:text-orange-600 transition-colors">
                                                {project.title}
                                            </h4>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {project.deadline ? format(new Date(project.deadline), "MMM d") : "No Deadline"}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Users size={12} />
                                                    Team
                                                </span>
                                            </div>
                                        </div>
                                        <ArrowUpRight className="text-gray-300 group-hover:text-orange-500 transition-colors" />
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-gray-500">Progress</span>
                                            <span className="text-gray-900">{project.progress}%</span>
                                        </div>
                                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${project.progress}%` }}
                                                transition={{ duration: 1, delay: 0.2 }}
                                                className={cn(
                                                    "h-full rounded-full bg-gradient-to-r",
                                                    gradientCovers[index % gradientCovers.length]
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
