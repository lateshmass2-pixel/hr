'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getMyTasks() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('tasks')
        .select('*, projects(name)')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching tasks:', error)
        return []
    }
    return data || []
}

export async function updateTaskStatus(taskId: string, newStatus: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

    if (error) {
        console.error('Error updating task:', error)
        return { success: false, message: error.message }
    }

    revalidatePath('/dashboard/employee')
    return { success: true }
}

export async function getMyWorkLogs() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('work_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(10)

    if (error) {
        console.error('Error fetching work logs:', error)
        return []
    }
    return data || []
}

export async function submitWorkLog(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, message: 'Not authenticated' }
    }

    const description = formData.get('description') as string
    const hoursWorked = parseFloat(formData.get('hours') as string)

    if (!description || !hoursWorked) {
        return { success: false, message: 'Please fill in all fields' }
    }

    if (hoursWorked <= 0 || hoursWorked > 24) {
        return { success: false, message: 'Hours must be between 0 and 24' }
    }

    const { error } = await supabase
        .from('work_logs')
        .insert({
            user_id: user.id,
            content: description,
            hours_worked: hoursWorked,
            date: new Date().toISOString().split('T')[0]
        })

    if (error) {
        console.error('Error submitting work log:', error)
        return { success: false, message: error.message }
    }

    revalidatePath('/dashboard/employee')
    return { success: true, message: 'Work log submitted!' }
}

export async function getMyProfile() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return data
}
