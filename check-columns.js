const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const env = dotenv.parse(fs.readFileSync('.env.local'));
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'applications' });
  if (error) {
    // If RPC fails, try information_schema query
    const { data: cols, error: err } = await supabase.from('information_schema.columns').select('column_name').eq('table_name', 'applications');
    console.log('Columns:', cols?.map(c => c.column_name) || err);
  } else {
    console.log('Columns:', data);
  }
}
main();
