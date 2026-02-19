export default function Loading() {
    return (
        <div className="p-8 space-y-8">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center mb-6">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="flex gap-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
            </div>

            {/* Stats Cards Skeleton (4 cards) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-white rounded-xl border border-gray-100 p-6 flex flex-col justify-between shadow-sm">
                        <div className="flex justify-between">
                            <div className="h-10 w-10 bg-gray-100 rounded-full animate-pulse"></div>
                            <div className="h-4 w-12 bg-gray-100 rounded animate-pulse"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse"></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-96">
                {/* Main Chart Area */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                    <div className="h-6 w-32 bg-gray-200 rounded mb-8 animate-pulse"></div>
                    <div className="h-64 bg-gray-50 rounded-lg animate-pulse"></div>
                </div>
                {/* Side Panel Area */}
                <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                    <div className="h-6 w-32 bg-gray-200 rounded mb-6 animate-pulse"></div>
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-gray-50 rounded animate-pulse"></div>)}
                    </div>
                </div>
            </div>
        </div>
    )
}
