'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"

export async function deleteEmployee(userId: string) {
    if (!userId) return { success: false, message: 'User ID is required' }

    try {
        console.log(`🗑️ Deleting user: ${userId}`)

        // Delete from Auth (this cascades to profiles if set up, or we might need to delete profile manually first)
        // With 'ON DELETE CASCADE' in SQL, deleting auth user is enough.
        // But to be safe, let's try to delete profile first just in case.

        await supabaseAdmin.from('profiles').delete().eq('id', userId)

        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (error) {
            console.error('Error deleting auth user:', error)
            return { success: false, message: error.message }
        }

        revalidatePath('/dashboard')
        return { success: true, message: 'Employee deleted successfully' }
    } catch (error: any) {
        console.error('Delete operation failed:', error)
        return { success: false, message: error.message || 'Failed to delete employee' }
    }
}
