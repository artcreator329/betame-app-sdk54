/**
 * Verify Buyer Receipt Cleanup
 * 
 * This script verifies that all buyer receipts have been successfully deleted
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

async function verifyCleanup() {
  try {
    console.log('🔍 Verifying buyer receipt cleanup...');

    // Check database records
    const { data: receipts, error: fetchError } = await supabaseAdmin
      .from('buyer_receipts')
      .select('count', { count: 'exact' });

    if (fetchError) {
      console.error('❌ Error checking buyer receipts:', fetchError);
      return;
    }

    console.log(`📊 Remaining buyer receipt records: ${receipts?.length || 0}`);

    // Check storage folder
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from('pdfs')
      .list('buyer-receipts', {
        limit: 100,
        offset: 0
      });

    if (listError && listError.message !== 'The resource was not found') {
      console.error('❌ Error checking storage:', listError);
    } else if (files && files.length > 0) {
      console.log(`📊 Remaining files in buyer-receipts folder: ${files.length}`);
      files.forEach(file => console.log(`  - ${file.name}`));
    } else {
      console.log('📊 No files found in buyer-receipts folder (folder may not exist)');
    }

    if ((receipts?.length || 0) === 0) {
      console.log('✅ Cleanup verification successful - no buyer receipts remain');
    } else {
      console.log('⚠️ Some buyer receipts may still exist');
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

// Run the verification
verifyCleanup()
  .then(() => {
    console.log('\n✅ Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });