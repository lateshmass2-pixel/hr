// =============================================================================
// Server Actions — Projects (RBAC-Protected, Org-Scoped)
// =============================================================================
// Every action: session → permission check → validate → execute → audit
// organizationId is NEVER accepted from form data — always from session.
// =============================================================================

'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { requireSession, requirePermissionFromSession, type Session } from "@/lib/auth/session"
import { hasPermission } from "@/lib/rbac/types"
import { createAuditLog, computeDiff } from '@/lib/audit'
import { safeError } from '@/lib/security'

// =============================================================================
// Types
// =============================================================================

export type Project = {
    id: string
    title: string
    description: string | null
    status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD'
    due_date: string | null
    created_at: string
    created_by?: string
    organization_id?: string
}

export type Task = {
    id: string
    title: string
    description: string | null
    status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
    priority: 'LOW' | 'MEDIUM' | 'HIGH'
    due_date: string | null
    assigned_to: string | null
    project_id: string
    assignee?: Employee
}

export type Employee = {
    id: string
    full_name: string
    email: string
    position: string | null
    role: string
}

export type ActionResult = {
    success?: boolean
    error?: string
    message?: string
    project?: Project
}

// Backward compat: old dialogs import this name
export type ActionState = ActionResult

// =============================================================================
// Helper: Determine which table to use
// =============================================================================
// If organization_members exists (SaaS mode), use org_projects.
// Otherwise fall back to legacy projects table.

async function getProjectsTable(supabase: any, session: Session): Promise<'org_projects' | 'projects'> {
    if (session.organizationId && session.organizationId !== 'legacy') {
        return 'org_projects'
    }
    return 'projects'
}

// =============================================================================
// GET: List Projects (org-scoped)
// =============================================================================

export async function getProjects(): Promise<Project[]> {
    try {
        const session = await requireSession()
        const supabase = await createClient()
        const table = await getProjectsTable(supabase, session)

        let query = supabase
            .from(table)
            .select('*')
            .order('created_at', { ascending: false })

        // Scope to organization if in SaaS mode
        if (table === 'org_projects') {
            query = query.eq('organization_id', session.organizationId)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching projects:', error)
            return []
        }

        return data as Project[]
    } catch {
        return []
    }
}

// =============================================================================
// GET: Single Project (org-scoped)
// =============================================================================

// =============================================================================
// GET: Single Project (org-scoped + legacy fallback)
// =============================================================================

export async function getProject(id: string): Promise<Project | null> {
    try {
        const session = await requireSession()
        const supabase = await createClient()
        const primaryTable = await getProjectsTable(supabase, session)

        // 1. Try primary table (e.g. org_projects)
        let query = supabase.from(primaryTable).select('*').eq('id', id)
        if (primaryTable === 'org_projects') {
            query = query.eq('organization_id', session.organizationId)
        }

        const { data, error } = await query.single()
        if (data) return data as Project

        // 2. Fallback: If primary was org_projects, try legacy 'projects' table
        // This handles cases where user is upgraded to Org but accessing old data
        if (primaryTable === 'org_projects') {
            const { data: legacyData } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .single()

            if (legacyData) return legacyData as Project
        }

        return null
    } catch {
        return null
    }
}

// =============================================================================
// GET: Tasks for a project
// =============================================================================

export async function getTasks(projectId: string): Promise<Task[]> {
    try {
        const session = await requireSession()
        const supabase = await createClient()

        // Verify the project belongs to the user's org first
        const project = await getProject(projectId)
        if (!project) return []

        const { data, error } = await supabase
            .from('tasks')
            .select(`
                *,
                assignee:profiles!tasks_assigned_to_fkey(id, full_name, email, position)
            `)
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching tasks:', error)
            return []
        }

        return data as Task[]
    } catch {
        return []
    }
}

// =============================================================================
// GET: Employees (for task assignment dropdowns)
// =============================================================================

export async function getEmployees(): Promise<Employee[]> {
    try {
        const session = await requireSession()
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, position, role')
            .eq('role', 'EMPLOYEE')
            .order('full_name')

        if (error) {
            console.error('Error fetching employees:', error)
            return []
        }
        return data as Employee[]
    } catch {
        return []
    }
}

// =============================================================================
// CREATE: Project  — Requires projects:create permission
// =============================================================================

export async function createProject(
    prevState: ActionResult,
    formData: FormData
): Promise<ActionResult> {
    try {
        // 1. Session + permission check (org comes from session, NOT form)
        const session = await requirePermissionFromSession('projects:create')
        const supabase = await createClient()
        const table = await getProjectsTable(supabase, session)

        // 2. Validate input
        const title = formData.get('title') as string
        const description = formData.get('description') as string
        const status = formData.get('status') as string
        const dateStr = formData.get('due_date') as string

        if (!title || title.trim() === '') {
            return { error: 'Title is required' }
        }

        const due_date = dateStr ? new Date(dateStr).toISOString() : null

        // 3. Insert with org scope
        const insertData: Record<string, any> = {
            title: title.trim(),
            description: description || null,
            status: status || 'ACTIVE',
            due_date,
            created_by: session.userId,
        }

        if (table === 'org_projects') {
            insertData.organization_id = session.organizationId
        }

        const { data, error } = await supabase
            .from(table)
            .insert(insertData)
            .select()
            .single()

        if (error) {
            console.error('Project create error:', error)
            return { error: `Failed to create project: ${error.message}` }
        }

        // 4. Audit log
        await createAuditLog({
            organizationId: session.organizationId,
            actorId: session.userId,
            action: 'project.create',
            entityType: 'project',
            entityId: data.id,
            changes: { after: { title, status } },
        })

        revalidatePath('/dashboard/projects')
        return { success: true, message: 'Success', project: data }
    } catch (error) {
        return safeError(error) as ActionResult
    }
}

// =============================================================================
// CREATE: Task — Requires tasks:create permission
// =============================================================================

export async function createTask(
    prevState: ActionResult,
    formData: FormData
): Promise<ActionResult> {
    try {
        const session = await requirePermissionFromSession('tasks:create')
        const supabase = await createClient()

        const title = formData.get('title') as string
        const description = formData.get('description') as string
        const priority = formData.get('priority') as string
        const assigned_to = formData.get('assigned_to') as string
        const project_id = formData.get('project_id') as string
        const dateStr = formData.get('due_date') as string

        if (!title || !project_id) {
            return { error: 'Title and project are required' }
        }

        // Verify the project belongs to the user's org
        const project = await getProject(project_id)
        if (!project) {
            return { error: 'Project not found or access denied' }
        }

        const due_date = dateStr ? new Date(dateStr).toISOString() : null

        const { error } = await supabase.from('tasks').insert({
            title,
            description,
            priority,
            assigned_to: assigned_to || null,
            project_id,
            due_date,
        })

        if (error) {
            return { error: error.message }
        }

        await createAuditLog({
            organizationId: session.organizationId,
            actorId: session.userId,
            action: 'task.create',
            entityType: 'task',
            entityId: project_id,
            changes: { after: { title, priority, assigned_to } },
        })

        revalidatePath(`/dashboard/projects/${project_id}`)
        return { success: true, message: 'Success' }
    } catch (error) {
        return safeError(error) as ActionResult
    }
}

// =============================================================================
// UPDATE: Task Status — Requires tasks:update permission
// =============================================================================

export async function updateTaskStatus(
    taskId: string,
    status: string,
    projectId: string
) {
    try {
        const session = await requirePermissionFromSession('tasks:update')
        const supabase = await createClient()

        // Verify the project belongs to the user's org
        const project = await getProject(projectId)
        if (!project) {
            return { error: 'Project not found or access denied' }
        }

        const { error } = await supabase
            .from('tasks')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', taskId)

        if (error) {
            console.error('Update Task Error:', error)
            return { error: error.message }
        }

        await createAuditLog({
            organizationId: session.organizationId,
            actorId: session.userId,
            action: 'task.status_change',
            entityType: 'task',
            entityId: taskId,
            metadata: { status, projectId },
        })

        revalidatePath(`/dashboard/projects/${projectId}`)
        return { success: true }
    } catch (error) {
        return safeError(error)
    }
}

// =============================================================================
// DELETE: Task — Requires tasks:delete permission
// =============================================================================

export async function deleteTask(taskId: string, projectId: string) {
    try {
        const session = await requirePermissionFromSession('tasks:delete')
        const supabase = await createClient()

        // Verify the project belongs to the user's org
        const project = await getProject(projectId)
        if (!project) {
            return { success: false, message: 'Project not found or access denied' }
        }

        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId)

        if (error) {
            console.error('Delete Task Error:', error)
            return { success: false, message: error.message }
        }

        await createAuditLog({
            organizationId: session.organizationId,
            actorId: session.userId,
            action: 'task.delete',
            entityType: 'task',
            entityId: taskId,
            metadata: { projectId },
        })

        revalidatePath(`/dashboard/projects/${projectId}`)
        return { success: true, message: 'Task deleted successfully' }
    } catch (error) {
        return safeError(error)
    }
}

// =============================================================================
// DELETE: Project — Requires projects:delete permission
// =============================================================================

export async function deleteProject(projectId: string) {
    try {
        const session = await requirePermissionFromSession('projects:delete')
        const supabase = await createClient()

        // 1. Check if it's an Org Project (if applicable)
        if (session.organizationId && session.organizationId !== 'legacy') {
            const { data: orgProject } = await supabase
                .from('org_projects')
                .select('*')
                .eq('id', projectId)
                .eq('organization_id', session.organizationId)
                .single()

            if (orgProject) {
                // Delete tasks first
                await supabase.from('tasks').delete().eq('project_id', projectId)

                const { error } = await supabase
                    .from('org_projects')
                    .delete()
                    .eq('id', projectId)
                    .eq('organization_id', session.organizationId)

                if (error) throw new Error(error.message)

                await createAuditLog({
                    organizationId: session.organizationId,
                    actorId: session.userId,
                    action: 'project.delete',
                    entityType: 'project',
                    entityId: projectId,
                    changes: { before: { title: orgProject.title } },
                })

                revalidatePath('/dashboard/projects')
                return { success: true }
            }
        }

        // 2. Check if it's a Legacy Project
        const { data: legacyProject } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single()

        if (legacyProject) {
            // Check legacy permissions (implicitly handled by RLS, but explicit check matches pattern)

            // Delete tasks first
            await supabase.from('tasks').delete().eq('project_id', projectId)

            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', projectId)

            if (error) throw new Error(error.message)

            // Legacy audit
            await createAuditLog({
                organizationId: session.organizationId,
                actorId: session.userId,
                action: 'project.delete',
                entityType: 'project',
                entityId: projectId,
                changes: { before: { title: legacyProject.title } },
            })

            revalidatePath('/dashboard/projects')
            return { success: true }
        }

        throw new Error('Project not found or access denied')
    } catch (error) {
        return safeError(error)
    }
}
