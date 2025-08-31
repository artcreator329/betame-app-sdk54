/**
 * Delete All Buyer Receipts Script
 * 
 * This script will:
 * 1. Delete all buyer receipt records from the database
 * 2. Delete all buyer receipt files from Supabase storage
 * 
 * Run this after changing "Buyer Receipt" to "Invoice" to clean up old data
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteBuyerReceipts() {
  try {
    console.log('🗑️ Starting buyer receipt cleanup...');

    // Step 1: Get all buyer receipt records to know which files to delete
    console.log('📋 Fetching all buyer receipt records...');
    const { data: receipts, error: fetchError } = await supabaseAdmin
      .from('buyer_receipts')
      .select('*');

    if (fetchError) {
      console.error('❌ Error fetching buyer receipts:', fetchError);
      return;
    }

    console.log(`📊 Found ${receipts?.length || 0} buyer receipt records`);

    if (!receipts || receipts.length === 0) {
      console.log('✅ No buyer receipts found to delete');
      return;
    }

    // Step 2: Delete files from storage
    console.log('🗑️ Deleting buyer receipt files from storage...');
    let deletedFiles = 0;
    let failedFiles = 0;

    for (const receipt of receipts) {
      try {
        // Extract file path from URL
        const url = receipt.pdf_file_url;
        if (url) {
          // Extract path from URL (remove the base URL part)
          const urlParts = url.split('/storage/v1/object/public/pdfs/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            
            console.log(`🗑️ Deleting file: ${filePath}`);
            const { error: deleteError } = await supabaseAdmin.storage
              .from('pdfs')
              .remove([filePath]);

            if (deleteError) {
              console.error(`❌ Failed to delete file ${filePath}:`, deleteError);
              failedFiles++;
            } else {
              console.log(`✅ Deleted file: ${filePath}`);
              deletedFiles++;
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing receipt ${receipt.id}:`, error);
        failedFiles++;
      }
    }

    console.log(`📊 Storage cleanup complete: ${deletedFiles} deleted, ${failedFiles} failed`);

    // Step 3: Delete all buyer receipt records from database
    console.log('🗑️ Deleting buyer receipt records from database...');
    const { error: deleteError } = await supabaseAdmin
      .from('buyer_receipts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteError) {
      console.error('❌ Error deleting buyer receipt records:', deleteError);
      return;
    }

    console.log('✅ All buyer receipt records deleted from database');

    // Step 4: Try to delete the entire buyer-receipts folder from storage
    console.log('🗑️ Attempting to clean up buyer-receipts folder structure...');
    try {
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from('pdfs')
        .list('buyer-receipts', {
          limit: 1000,
          offset: 0
        });

      if (listError) {
        console.log('ℹ️ No buyer-receipts folder found or already empty');
      } else if (files && files.length > 0) {
        console.log(`🗑️ Found ${files.length} items in buyer-receipts folder`);
        
        // Delete any remaining files/folders
        const filesToDelete = files.map(file => `buyer-receipts/${file.name}`);
        const { error: bulkDeleteError } = await supabaseAdmin.storage
          .from('pdfs')
          .remove(filesToDelete);

        if (bulkDeleteError) {
          console.error('❌ Error cleaning up buyer-receipts folder:', bulkDeleteError);
        } else {
          console.log('✅ Buyer-receipts folder cleaned up');
        }
      }
    } catch (error) {
      console.log('ℹ️ Buyer-receipts folder cleanup completed or not needed');
    }

    console.log('\n🎉 Buyer receipt cleanup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Database records deleted: ${receipts.length}`);
    console.log(`- Storage files deleted: ${deletedFiles}`);
    console.log(`- Failed deletions: ${failedFiles}`);
    
    if (failedFiles > 0) {
      console.log('\n⚠️ Some files could not be deleted. This is normal if they were already removed.');
    }

  } catch (error) {
    console.error('❌ Unexpected error during cleanup:', error);
  }
}

// Run the cleanup
deleteBuyerReceipts()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });