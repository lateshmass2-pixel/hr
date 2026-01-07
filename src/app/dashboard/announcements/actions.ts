'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getAnnouncements() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching announcements:', error.message, error.details, error.hint)
        return []
    }
    return data || []
}

export async function createAnnouncement(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, message: 'Not authenticated' }
    }

    const title = formData.get('title') as string
    const content = formData.get('content') as string
    const priority = formData.get('priority') as string || 'NORMAL'

    if (!title || !content) {
        return { success: false, message: 'Title and content are required' }
    }

    const { error } = await supabase
        .from('announcements')
        .insert({
            title,
            content,
            priority,
            created_by: user.id
        })

    if (error) {
        console.error('Error creating announcement:', error)
        return { success: false, message: error.message }
    }

    revalidatePath('/dashboard/announcements')
    revalidatePath('/dashboard/employee')
    return { success: true, message: 'Announcement created!' }
}

export async function deleteAnnouncement(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting announcement:', error)
        return { success: false, message: error.message }
    }

    revalidatePath('/dashboard/announcements')
    revalidatePath('/dashboard/employee')
    return { success: true }
}
