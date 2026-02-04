import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { Users, FileText } from 'lucide-react'

export default function Loading() {
    return (
        <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-14 h-14 rounded-2xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Side: Employee List Skeleton */}
                <div className="lg:col-span-1">
                    <div className="rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden sticky top-6">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Users className="h-5 w-5 text-gray-300" />
                                <Skeleton className="h-5 w-24" />
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="p-4 flex items-center gap-3">
                                    <Skeleton className="w-10 h-10 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side: Performance Reports Skeleton */}
                <div className="lg:col-span-2 space-y-6">
                    {[1, 2].map((i) => (
                        <div key={i} className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
                                <Skeleton className="w-14 h-14 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-40" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            </div>
                            <div className="p-6 space-y-6">
                                <Skeleton className="h-16 w-full rounded-xl" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
