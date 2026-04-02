const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

async function list() {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const envConfig = dotenv.parse(envContent);
  const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error, count } = await supabase.from('applications').select('*', { count: 'exact' });
  if (error) {
    fs.writeFileSync('db-error.txt', JSON.stringify(error, null, 2));
  } else {
    fs.writeFileSync('db-results.txt', JSON.stringify({ count, data: data.slice(0, 5) }, null, 2));
  }
}
list();
