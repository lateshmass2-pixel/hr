import { getAnnouncements } from "./actions"
import { Badge } from "@/components/ui/badge"
import { Megaphone, Trash2, AlertCircle, Clock } from "lucide-react"
import { format } from "date-fns"
import { NewAnnouncementDialog } from "./new-announcement-dialog"
import { DeleteAnnouncementButton } from "./DeleteButton"

export const dynamic = 'force-dynamic'

export default async function AnnouncementsPage() {
    const announcements = await getAnnouncements()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Announcements</h2>
                    <p className="text-zinc-400 mt-1">Broadcast important updates to all employees.</p>
                </div>
                <NewAnnouncementDialog />
            </div>

            <div className="space-y-4">
                {announcements.map((announcement) => (
                    <div
                        key={announcement.id}
                        className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-5 hover:border-violet-500/50 transition-all"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <Badge className={
                                        announcement.priority === 'HIGH'
                                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                            : announcement.priority === 'LOW'
                                                ? 'bg-zinc-700 text-zinc-300 border-zinc-600'
                                                : 'bg-violet-500/20 text-violet-400 border-violet-500/30'
                                    }>
                                        {announcement.priority}
                                    </Badge>
                                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(announcement.created_at), "MMM d, yyyy 'at' h:mm a")}
                                    </span>
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-1">
                                    {announcement.title}
                                </h3>
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    {announcement.content}
                                </p>
                                <p className="text-xs text-zinc-500 mt-3">
                                    Posted by HR Team
                                </p>
                            </div>
                            <DeleteAnnouncementButton
                                announcementId={announcement.id}
                                announcementTitle={announcement.title}
                            />
                        </div>
                    </div>
                ))}

                {announcements.length === 0 && (
                    <div className="col-span-full py-20 text-center rounded-xl border-2 border-dashed border-[#333] bg-[#1a1a1a]">
                        <Megaphone className="h-10 w-10 text-zinc-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white">No announcements yet</h3>
                        <p className="text-zinc-400 mb-4">Create your first announcement to broadcast to employees</p>
                        <NewAnnouncementDialog />
                    </div>
                )}
            </div>
        </div>
    )
}
