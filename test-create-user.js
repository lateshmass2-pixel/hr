const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
// Or adjust path if needed, e.g. path: '.env'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function testCreate() {
    const email = `test.employee.${Date.now()}@example.com`;
    console.log('Attempting to create user:', email);

    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: 'Password123!',
        email_confirm: true,
        user_metadata: {
            full_name: 'Test Employee',
            role: 'EMPLOYEE',
            position: 'Tester'
        }
    });

    if (error) {
        console.error('Error creating user:', error);
    } else {
        console.log('Success! User ID:', data.user.id);
    }
}

testCreate();
