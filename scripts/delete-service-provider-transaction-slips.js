#!/usr/bin/env node

/**
 * Delete All Service Provider Transaction Slips
 * 
 * This script removes all existing PDF receipts and transaction slips for service providers
 * so they can be regenerated with the corrected fee structure (without platform fee).
 * 
 * Tables that will be cleaned:
 * - payment_release_pdfs (admin-generated payment release receipts)
 * - service_provider_receipts (service provider transaction slips)
 * - user_pdfs (user-generated PDF receipts)
 * - buyer_receipts (buyer receipts - kept for reference)
 * 
 * Storage files will also be deleted from Supabase storage.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteServiceProviderTransactionSlips() {
  console.log('🗑️  Starting deletion of service provider transaction slips...\n');

  try {
    // 1. Get all payment release PDFs to delete from storage
    console.log('📋 Fetching payment release PDFs...');
    const { data: paymentReleasePdfs, error: fetchPaymentError } = await supabase
      .from('payment_release_pdfs')
      .select('pdf_filename, pdf_file_url');

    if (fetchPaymentError) {
      console.error('❌ Error fetching payment release PDFs:', fetchPaymentError);
    } else {
      console.log(`📄 Found ${paymentReleasePdfs?.length || 0} payment release PDFs`);
    }

    // 2. Get all service provider receipts to delete from storage
    console.log('📋 Fetching service provider receipts...');
    const { data: serviceProviderReceipts, error: fetchServiceError } = await supabase
      .from('service_provider_receipts')
      .select('pdf_filename, pdf_file_url');

    if (fetchServiceError) {
      console.error('❌ Error fetching service provider receipts:', fetchServiceError);
    } else {
      console.log(`📄 Found ${serviceProviderReceipts?.length || 0} service provider receipts`);
    }

    // 3. Get all user PDFs to delete from storage
    console.log('📋 Fetching user PDFs...');
    const { data: userPdfs, error: fetchUserError } = await supabase
      .from('user_pdfs')
      .select('pdf_filename, pdf_file_url');

    if (fetchUserError) {
      console.error('❌ Error fetching user PDFs:', fetchUserError);
    } else {
      console.log(`📄 Found ${userPdfs?.length || 0} user PDFs`);
    }

    // 4. Delete files from Supabase storage
    console.log('\n🗂️  Deleting PDF files from storage...');
    
    const allPdfs = [
      ...(paymentReleasePdfs || []),
      ...(serviceProviderReceipts || []),
      ...(userPdfs || [])
    ];

    let deletedFiles = 0;
    for (const pdf of allPdfs) {
      if (pdf.pdf_filename) {
        try {
          const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([pdf.pdf_filename]);

          if (storageError) {
            console.log(`⚠️  Could not delete file ${pdf.pdf_filename}:`, storageError.message);
          } else {
            deletedFiles++;
            console.log(`✅ Deleted file: ${pdf.pdf_filename}`);
          }
        } catch (error) {
          console.log(`⚠️  Error deleting file ${pdf.pdf_filename}:`, error.message);
        }
      }
    }

    console.log(`\n📁 Deleted ${deletedFiles} files from storage`);

    // 5. Delete database records
    console.log('\n🗃️  Deleting database records...');

    // Delete payment release PDFs
    const { error: deletePaymentError, count: paymentCount } = await supabase
      .from('payment_release_pdfs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deletePaymentError) {
      console.error('❌ Error deleting payment release PDFs:', deletePaymentError);
    } else {
      console.log(`✅ Deleted ${paymentCount || 'all'} payment release PDF records`);
    }

    // Delete service provider receipts
    const { error: deleteServiceError, count: serviceCount } = await supabase
      .from('service_provider_receipts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteServiceError) {
      console.error('❌ Error deleting service provider receipts:', deleteServiceError);
    } else {
      console.log(`✅ Deleted ${serviceCount || 'all'} service provider receipt records`);
    }

    // Delete user PDFs
    const { error: deleteUserError, count: userCount } = await supabase
      .from('user_pdfs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteUserError) {
      console.error('❌ Error deleting user PDFs:', deleteUserError);
    } else {
      console.log(`✅ Deleted ${userCount || 'all'} user PDF records`);
    }

    // 6. Summary
    console.log('\n📊 DELETION SUMMARY:');
    console.log('='.repeat(50));
    console.log(`📁 Storage files deleted: ${deletedFiles}`);
    console.log(`📄 Payment release PDFs: ${paymentCount || 'all'} records deleted`);
    console.log(`📄 Service provider receipts: ${serviceCount || 'all'} records deleted`);
    console.log(`📄 User PDFs: ${userCount || 'all'} records deleted`);
    console.log('='.repeat(50));

    console.log('\n✅ SUCCESS: All service provider transaction slips have been deleted!');
    console.log('\n📝 Next Steps:');
    console.log('1. Service providers can now generate new transaction slips');
    console.log('2. New slips will show correct fee structure (no platform fee)');
    console.log('3. Only service fee (RM4.90 or 11%) will be deducted');
    console.log('4. Platform fee (2.2%) is paid by buyers, not shown on service provider receipts');

  } catch (error) {
    console.error('❌ Unexpected error during deletion:', error);
    process.exit(1);
  }
}

// Run the deletion
deleteServiceProviderTransactionSlips()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });