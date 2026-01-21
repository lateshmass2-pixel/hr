import { cn } from "@/lib/utils"

interface TableSkeletonProps {
    rows?: number
    columns?: number
    className?: string
}

export function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
    return (
        <div className={cn("bg-white rounded-2xl border border-[#e8e4e0] overflow-hidden", className)}>
            {/* Header */}
            <div className="flex gap-4 p-4 border-b border-[#e8e4e0] bg-[#faf8f5]">
                {Array.from({ length: columns }).map((_, i) => (
                    <div
                        key={`header-${i}`}
                        className="h-4 bg-gray-200 rounded animate-pulse"
                        style={{ width: `${100 / columns}%` }}
                    />
                ))}
            </div>

            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div
                    key={`row-${rowIndex}`}
                    className="flex gap-4 p-4 border-b border-[#e8e4e0] last:border-b-0"
                >
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <div
                            key={`cell-${rowIndex}-${colIndex}`}
                            className="h-4 bg-gray-100 rounded animate-pulse"
                            style={{
                                width: colIndex === 0 ? '30%' : `${70 / (columns - 1)}%`,
                                animationDelay: `${(rowIndex * columns + colIndex) * 50}ms`
                            }}
                        />
                    ))}
                </div>
            ))}
        </div>
    )
}
