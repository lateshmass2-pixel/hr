import { cn } from "@/lib/utils"

interface CardSkeletonProps {
    count?: number
    className?: string
}

export function CardSkeleton({ count = 1, className }: CardSkeletonProps) {
    return (
        <div className={cn("grid gap-4", className)}>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="bg-white rounded-3xl border border-[#e8e4e0] p-5 shadow-md"
                >
                    {/* Top Row - Icon and Badge */}
                    <div className="flex justify-between items-start mb-4">
                        <div
                            className="w-12 h-12 rounded-2xl bg-gray-200 animate-pulse"
                            style={{ animationDelay: `${index * 100}ms` }}
                        />
                        <div
                            className="w-16 h-5 rounded-full bg-gray-100 animate-pulse"
                            style={{ animationDelay: `${index * 100 + 50}ms` }}
                        />
                    </div>

                    {/* Title */}
                    <div
                        className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-1"
                        style={{ animationDelay: `${index * 100 + 100}ms` }}
                    />

                    {/* Subtitle */}
                    <div
                        className="h-4 w-24 bg-gray-100 rounded animate-pulse"
                        style={{ animationDelay: `${index * 100 + 150}ms` }}
                    />
                </div>
            ))}
        </div>
    )
}
