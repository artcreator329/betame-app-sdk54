/**
 * Comprehensive script to delete all generated PDFs for testing
 * This will clean up buyer invoices, service provider transaction slips, and user PDFs
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

async function deleteAllPDFs() {
  try {
    console.log('🗑️ Starting comprehensive cleanup of all PDF documents...');
    console.log('===========================================================');

    let totalDeleted = 0;
    let totalStorageDeleted = 0;
    let totalStorageErrors = 0;

    // 1. Delete Buyer Invoices
    console.log('\n📄 1. Cleaning up Buyer Invoices...');
    const { data: buyerInvoices, error: buyerError } = await supabaseAdmin
      .from('buyer_receipts')
      .select('*');

    if (buyerError) {
      console.error('❌ Error fetching buyer invoices:', buyerError);
    } else if (buyerInvoices && buyerInvoices.length > 0) {
      console.log(`📄 Found ${buyerInvoices.length} buyer invoices to delete`);

      // Delete files from storage
      for (const invoice of buyerInvoices) {
        if (invoice.pdf_file_url && invoice.pdf_filename) {
          try {
            const filePath = `buyer-invoices/${invoice.job_id}/${invoice.pdf_filename}`;
            console.log(`🗑️ Deleting: ${filePath}`);
            
            const { error: storageError } = await supabaseAdmin.storage
              .from('documents')
              .remove([filePath]);

            if (storageError) {
              console.warn(`⚠️ Storage deletion failed: ${storageError.message}`);
              totalStorageErrors++;
            } else {
              console.log(`✅ Deleted: ${filePath}`);
              totalStorageDeleted++;
            }
          } catch (error) {
            console.warn(`⚠️ Error processing ${invoice.pdf_filename}:`, error.message);
            totalStorageErrors++;
          }
        }
      }

      // Delete database records
      const { error: dbError } = await supabaseAdmin
        .from('buyer_receipts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (dbError) {
        console.error('❌ Error deleting buyer invoice records:', dbError);
      } else {
        console.log(`✅ Deleted ${buyerInvoices.length} buyer invoice records`);
        totalDeleted += buyerInvoices.length;
      }
    } else {
      console.log('✅ No buyer invoices found');
    }

    // 2. Delete Service Provider Transaction Slips
    console.log('\n📄 2. Cleaning up Service Provider Transaction Slips...');
    const { data: serviceProviderReceipts, error: spError } = await supabaseAdmin
      .from('service_provider_receipts')
      .select('*');

    if (spError) {
      console.error('❌ Error fetching service provider receipts:', spError);
    } else if (serviceProviderReceipts && serviceProviderReceipts.length > 0) {
      console.log(`📄 Found ${serviceProviderReceipts.length} service provider receipts to delete`);

      // Delete files from storage
      for (const receipt of serviceProviderReceipts) {
        if (receipt.pdf_file_url && receipt.pdf_filename) {
          try {
            const filePath = `service-provider-receipts/${receipt.job_id}/${receipt.pdf_filename}`;
            console.log(`🗑️ Deleting: ${filePath}`);
            
            const { error: storageError } = await supabaseAdmin.storage
              .from('documents')
              .remove([filePath]);

            if (storageError) {
              console.warn(`⚠️ Storage deletion failed: ${storageError.message}`);
              totalStorageErrors++;
            } else {
              console.log(`✅ Deleted: ${filePath}`);
              totalStorageDeleted++;
            }
          } catch (error) {
            console.warn(`⚠️ Error processing ${receipt.pdf_filename}:`, error.message);
            totalStorageErrors++;
          }
        }
      }

      // Delete database records
      const { error: dbError } = await supabaseAdmin
        .from('service_provider_receipts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (dbError) {
        console.error('❌ Error deleting service provider receipt records:', dbError);
      } else {
        console.log(`✅ Deleted ${serviceProviderReceipts.length} service provider receipt records`);
        totalDeleted += serviceProviderReceipts.length;
      }
    } else {
      console.log('✅ No service provider receipts found');
    }

    // 3. Delete User PDFs (Transaction Slips)
    console.log('\n📄 3. Cleaning up User Transaction Slips...');
    const { data: userPdfs, error: userError } = await supabaseAdmin
      .from('user_pdfs')
      .select('*');

    if (userError) {
      console.error('❌ Error fetching user PDFs:', userError);
    } else if (userPdfs && userPdfs.length > 0) {
      console.log(`📄 Found ${userPdfs.length} user PDFs to delete`);

      // Delete files from storage
      for (const pdf of userPdfs) {
        if (pdf.pdf_file_url && pdf.pdf_filename) {
          try {
            const filePath = `user-pdfs/${pdf.job_id}/${pdf.pdf_filename}`;
            console.log(`🗑️ Deleting: ${filePath}`);
            
            const { error: storageError } = await supabaseAdmin.storage
              .from('documents')
              .remove([filePath]);

            if (storageError) {
              console.warn(`⚠️ Storage deletion failed: ${storageError.message}`);
              totalStorageErrors++;
            } else {
              console.log(`✅ Deleted: ${filePath}`);
              totalStorageDeleted++;
            }
          } catch (error) {
            console.warn(`⚠️ Error processing ${pdf.pdf_filename}:`, error.message);
            totalStorageErrors++;
          }
        }
      }

      // Delete database records
      const { error: dbError } = await supabaseAdmin
        .from('user_pdfs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (dbError) {
        console.error('❌ Error deleting user PDF records:', dbError);
      } else {
        console.log(`✅ Deleted ${userPdfs.length} user PDF records`);
        totalDeleted += userPdfs.length;
      }
    } else {
      console.log('✅ No user PDFs found');
    }

    // 4. Delete Payment Release PDFs (Admin generated)
    console.log('\n📄 4. Cleaning up Payment Release PDFs...');
    const { data: paymentReleasePdfs, error: prError } = await supabaseAdmin
      .from('payment_release_pdfs')
      .select('*');

    if (prError) {
      console.error('❌ Error fetching payment release PDFs:', prError);
    } else if (paymentReleasePdfs && paymentReleasePdfs.length > 0) {
      console.log(`📄 Found ${paymentReleasePdfs.length} payment release PDFs to delete`);

      // Delete files from storage
      for (const pdf of paymentReleasePdfs) {
        if (pdf.pdf_file_url && pdf.pdf_filename) {
          try {
            const filePath = `payment-release-pdfs/${pdf.job_id}/${pdf.pdf_filename}`;
            console.log(`🗑️ Deleting: ${filePath}`);
            
            const { error: storageError } = await supabaseAdmin.storage
              .from('documents')
              .remove([filePath]);

            if (storageError) {
              console.warn(`⚠️ Storage deletion failed: ${storageError.message}`);
              totalStorageErrors++;
            } else {
              console.log(`✅ Deleted: ${filePath}`);
              totalStorageDeleted++;
            }
          } catch (error) {
            console.warn(`⚠️ Error processing ${pdf.pdf_filename}:`, error.message);
            totalStorageErrors++;
          }
        }
      }

      // Delete database records
      const { error: dbError } = await supabaseAdmin
        .from('payment_release_pdfs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (dbError) {
        console.error('❌ Error deleting payment release PDF records:', dbError);
      } else {
        console.log(`✅ Deleted ${paymentReleasePdfs.length} payment release PDF records`);
        totalDeleted += paymentReleasePdfs.length;
      }
    } else {
      console.log('✅ No payment release PDFs found');
    }

    // Summary
    console.log('\n📊 Comprehensive PDF Cleanup Summary:');
    console.log('=====================================');
    console.log(`Total database records deleted: ${totalDeleted}`);
    console.log(`Total storage files deleted: ${totalStorageDeleted}`);
    console.log(`Storage deletion errors: ${totalStorageErrors}`);
    console.log('');
    console.log('🎉 PDF cleanup completed!');
    console.log('You can now test fresh PDF generation for both buyers and service providers.');

  } catch (error) {
    console.error('❌ Unexpected error during PDF cleanup:', error);
  }
}

// Run the cleanup
deleteAllPDFs();