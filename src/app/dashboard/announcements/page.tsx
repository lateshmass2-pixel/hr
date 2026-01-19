import { getAnnouncements } from "./actions"
import { Badge } from "@/components/ui/badge"
import { Megaphone, Trash2, AlertCircle, Clock, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { NewAnnouncementDialog } from "./new-announcement-dialog"
import { DeleteAnnouncementButton } from "./DeleteButton"

export const dynamic = 'force-dynamic'

export default async function AnnouncementsPage() {
    const announcements = await getAnnouncements()

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e07850] to-[#d45a3a] flex items-center justify-center shadow-lg">
                        <Megaphone className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#1a1a1a]">Announcements</h2>
                        <p className="text-[#6b6b6b] text-sm mt-1">Broadcast important updates to all employees.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Help Bubble */}
                    <div className="hidden md:flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-md border border-[#e8e4e0]">
                        <Sparkles className="w-4 h-4 text-[#e07850]" />
                        <span className="text-[#1a1a1a] text-sm font-medium">Need help?</span>
                        <span className="text-lg">👋</span>
                    </div>
                    <NewAnnouncementDialog />
                </div>
            </div>

            <div className="space-y-4">
                {announcements.map((announcement) => (
                    <div
                        key={announcement.id}
                        className="bg-white rounded-3xl border border-[#e8e4e0] p-5 hover:shadow-lg hover:border-[#e07850]/30 transition-all shadow-md"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <Badge className={
                                        announcement.priority === 'HIGH'
                                            ? 'bg-red-50 text-red-700 border-red-200'
                                            : announcement.priority === 'LOW'
                                                ? 'bg-[#f5f3f0] text-[#6b6b6b] border-[#e8e4e0]'
                                                : 'bg-[#e07850]/10 text-[#e07850] border-[#e07850]/20'
                                    }>
                                        {announcement.priority}
                                    </Badge>
                                    <span className="text-xs text-[#a0a0a0] flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(announcement.created_at), "MMM d, yyyy 'at' h:mm a")}
                                    </span>
                                </div>
                                <h3 className="text-lg font-semibold text-[#1a1a1a] mb-1">
                                    {announcement.title}
                                </h3>
                                <p className="text-[#6b6b6b] text-sm leading-relaxed">
                                    {announcement.content}
                                </p>
                                <p className="text-xs text-[#a0a0a0] mt-3">
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
                    <div className="col-span-full py-20 text-center rounded-3xl border-2 border-dashed border-[#e8e4e0] bg-white shadow-sm">
                        <Megaphone className="h-10 w-10 text-[#a0a0a0] mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-[#1a1a1a]">No announcements yet</h3>
                        <p className="text-[#6b6b6b] mb-4">Create your first announcement to broadcast to employees</p>
                        <NewAnnouncementDialog />
                    </div>
                )}
            </div>
        </div>
    )
}
