import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Admin Client
 * Uses the Service Role Key for server-side operations that require elevated privileges
 * such as creating users programmatically.
 * 
 * ⚠️ IMPORTANT: Never expose this client to the browser.
 * Only use in Server Actions or API routes.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.warn('⚠️ Missing Supabase admin credentials. Add SUPABASE_SERVICE_ROLE_KEY to .env.local')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})
