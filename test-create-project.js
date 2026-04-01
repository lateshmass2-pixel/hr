const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testInsert() {
    // 1. Get an existing user (we saw Sarah Manager is HR_ADMIN earlier)
    const { data: users } = await supabase.from('profiles').select('id, role').eq('role', 'HR_ADMIN').limit(1);
    if (!users || users.length === 0) {
        console.log("No HR admin found.");
        return;
    }
    const hrUserId = users[0].id;
    
    // 2. Try inserting into 'projects'
    const insertData = {
        title: 'Test Project via Script',
        description: 'Testing insertion',
        status: 'ACTIVE',
        due_date: new Date().toISOString(),
        created_by: hrUserId
    };

    console.log("Inserting:", insertData);

    const { data, error } = await supabase
        .from('projects')
        .insert(insertData)
        .select()
        .single();

    if (error) {
        console.error('Project create error details:');
        console.error('Message:', error.message);
        console.error('Details:', error.details);
        console.error('Hint:', error.hint);
        console.error('Code:', error.code);
    } else {
        console.log("Success! Project created:", data);
    }
}

testInsert();
