/**
 * Final Buyer Receipt Cleanup
 * 
 * This script will do a thorough cleanup of any remaining buyer receipts
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

async function finalCleanup() {
  try {
    console.log('🗑️ Starting final buyer receipt cleanup...');

    // Check what records exist
    const { data: receipts, error: fetchError } = await supabaseAdmin
      .from('buyer_receipts')
      .select('*');

    if (fetchError) {
      console.error('❌ Error fetching buyer receipts:', fetchError);
      return;
    }

    console.log(`📊 Found ${receipts?.length || 0} buyer receipt records`);
    
    if (receipts && receipts.length > 0) {
      console.log('📋 Remaining records:');
      receipts.forEach((receipt, index) => {
        console.log(`  ${index + 1}. ID: ${receipt.id}, Job: ${receipt.job_id}, URL: ${receipt.pdf_file_url}`);
      });

      // Delete each record individually
      for (const receipt of receipts) {
        console.log(`🗑️ Deleting record ${receipt.id}...`);
        
        // Try to delete the file first if URL exists
        if (receipt.pdf_file_url) {
          try {
            const urlParts = receipt.pdf_file_url.split('/storage/v1/object/public/pdfs/');
            if (urlParts.length > 1) {
              const filePath = urlParts[1];
              console.log(`🗑️ Attempting to delete file: ${filePath}`);
              
              const { error: deleteFileError } = await supabaseAdmin.storage
                .from('pdfs')
                .remove([filePath]);

              if (deleteFileError) {
                console.log(`ℹ️ File deletion result: ${deleteFileError.message}`);
              } else {
                console.log(`✅ File deleted: ${filePath}`);
              }
            }
          } catch (fileError) {
            console.log(`ℹ️ File cleanup: ${fileError.message}`);
          }
        }

        // Delete the database record
        const { error: deleteRecordError } = await supabaseAdmin
          .from('buyer_receipts')
          .delete()
          .eq('id', receipt.id);

        if (deleteRecordError) {
          console.error(`❌ Failed to delete record ${receipt.id}:`, deleteRecordError);
        } else {
          console.log(`✅ Deleted record: ${receipt.id}`);
        }
      }
    }

    // Final verification
    const { data: finalCheck, error: finalError } = await supabaseAdmin
      .from('buyer_receipts')
      .select('count', { count: 'exact' });

    if (finalError) {
      console.error('❌ Error in final check:', finalError);
    } else {
      console.log(`📊 Final count: ${finalCheck?.length || 0} buyer receipt records remaining`);
    }

    console.log('\n🎉 Final cleanup completed!');

  } catch (error) {
    console.error('❌ Unexpected error during final cleanup:', error);
  }
}

// Run the final cleanup
finalCleanup()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });