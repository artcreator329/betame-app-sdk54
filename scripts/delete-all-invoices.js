/**
 * Script to delete all generated buyer invoices for testing
 * This will clean up both database records and storage files
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteAllInvoices() {
  try {
    console.log('🗑️ Starting cleanup of all buyer invoices...');
    console.log('=====================================');

    // First, get all buyer invoice records
    const { data: invoices, error: fetchError } = await supabaseAdmin
      .from('buyer_receipts')
      .select('*');

    if (fetchError) {
      console.error('❌ Error fetching invoices:', fetchError);
      return;
    }

    if (!invoices || invoices.length === 0) {
      console.log('✅ No invoices found to delete');
      return;
    }

    console.log(`📄 Found ${invoices.length} invoices to delete`);

    // Delete files from storage
    let storageDeleteCount = 0;
    let storageErrorCount = 0;

    for (const invoice of invoices) {
      if (invoice.pdf_file_url && invoice.pdf_filename) {
        try {
          // Extract file path from the stored data
          const filePath = `buyer-invoices/${invoice.job_id}/${invoice.pdf_filename}`;
          
          console.log(`🗑️ Deleting storage file: ${filePath}`);
          
          const { error: storageError } = await supabaseAdmin.storage
            .from('documents')
            .remove([filePath]);

          if (storageError) {
            console.warn(`⚠️ Could not delete storage file ${filePath}:`, storageError.message);
            storageErrorCount++;
          } else {
            console.log(`✅ Deleted storage file: ${filePath}`);
            storageDeleteCount++;
          }
        } catch (error) {
          console.warn(`⚠️ Error processing storage file for invoice ${invoice.id}:`, error.message);
          storageErrorCount++;
        }
      }
    }

    // Delete all records from database
    console.log('🗑️ Deleting all invoice records from database...');
    
    const { error: dbError } = await supabaseAdmin
      .from('buyer_receipts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (dbError) {
      console.error('❌ Error deleting invoice records:', dbError);
      return;
    }

    console.log('✅ All invoice records deleted from database');

    // Summary
    console.log('');
    console.log('📊 Cleanup Summary:');
    console.log(`Database records deleted: ${invoices.length}`);
    console.log(`Storage files deleted: ${storageDeleteCount}`);
    console.log(`Storage deletion errors: ${storageErrorCount}`);
    console.log('');
    console.log('🎉 Invoice cleanup completed!');
    console.log('You can now test fresh invoice generation.');

  } catch (error) {
    console.error('❌ Unexpected error during cleanup:', error);
  }
}

// Run the cleanup
deleteAllInvoices();