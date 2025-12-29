'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export type Project = {
    id: string
    title: string
    description: string | null
    status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD'
    due_date: string | null
    created_at: string
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
    name: string
    email: string
    role: string | null
    avatar_url: string | null
}

export type ActionState = {
    message: string
}

export async function getProjects() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching projects:', error)
        return []
    }

    return data as Project[]
}

export async function getProject(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

    if (error) return null
    return data as Project
}

export async function getTasks(projectId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('tasks')
        .select(`
      *,
      assignee:employees(*)
    `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching tasks:', error)
        return []
    }

    return data as Task[]
}

export async function getEmployees() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name')

    if (error) return []
    return data as Employee[]
}

export async function createProject(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const supabase = await createClient()
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const status = formData.get('status') as string
    const dateStr = formData.get('due_date') as string

    const due_date = dateStr ? new Date(dateStr).toISOString() : null

    const { error } = await supabase.from('projects').insert({
        title,
        description,
        status,
        due_date
    })

    if (error) {
        return { message: error.message }
    }

    revalidatePath('/dashboard/projects')
    return { message: 'Success' }
}

export async function createTask(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const supabase = await createClient()
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const priority = formData.get('priority') as string
    const assigned_to = formData.get('assigned_to') as string
    const project_id = formData.get('project_id') as string
    const dateStr = formData.get('due_date') as string

    const due_date = dateStr ? new Date(dateStr).toISOString() : null

    const { error } = await supabase.from('tasks').insert({
        title,
        description,
        priority,
        assigned_to: assigned_to || null,
        project_id,
        due_date
    })

    if (error) {
        return { message: error.message }
    }

    revalidatePath(`/dashboard/projects/${project_id}`)
    return { message: 'Success' }
}

export async function updateTaskStatus(taskId: string, status: string, projectId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)

    if (error) {
        console.error('Update Task Error:', error)
        return { error: error.message }
    }

    revalidatePath(`/dashboard/projects/${projectId}`)
    return { success: true }
}
