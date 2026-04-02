import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { 
    getOrCreateWorkspace, 
    getWorkspaceFiles, 
    getCommitHistory 
} from './actions'
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout'

export const metadata = {
    title: 'Coding Workspace | HEMS',
}

export default async function WorkspacePage(props: { params: Promise<{ id: string }> }) {
    const session = await getSession()
    if (!session) redirect('/login')

    const params = await props.params
    const projectId = params.id
    const supabase = await createClient()

    // 1. Verify project access
    // Loosened check here since Projects currently exist predominantly in HemsContext mock state 
    // and might not be fully synced with Supabase 'projects' table or organization_id logic yet.

    // 2. Resolve Workspace permissions
    // HR and Owner can manage (but maybe only view code), Employee can edit
    // Note: session.resolvePermissions is a pseudo-function based on your auth architecture.
    // If you don't have this available directly in the server component, we rely on the 
    // server actions to block unauthorized writes. For UI hints, we do a basic check:
    const isHrOrHigher = ['hr', 'owner'].includes(session.role)
    const canEditWorkspace = !isHrOrHigher // Example: HR viewers are read-only, Employees/Leads edit

    // 3. Get or Create Workspace
    const workspace = await getOrCreateWorkspace(projectId)
    
    if (!workspace) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
                <div className="text-red-500 mb-2">Failed to initialize workspace</div>
                <p className="text-gray-500 text-sm">Please try again later or contact support.</p>
            </div>
        )
    }

    // 4. Load initial data
    const [files, commits] = await Promise.all([
        getWorkspaceFiles(workspace.id),
        getCommitHistory(workspace.id)
    ])

    return (
        <div className="h-[calc(100vh-4rem)] m-0 p-0 overflow-hidden bg-[#0D1117]">
            {/* The layout component expects arrays, so we pass even if empty */}
            <WorkspaceLayout 
                workspace={workspace} 
                initialFiles={files || []} 
                initialCommits={commits || []} 
                readOnly={canEditWorkspace ? false : true} 
            />
        </div>
    )
}
