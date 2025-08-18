const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('EXPO_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createActiveJobsTable() {
  console.log('🔄 Creating active_jobs table...');

  try {
    // Check if table already exists
    console.log('🔍 Checking if active_jobs table exists...');
    const { data: existingData, error: existingError } = await supabase
      .from('active_jobs')
      .select('*')
      .limit(1);

    if (!existingError) {
      console.log('✅ active_jobs table already exists!');
      return;
    }

    if (existingError.code !== '42P01') {
      console.error('❌ Unexpected error checking table:', existingError);
      return;
    }

    console.log('📝 active_jobs table does not exist, creating it...');

    // Since we can't execute DDL directly, let's create the table by inserting a dummy record
    // This will trigger table creation if it doesn't exist
    console.log('⚠️  Cannot execute DDL directly. The table needs to be created manually.');
    console.log('📋 Please create the active_jobs table with the following schema:');
    console.log(`
CREATE TABLE active_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES auth.users(id),
  service_provider_id UUID REFERENCES auth.users(id),
  service_offer_id UUID REFERENCES service_offers(id),
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'RM',
  delivery_time TEXT DEFAULT '7 days',
  status TEXT DEFAULT 'in_progress',
  progress_percentage INTEGER DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
    `);

    console.log('🔧 You can create this table using:');
    console.log('1. Supabase Dashboard > SQL Editor');
    console.log('2. Or run the migration manually');
    console.log('3. Or use a database migration tool');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createActiveJobsTable();
