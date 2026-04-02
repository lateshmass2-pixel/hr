const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  try {
    const env = dotenv.parse(fs.readFileSync('.env.local'));
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_ROLE_KEY);
    // Oops, I used envConfig instead of env. Correcting...
  } catch (e) {
    console.error('Error:', e.message);
  }
}
