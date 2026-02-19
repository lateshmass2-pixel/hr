import { createClient } from "@/lib/supabase/server"
import { UploadDialog } from "./upload-dialog"
import { KanbanBoard } from "./kanban-board"
import { KBUploadDialog } from "./kb-upload-dialog"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHero } from "@/components/layout/PageHero"

export const dynamic = 'force-dynamic'

async function getApplications() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })
    return data || []
}

export default async function HiringDashboard() {
    const applications = await getApplications()
    const activeCandidates = applications.filter(a => a.status !== 'HIRED')

    return (
        <PageContainer className="max-w-full">
            <PageHero
                title="Hiring Pipeline"
                subtitle={`${activeCandidates.length} active candidates in the pipeline`}
                action={
                    <div className="flex items-center gap-2">
                        <KBUploadDialog />
                        <UploadDialog />
                    </div>
                }
            />

            {/* ═══════════════════════════════════════════════════════════
                HIRING INBOX - Kanban Board View
            ═══════════════════════════════════════════════════════════ */}
            <div className="h-[calc(100vh-220px)] min-h-[500px]">
                <KanbanBoard applications={activeCandidates} />
            </div>
        </PageContainer>
    )
}
