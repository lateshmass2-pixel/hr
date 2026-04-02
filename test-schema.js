const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// load env
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

const supabase = createClient(
  envConfig.NEXT_PUBLIC_SUPABASE_URL,
  envConfig.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('applications').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    if (data.length > 0) {
      console.log('Columns:', Object.keys(data[0]).join(', '));
    } else {
      console.log('Table is empty');
      const { error: insertError } = await supabase.from('applications').insert({ fake_column: 1 });
      console.log('Insert error schema:', insertError);
    }
  }
}
check();
