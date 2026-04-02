const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const env = dotenv.parse(fs.readFileSync('.env.local'));
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, count, error } = await supabase.from('applications').select('*', { count: 'exact' });
  if (error) {
    console.error('DB Error:', error);
  } else {
    console.log('--- DB Content ---');
    console.log('Total Count (Bypassing RLS):', count);
    if (data && data.length > 0) {
      console.log('Latest Sample Application:');
      console.log({
        id: data[0].id,
        name: data[0].candidate_name || data[0].applicant_name,
        email: data[0].candidate_email || data[0].applicant_email,
        status: data[0].status
      });
    }
  }
}
main();
