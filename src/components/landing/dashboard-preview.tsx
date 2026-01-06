import { BarChart3, Users, CheckSquare, TrendingUp } from "lucide-react"

export function DashboardPreview() {
    return (
        <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl shadow-purple-900/50 p-6">
            {/* Mock Browser Chrome */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                    <div className="w-3 h-3 rounded-full bg-green-400/60" />
                </div>
                <div className="flex-1 bg-white/5 rounded px-3 py-1 text-xs text-white/40">
                    hems.app/dashboard
                </div>
            </div>

            {/* Mock Dashboard Content */}
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="h-3 w-24 bg-white/20 rounded" />
                        <div className="h-2 w-32 bg-white/10 rounded" />
                    </div>
                    <div className="h-8 w-20 bg-purple-400/30 rounded-lg" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { icon: Users, color: "bg-purple-400/20" },
                        { icon: CheckSquare, color: "bg-blue-400/20" },
                        { icon: BarChart3, color: "bg-green-400/20" },
                        { icon: TrendingUp, color: "bg-orange-400/20" }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                                <div className="h-2 w-12 bg-white/20 rounded" />
                                <div className={`${stat.color} rounded-full p-1.5`}>
                                    <stat.icon className="h-3 w-3 text-white/60" />
                                </div>
                            </div>
                            <div className="h-4 w-8 bg-white/30 rounded" />
                        </div>
                    ))}
                </div>

                {/* Chart Area */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="h-2 w-20 bg-white/20 rounded mb-3" />
                    <div className="flex items-end gap-2 h-24">
                        {[40, 65, 45, 80, 55, 70, 90, 75].map((height, i) => (
                            <div key={i} className="flex-1 bg-gradient-to-t from-purple-400/40 to-purple-400/10 rounded-t" style={{ height: `${height}%` }} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
