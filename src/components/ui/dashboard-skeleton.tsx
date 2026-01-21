'use client'

import { cn } from '@/lib/utils'

interface DashboardSkeletonProps {
    className?: string
}

function ShimmerBlock({ className }: { className?: string }) {
    return (
        <div className={cn(
            "relative overflow-hidden bg-gray-200/60 rounded-2xl",
            "before:absolute before:inset-0 before:-translate-x-full",
            "before:animate-[shimmer_2s_infinite]",
            "before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
            className
        )} />
    )
}

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
    return (
        <div className={cn("space-y-6 animate-pulse", className)}>
            {/* Greeting Skeleton */}
            <div className="flex items-center gap-4">
                <ShimmerBlock className="w-14 h-14 rounded-2xl" />
                <div className="space-y-2">
                    <ShimmerBlock className="h-7 w-56" />
                    <ShimmerBlock className="h-4 w-40" />
                </div>
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white p-5 rounded-3xl border border-[#e8e4e0] shadow-md">
                        <div className="flex justify-between items-start mb-4">
                            <ShimmerBlock className="w-12 h-12 rounded-2xl" />
                            <ShimmerBlock className="w-20 h-6 rounded-full" />
                        </div>
                        <ShimmerBlock className="h-8 w-16 mb-2" />
                        <ShimmerBlock className="h-4 w-24" />
                    </div>
                ))}
            </div>

            {/* Action Center Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <ShimmerBlock className="h-5 w-36" />
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white p-4 rounded-2xl border border-[#e8e4e0] flex items-center gap-4">
                            <ShimmerBlock className="w-12 h-12 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <ShimmerBlock className="h-5 w-48" />
                                <ShimmerBlock className="h-4 w-32" />
                            </div>
                            <ShimmerBlock className="w-20 h-8 rounded-full" />
                        </div>
                    ))}
                </div>
                <div className="bg-white rounded-3xl border border-[#e8e4e0] shadow-md p-6">
                    <ShimmerBlock className="h-5 w-32 mb-6" />
                    <ShimmerBlock className="h-[200px] w-full rounded-xl" />
                </div>
            </div>
        </div>
    )
}

export function ProjectBoardSkeleton() {
    return (
        <div className="flex gap-6 h-full animate-pulse">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="w-80 flex flex-col">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <ShimmerBlock className="h-5 w-20" />
                        <ShimmerBlock className="h-5 w-8 rounded-full" />
                    </div>
                    <div className="flex-1 bg-gray-50/50 rounded-2xl border border-dashed border-[#e8e4e0] p-3 space-y-3">
                        {[...Array(3 - i)].map((_, j) => (
                            <div key={j} className="bg-white p-4 rounded-xl border border-[#e8e4e0]">
                                <ShimmerBlock className="h-4 w-16 mb-3 rounded-full" />
                                <ShimmerBlock className="h-5 w-full mb-4" />
                                <div className="flex items-center gap-2">
                                    <ShimmerBlock className="w-6 h-6 rounded-full" />
                                    <ShimmerBlock className="h-3 w-16" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
