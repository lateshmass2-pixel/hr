
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zutplguzsmdtnlcgpcig.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY is missing in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const newUsers = [
    {
        email: 'sarah@hems.com',
        password: 'password123',
        role: 'HR_ADMIN',
        data: {
            full_name: 'Sarah Manager',
            position: 'HR Manager',
            department: 'Human Resources',
            role: 'HR_ADMIN',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah'
        }
    },
    {
        email: 'mike@hems.com',
        password: 'password123',
        role: 'STANDARD_USER',
        data: {
            full_name: 'Mike Developer',
            position: 'Senior Developer',
            department: 'Engineering',
            role: 'STANDARD_USER',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike'
        }
    },
    {
        email: 'emma@hems.com',
        password: 'password123',
        role: 'STANDARD_USER',
        data: {
            full_name: 'Emma Designer',
            position: 'UI/UX Designer',
            department: 'Design',
            role: 'STANDARD_USER',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma'
        }
    },
    {
        email: 'david@hems.com',
        password: 'password123',
        role: 'STANDARD_USER',
        data: {
            full_name: 'David Product',
            position: 'Product Owner',
            department: 'Product',
            role: 'STANDARD_USER',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David'
        }
    }
]

async function createUsers() {
    console.log('Creating users...')

    for (const user of newUsers) {
        console.log(`\nProcessing ${user.email}...`)

        // 1. Create User in Auth
        // We check if user exists first to avoid error, or just catch it
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: { full_name: user.data.full_name }
        })

        let userId = authData?.user?.id

        if (authError) {
            if (authError.message.includes('already been registered')) {
                console.log('User already exists, fetching ID...')
                // Fetch ID by email (admin only)
                // Actually supabase-js admin doesn't have getUserByEmail easily without fetching list
                // We'll try to list users and find matches
                const { data: listData } = await supabase.auth.admin.listUsers()
                const found = listData.users.find(u => u.email === user.email)
                if (found) userId = found.id
            } else {
                console.error(`Error creating auth user: ${authError.message}`)
                continue
            }
        } else {
            console.log(`User created with ID: ${userId}`)
        }

        if (!userId) {
            console.warn('Could not determine User ID, skipping profile update.')
            continue
        }

        // 2. Update Profile
        // We attempt to update fields. If columns are missing, this might partially fail or fail completely.
        // We'll try to update known columns first.

        const updates = {
            full_name: user.data.full_name,
            // role: user.role // Only valid if enum matches 'HR_ADMIN' | 'EMPLOYEE'
        }

        // Map roles: 'STANDARD_USER' -> 'EMPLOYEE' in DB enum
        const dbRole = user.role === 'HR_ADMIN' ? 'HR_ADMIN' : 'EMPLOYEE'
        updates.role = dbRole

        // Try updating core profile first
        const { error: coreError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)

        if (coreError) {
            console.error(`Basic profile update failed: ${coreError.message}`)
        } else {
            console.log(`Basic profile updated.`)
        }

        // Try updating extra info (might fail if columns missing)
        try {
            const { error: extraError } = await supabase
                .from('profiles')
                .update({
                    avatar_url: user.data.avatar_url,
                    position: user.data.position,
                    department: user.data.department
                })
                .eq('id', userId)

            if (extraError) {
                console.warn(`Rich profile info update failed (missing columns?): ${extraError.message}`)
            } else {
                console.log(`Rich profile info updated.`)
            }
        } catch (e) {
            console.warn(`Rich profile info update failed exception: ${e.message}`)
        }
    }

    console.log('\n----------------------------------------')
    console.log('🎉 Credentials Created / Verified:')
    console.log('----------------------------------------')
    newUsers.forEach(u => {
        console.log(`Email:    ${u.email}`)
        console.log(`Password: ${u.password}`)
        console.log(`Role:     ${u.role}`)
        console.log('----------------------------------------')
    })
}

createUsers()
