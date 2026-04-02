// =============================================================================
// Server Actions — Coding Workspace (RBAC-Protected, Org-Scoped)
// =============================================================================
// Pattern mirrors projects/actions.ts: session → permission → validate → execute → audit
// =============================================================================

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireSession, requirePermissionFromSession } from '@/lib/auth/session'
import { createAuditLog } from '@/lib/audit'
import { safeError } from '@/lib/security'
import type { Workspace, WorkspaceFile, WorkspaceCommit, WorkspaceActivity, WorkspaceMetrics } from '@/types/workspace'

// =============================================================================
// GET or CREATE: Workspace for a project
// =============================================================================

export async function getOrCreateWorkspace(projectId: string, taskId?: string): Promise<Workspace | null> {
    try {
        const session = await requirePermissionFromSession('workspaces:read')
        const supabase = await createClient()

        // Try to find existing workspace
        let query = supabase
            .from('project_workspaces')
            .select('*')
            .eq('project_id', projectId)

        if (taskId) {
            query = query.eq('task_id', taskId)
        } else {
            query = query.is('task_id', null)
        }

        const { data: existing } = await query.single()

        if (existing) return existing as Workspace

        // Create new workspace
        const { data: created, error } = await supabase
            .from('project_workspaces')
            .insert({
                project_id: projectId,
                task_id: taskId || null,
                created_by: session.userId,
                organization_id: session.organizationId !== 'legacy' ? session.organizationId : null,
            })
            .select()
            .single()

        if (error) {
            console.error('Workspace create error:', error)
            return null
        }

        await createAuditLog({
            organizationId: session.organizationId,
            actorId: session.userId,
            action: 'workspace.create',
            entityType: 'workspace',
            entityId: created.id,
            metadata: { projectId, taskId },
        })

        return created as Workspace
    } catch (error) {
        console.error('getOrCreateWorkspace error:', error)
        return null
    }
}

// =============================================================================
// GET: Workspace Files
// =============================================================================

export async function getWorkspaceFiles(workspaceId: string): Promise<WorkspaceFile[]> {
    try {
        await requirePermissionFromSession('workspaces:read')
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('workspace_files')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('file_name')

        if (error) {
            console.error('Error fetching workspace files:', error)
            return []
        }

        return data as WorkspaceFile[]
    } catch {
        return []
    }
}

// =============================================================================
// CREATE: File
// =============================================================================

export async function createWorkspaceFile(
    workspaceId: string,
    fileName: string,
    language: string,
    content: string = ''
): Promise<{ success: boolean; file?: WorkspaceFile; error?: string }> {
    try {
        const session = await requirePermissionFromSession('workspaces:create')
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('workspace_files')
            .insert({
                workspace_id: workspaceId,
                file_name: fileName,
                language,
                content,
                updated_by: session.userId,
            })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                return { success: false, error: 'A file with this name already exists' }
            }
            return { success: false, error: error.message }
        }

        // Log activity
        await supabase.from('workspace_activity').insert({
            workspace_id: workspaceId,
            user_id: session.userId,
            action: 'file_create',
            metadata: { file_name: fileName, language },
        })

        await createAuditLog({
            organizationId: session.organizationId,
            actorId: session.userId,
            action: 'workspace.file_create',
            entityType: 'workspace',
            entityId: workspaceId,
            metadata: { fileName, language },
        })

        return { success: true, file: data as WorkspaceFile }
    } catch (error) {
        return safeError(error) as any
    }
}

// =============================================================================
// UPDATE: File Content (Save)
// =============================================================================

export async function updateFileContent(
    fileId: string,
    content: string,
    workspaceId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await requirePermissionFromSession('workspaces:update')
        const supabase = await createClient()

        const { error } = await supabase
            .from('workspace_files')
            .update({
                content,
                updated_by: session.userId,
                last_modified: new Date().toISOString(),
            })
            .eq('id', fileId)

        if (error) {
            return { success: false, error: error.message }
        }

        // Log activity
        await supabase.from('workspace_activity').insert({
            workspace_id: workspaceId,
            user_id: session.userId,
            action: 'file_update',
            metadata: { file_id: fileId },
        })

        return { success: true }
    } catch (error) {
        return safeError(error) as any
    }
}

// =============================================================================
// DELETE: File
// =============================================================================

export async function deleteWorkspaceFile(
    fileId: string,
    workspaceId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await requirePermissionFromSession('workspaces:update')
        const supabase = await createClient()

        // Get file info before deleting
        const { data: file } = await supabase
            .from('workspace_files')
            .select('file_name')
            .eq('id', fileId)
            .single()

        const { error } = await supabase
            .from('workspace_files')
            .delete()
            .eq('id', fileId)

        if (error) {
            return { success: false, error: error.message }
        }

        await supabase.from('workspace_activity').insert({
            workspace_id: workspaceId,
            user_id: session.userId,
            action: 'file_delete',
            metadata: { file_name: file?.file_name },
        })

        await createAuditLog({
            organizationId: session.organizationId,
            actorId: session.userId,
            action: 'workspace.file_delete',
            entityType: 'workspace',
            entityId: workspaceId,
            metadata: { fileName: file?.file_name },
        })

        return { success: true }
    } catch (error) {
        return safeError(error) as any
    }
}

// =============================================================================
// RENAME: File
// =============================================================================

export async function renameWorkspaceFile(
    fileId: string,
    newName: string,
    newLanguage: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await requirePermissionFromSession('workspaces:update')
        const supabase = await createClient()

        const { error } = await supabase
            .from('workspace_files')
            .update({
                file_name: newName,
                language: newLanguage,
                last_modified: new Date().toISOString(),
            })
            .eq('id', fileId)

        if (error) {
            if (error.code === '23505') {
                return { success: false, error: 'A file with this name already exists' }
            }
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error) {
        return safeError(error) as any
    }
}

// =============================================================================
// COMMIT: Snapshot all files
// =============================================================================

export async function commitWorkspace(
    workspaceId: string,
    message: string
): Promise<{ success: boolean; commit?: WorkspaceCommit; error?: string }> {
    try {
        const session = await requirePermissionFromSession('workspaces:create')
        const supabase = await createClient()

        // Get all current files for snapshot
        const { data: files } = await supabase
            .from('workspace_files')
            .select('file_name, language, content')
            .eq('workspace_id', workspaceId)

        if (!files || files.length === 0) {
            return { success: false, error: 'No files to commit' }
        }

        const snapshot = files.map(f => ({
            file_name: f.file_name,
            language: f.language,
            content: f.content,
        }))

        const { data, error } = await supabase
            .from('workspace_commits')
            .insert({
                workspace_id: workspaceId,
                message,
                snapshot,
                files_changed: files.length,
                created_by: session.userId,
            })
            .select()
            .single()

        if (error) {
            return { success: false, error: error.message }
        }

        // Log activity
        await supabase.from('workspace_activity').insert({
            workspace_id: workspaceId,
            user_id: session.userId,
            action: 'commit',
            metadata: { message, files_changed: files.length },
        })

        await createAuditLog({
            organizationId: session.organizationId,
            actorId: session.userId,
            action: 'workspace.commit',
            entityType: 'workspace',
            entityId: workspaceId,
            metadata: { message, filesChanged: files.length },
        })

        return { success: true, commit: data as WorkspaceCommit }
    } catch (error) {
        return safeError(error) as any
    }
}

// =============================================================================
// GET: Commit History
// =============================================================================

export async function getCommitHistory(workspaceId: string): Promise<WorkspaceCommit[]> {
    try {
        await requirePermissionFromSession('workspaces:read')
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('workspace_commits')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) {
            console.error('Error fetching commits:', error)
            return []
        }

        return data as WorkspaceCommit[]
    } catch {
        return []
    }
}

// =============================================================================
// GET: Activity Log
// =============================================================================

export async function getWorkspaceActivity(workspaceId: string): Promise<WorkspaceActivity[]> {
    try {
        await requirePermissionFromSession('workspaces:read')
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('workspace_activity')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .limit(100)

        if (error) return []
        return data as WorkspaceActivity[]
    } catch {
        return []
    }
}

// =============================================================================
// GET: Workspace Metrics for Project Progress
// =============================================================================

export async function getWorkspaceMetrics(projectId: string): Promise<WorkspaceMetrics | null> {
    try {
        await requirePermissionFromSession('workspaces:read')
        const supabase = await createClient()

        // Get workspace
        const { data: workspace } = await supabase
            .from('project_workspaces')
            .select('id')
            .eq('project_id', projectId)
            .is('task_id', null)
            .single()

        if (!workspace) return null

        // Get commit count
        const { count: totalCommits } = await supabase
            .from('workspace_commits')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspace.id)

        // Get file count
        const { count: totalFiles } = await supabase
            .from('workspace_files')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspace.id)

        // Get last activity
        const { data: lastActivity } = await supabase
            .from('workspace_activity')
            .select('created_at')
            .eq('workspace_id', workspace.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        // Get recent activity
        const { data: recentActivity } = await supabase
            .from('workspace_activity')
            .select('*')
            .eq('workspace_id', workspace.id)
            .order('created_at', { ascending: false })
            .limit(10)

        // Estimate coding hours (rough: 1 commit ≈ 30min work)
        const codingHours = Math.round(((totalCommits || 0) * 0.5) * 10) / 10

        return {
            total_commits: totalCommits || 0,
            total_files: totalFiles || 0,
            last_active: lastActivity?.created_at || null,
            coding_hours_estimate: codingHours,
            recent_activity: (recentActivity || []) as WorkspaceActivity[],
        }
    } catch {
        return null
    }
}

// =============================================================================
// LOG: Code Execution Activity
// =============================================================================

export async function logCodeExecution(
    workspaceId: string,
    language: string,
    status: string
): Promise<void> {
    try {
        const session = await requireSession()
        const supabase = await createClient()

        await supabase.from('workspace_activity').insert({
            workspace_id: workspaceId,
            user_id: session.userId,
            action: 'run_code',
            metadata: { language, status },
        })
    } catch {
        // Non-critical, don't throw
    }
}
