/**
 * Direct check of buyer receipts table
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkDirectly() {
  try {
    console.log('🔍 Checking buyer receipts table directly...');

    // Get actual count using count query
    const { count, error: countError } = await supabaseAdmin
      .from('buyer_receipts')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error getting count:', countError);
      return;
    }

    console.log(`📊 Actual count from database: ${count}`);

    // Also try to get all records
    const { data: records, error: selectError } = await supabaseAdmin
      .from('buyer_receipts')
      .select('*');

    if (selectError) {
      console.error('❌ Error selecting records:', selectError);
      return;
    }

    console.log(`📊 Records returned: ${records?.length || 0}`);
    
    if (records && records.length > 0) {
      console.log('📋 Records found:');
      records.forEach((record, index) => {
        console.log(`  ${index + 1}. ID: ${record.id}, Job: ${record.job_id}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the check
checkDirectly()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });