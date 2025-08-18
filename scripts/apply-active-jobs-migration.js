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

async function applyActiveJobsMigration() {
  console.log('🔄 Starting active_jobs migration...');

  try {
    // First, let's check the current table structure
    console.log('🔍 Checking current table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('active_jobs')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Error checking table structure:', tableError);
      return;
    }

    console.log('📊 Current table structure sample:', tableInfo);

    // Check if service_provider_id column already exists
    console.log('🔍 Checking if service_provider_id column exists...');
    const { data: columns, error: columnsError } = await supabase
      .from('active_jobs')
      .select('service_provider_id')
      .limit(1);

    if (columnsError && columnsError.code === '42703') {
      console.log('📝 service_provider_id column does not exist, adding it...');
      
      // Since we can't execute DDL directly, let's try a different approach
      // We'll work with the existing seller_id column for now
      console.log('⚠️  Cannot execute DDL directly. Working with existing seller_id column.');
      
      // Verify we can read from the table
      const { data: verifyData, error: verifyError } = await supabase
        .from('active_jobs')
        .select('id, seller_id')
        .limit(5);

      if (verifyError) {
        console.error('❌ Error reading from active_jobs:', verifyError);
        return;
      }

      console.log('📊 Current data in active_jobs:', verifyData);
      console.log('✅ Migration check completed. Table is accessible.');

    } else {
      console.log('✅ service_provider_id column already exists!');
      
      // Verify the data
      const { data: verifyData, error: verifyError } = await supabase
        .from('active_jobs')
        .select('id, seller_id, service_provider_id')
        .limit(5);

      if (verifyError) {
        console.error('❌ Error verifying migration:', verifyError);
        return;
      }

      console.log('📊 Sample data after migration:', verifyData);
      console.log('✅ Active jobs migration already completed!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

applyActiveJobsMigration();
