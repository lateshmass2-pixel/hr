// =============================================================================
// Server Actions — Projects (RBAC-Protected, Org-Scoped)
// =============================================================================
// Every action: session → permission check → validate → execute → audit
// organizationId is NEVER accepted from form data — always from session.
// =============================================================================

'use server'

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { requireSession, requirePermissionFromSession } from "@/lib/auth/session"
import { getOrgDb, scopeClient } from "@/lib/db/tenant-scoped"
import { createAuditLog } from '@/lib/audit'
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
    team_lead_id?: string | null
    member_ids?: string[] | null
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
// Projects table
// =============================================================================
// Always `org_projects`. A session now always carries a real organization, so
// there is no "legacy mode" to fall back to — see src/lib/auth/session.ts.
//
// The legacy `projects` table is deliberately NOT read here. It has no
// `organization_id` column, so any query against it returns rows belonging to
// every tenant; there is no way to scope it. Legacy rows reach `org_projects`
// via supabase/migrations/002_backfill.sql.
//
// Completing the cut-over (and dropping the legacy table) is plan task 1.2.
const PROJECTS_TABLE = 'org_projects' as const

// =============================================================================
// GET: List Projects (org-scoped)
// =============================================================================

export async function getProjects(): Promise<Project[]> {
    try {
        const session = await requireSession()
        const db = await getOrgDb(session)

        // The tenant filter is applied by the scoped client, not by hand.
        const { data, error } = await db
            .from(PROJECTS_TABLE)
            .select<Project[]>('*')
            .order('created_at', { ascending: false })

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
// This function is the authorization boundary for projects: getTasks,
// createTask, updateTaskStatus and deleteTask all call it and treat a null
// result as "not found or access denied". It must therefore never return a row
// from another tenant.
//
// It previously fell back to an unscoped `projects` query by id alone, which
// meant a valid id from ANY tenant resolved successfully — and because callers
// use it as their access check, that fallback authorized task reads and writes
// across tenants. The fallback is removed.

export async function getProject(id: string): Promise<Project | null> {
    try {
        const session = await requireSession()
        const db = await getOrgDb(session)

        const { data } = await db
            .from(PROJECTS_TABLE)
            .select<Project[]>('*')
            .eq('id', id)
            .single()

        return data ?? null
    } catch {
        return null
    }
}

// =============================================================================
// GET: Tasks for a project
// =============================================================================

export async function getTasks(projectId: string): Promise<Task[]> {
    try {
        await requireSession()
        const supabase = await createClient()

        // Tenant check is delegated to getProject, which is org-scoped. `tasks`
        // has no organization_id of its own, so reaching it safely depends
        // entirely on first proving the parent project belongs to this tenant.
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
        await requireSession()
        const supabase = await createClient()

        // KNOWN TENANT LEAK: `profiles` has no organization_id column, so this
        // read cannot be scoped and returns users from every tenant. Cannot be
        // fixed here — it needs the schema cut-over to `org_employees`
        // (plan task 1.2). Tracked in docs/INDUSTRIAL_READINESS_PLAN.md.
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, position, role')
            .eq('role', 'STANDARD_USER')
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
// GET: All Profiles (for project assignment — includes ALL roles)
// =============================================================================

export async function getAllProfiles(): Promise<{ id: string; full_name: string; email: string; position: string; role: string }[]> {
    try {
        await requireSession()
        const supabase = await createClient()

        // KNOWN TENANT LEAK: same as getEmployees — `profiles` is tenant-less,
        // so this returns every tenant's users. Needs the cut-over to
        // `org_employees` (plan task 1.2).
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, position, role')
            .order('full_name')

        if (error) {
            console.error('Error fetching all profiles:', error)
            return []
        }
        return data || []
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
        const db = await getOrgDb(session)

        // 2. Validate input
        const title = formData.get('title') as string
        const description = formData.get('description') as string
        const status = formData.get('status') as string
        const dateStr = formData.get('due_date') as string
        const teamLeadId = formData.get('team_lead_id') as string // newly added
        const memberIdsStr = formData.get('member_ids') as string // newly added

        if (!title || title.trim() === '') {
            return { error: 'Title is required' }
        }

        const due_date = dateStr ? new Date(dateStr).toISOString() : null
        let member_ids: string[] = []
        try {
            if (memberIdsStr) member_ids = JSON.parse(memberIdsStr)
        } catch(e) {}

        // 3. Insert — organization_id is injected by the scoped client
        const { data, error } = await db
            .from(PROJECTS_TABLE)
            .insert({
                title: title.trim(),
                description: description || null,
                status: status || 'ACTIVE',
                due_date,
                created_by: session.userId,
                team_lead_id: teamLeadId || null,
                member_ids: member_ids,
            })
            .select()
            .single<Project>()

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

        // The admin client bypasses RLS entirely, so the scoped wrapper is the
        // ONLY thing keeping this operation inside the caller's tenant. The
        // permission check above proves they may delete projects in their own
        // org; it says nothing about whether THIS id belongs to them.
        const db = scopeClient(await createAdminClient(), session.organizationId)

        // 1. Verify ownership BEFORE deleting anything. Previously the cascade
        //    ran first and the final delete hit the legacy `projects` table
        //    filtered by id alone, so an id from another tenant was destroyed.
        const { data: project } = await db
            .from(PROJECTS_TABLE)
            .select<{ title: string }[]>('title')
            .eq('id', projectId)
            .single()

        if (!project) {
            return { success: false, error: 'Project not found or access denied' }
        }

        const projectTitle = project.title

        // 2. Cascade cleanup, now that ownership is established.
        //    project_workspaces is tenant-scoped, so it goes through the wrapper.
        await db.from('project_workspaces').delete().eq('project_id', projectId)

        //    org_tasks is tenant-scoped; tasks is not (no organization_id
        //    column), so it must be reached through the raw client. Safe here
        //    only because ownership of the parent project is already proven.
        await db.from('org_tasks').delete().eq('project_id', projectId)
        await db
            .unsafeUnscoped('legacy `tasks` table has no organization_id; parent project ownership verified above')
            .from('tasks')
            .delete()
            .eq('project_id', projectId)

        // 3. Delete the project, still tenant-scoped.
        const { error: deleteError } = await db
            .from(PROJECTS_TABLE)
            .delete()
            .eq('id', projectId)

        if (deleteError) {
            console.error('Delete Project Error:', deleteError)
            return { success: false, error: deleteError.message }
        }

        // 4. Audit log
        await createAuditLog({
            organizationId: session.organizationId,
            actorId: session.userId,
            action: 'project.delete',
            entityType: 'project',
            entityId: projectId,
            changes: { before: { title: projectTitle } },
        })

        revalidatePath('/dashboard/projects')
        return { success: true }

    } catch (error: any) {
        console.error("Delete Project Exception:", error)
        return { success: false, error: error.message || "Failed to delete project" }
    }
}
