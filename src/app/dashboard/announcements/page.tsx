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
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Announcements</h2>
                    <p className="text-gray-500 mt-1">Broadcast important updates to all employees.</p>
                </div>
                <NewAnnouncementDialog />
            </div>

            <div className="space-y-4">
                {announcements.map((announcement) => (
                    <div
                        key={announcement.id}
                        className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <Badge className={
                                        announcement.priority === 'HIGH'
                                            ? 'bg-red-50 text-red-700 border-red-200'
                                            : announcement.priority === 'LOW'
                                                ? 'bg-gray-100 text-gray-600 border-gray-200'
                                                : 'bg-orange-50 text-orange-700 border-orange-200'
                                    }>
                                        {announcement.priority}
                                    </Badge>
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(announcement.created_at), "MMM d, yyyy 'at' h:mm a")}
                                    </span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                    {announcement.title}
                                </h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    {announcement.content}
                                </p>
                                <p className="text-xs text-gray-400 mt-3">
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
                    <div className="col-span-full py-20 text-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
                        <Megaphone className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No announcements yet</h3>
                        <p className="text-gray-500 mb-4">Create your first announcement to broadcast to employees</p>
                        <NewAnnouncementDialog />
                    </div>
                )}
            </div>
        </div>
    )
}
