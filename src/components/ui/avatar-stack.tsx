'use client'

import { cn } from '@/lib/utils'

interface AvatarData {
    id: string
    name: string
    avatar?: string
}

interface AvatarStackProps {
    avatars: AvatarData[]
    maxVisible?: number
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const sizeClasses = {
    sm: 'w-6 h-6 text-[8px]',
    md: 'w-8 h-8 text-[10px]',
    lg: 'w-10 h-10 text-xs'
}

const overlapClasses = {
    sm: '-space-x-2',
    md: '-space-x-2.5',
    lg: '-space-x-3'
}

const borderClasses = {
    sm: 'border-[1.5px]',
    md: 'border-2',
    lg: 'border-2'
}

// Generate consistent colors based on name
function getAvatarColor(name: string): string {
    const colors = [
        'bg-indigo-100 text-indigo-700',
        'bg-emerald-100 text-emerald-700',
        'bg-amber-100 text-amber-700',
        'bg-rose-100 text-rose-700',
        'bg-cyan-100 text-cyan-700',
        'bg-purple-100 text-purple-700',
        'bg-orange-100 text-orange-700',
    ]
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    return colors[index]
}

export function AvatarStack({
    avatars,
    maxVisible = 4,
    size = 'md',
    className
}: AvatarStackProps) {
    const visibleAvatars = avatars.slice(0, maxVisible)
    const remainingCount = avatars.length - maxVisible

    return (
        <div className={cn("flex items-center", overlapClasses[size], className)}>
            {visibleAvatars.map((avatar, index) => (
                <div
                    key={avatar.id}
                    className={cn(
                        "relative rounded-full border-white shadow-sm",
                        "hover:z-10 hover:scale-110 transition-all duration-200 cursor-pointer",
                        sizeClasses[size],
                        borderClasses[size]
                    )}
                    style={{ zIndex: visibleAvatars.length - index }}
                    title={avatar.name}
                >
                    {avatar.avatar ? (
                        <img
                            src={avatar.avatar}
                            alt={avatar.name}
                            className="w-full h-full rounded-full object-cover"
                        />
                    ) : (
                        <div className={cn(
                            "w-full h-full rounded-full flex items-center justify-center font-bold",
                            getAvatarColor(avatar.name)
                        )}>
                            {avatar.name.substring(0, 2).toUpperCase()}
                        </div>
                    )}
                </div>
            ))}

            {/* Overflow Indicator */}
            {remainingCount > 0 && (
                <div
                    className={cn(
                        "relative rounded-full border-white bg-gray-100 text-gray-600",
                        "flex items-center justify-center font-medium shadow-sm",
                        sizeClasses[size],
                        borderClasses[size]
                    )}
                    style={{ zIndex: 0 }}
                    title={`+${remainingCount} more`}
                >
                    +{remainingCount}
                </div>
            )}
        </div>
    )
}
