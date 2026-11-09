require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function inspect(tableName) {
    console.log(`\n--- Schema for: ${tableName} ---`);
    try {
        const res = await fetch(`${supabaseUrl}/rest/v1/${tableName}?select=*`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Accept': 'application/vnd.pgrst.schema+json'
            }
        });
        if (!res.ok) {
            console.error(`Failed: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.error(text);
            return;
        }
        const schema = await res.json();
        console.log(schema.properties ? Object.keys(schema.properties) : schema);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

async function run() {
    await inspect('profiles');
    await inspect('projects');
    await inspect('tasks');
    await inspect('applications');
    await inspect('job_postings');
}

run();
