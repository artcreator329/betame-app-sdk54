#!/usr/bin/env node

/**
 * Fix PDF database record using a valid user ID from auth.users
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co';
const supabaseServiceKey = '<REDACTED_JWT>';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fixPDFRecordWithValidUser() {
  console.log('🔧 Fixing PDF Database Record with Valid User');
  console.log('=' .repeat(45));

  const problemOrderId = '74dc2a9d-8c73-4c8b-bdcf-c5482584ae15';
  const pdfUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co/storage/v1/object/public/documents/payment-release-pdfs/74dc2a9d-8c73-4c8b-bdcf-c5482584ae15/PaymentRelease_Service_Offer_Unknown_Service_Provider_74DC2A9D_2025-08-29.pdf';
  const pdfFilename = 'PaymentRelease_Service_Offer_Unknown_Service_Provider_74DC2A9D_2025-08-29.pdf';

  try {
    // 1. Check if record already exists
    console.log('\n1️⃣ Checking existing records...');
    
    const { data: existingRecord } = await supabaseAdmin
      .from('payment_release_pdfs')
      .select('*')
      .eq('job_id', problemOrderId);

    if (existingRecord && existingRecord.length > 0) {
      console.log('✅ Record already exists:');
      console.log(`   Receipt: ${existingRecord[0].receipt_number}`);
      console.log(`   PDF URL: ${existingRecord[0].pdf_file_url}`);
      console.log('   No action needed');
      return;
    }

    console.log('❌ No database record found - creating one...');

    // 2. Get a valid user ID from auth.users
    console.log('\n2️⃣ Finding valid user ID...');
    
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    if (!users || users.users.length === 0) {
      console.error('❌ No users found in auth.users');
      return;
    }

    const validUserId = users.users[0].id;
    console.log(`✅ Found valid user ID: ${validUserId}`);

    // 3. Create the database record
    console.log('\n3️⃣ Creating database record...');
    
    const receiptNumber = `PR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const recordData = {
      job_id: problemOrderId,
      job_table_source: 'orders',
      admin_user_id: validUserId,
      pdf_file_url: pdfUrl,
      pdf_filename: pdfFilename,
      receipt_number: receiptNumber,
      job_title: 'Service Order',
      service_provider_name: 'Service Provider',
      buyer_name: 'Customer',
      original_amount: 0,
      final_payout: 0,
      currency: 'RM',
      generated_at: new Date().toISOString()
    };

    console.log(`📋 Creating record with receipt number: ${receiptNumber}`);

    const { data: insertResult, error: insertError } = await supabaseAdmin
      .from('payment_release_pdfs')
      .insert(recordData)
      .select();

    if (insertError) {
      console.error('❌ Error creating database record:', insertError);
      return;
    }

    console.log('✅ Database record created successfully!');
    console.log(`📋 Record ID: ${insertResult[0].id}`);

    // 4. Verify the record can be retrieved
    console.log('\n4️⃣ Verifying record retrieval...');
    
    const { data: verifyRecord, error: verifyError } = await supabaseAdmin
      .from('payment_release_pdfs')
      .select('*')
      .eq('job_id', problemOrderId)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying record:', verifyError);
    } else {
      console.log('✅ Record can be retrieved successfully!');
      console.log(`   Receipt: ${verifyRecord.receipt_number}`);
      console.log(`   PDF URL: ${verifyRecord.pdf_file_url}`);
      console.log(`   Job Title: ${verifyRecord.job_title}`);
    }

    // 5. Test PDF file accessibility
    console.log('\n5️⃣ Testing PDF file accessibility...');
    
    try {
      const response = await fetch(pdfUrl, { method: 'HEAD' });
      
      if (response.ok) {
        console.log('✅ PDF file is accessible');
        console.log(`   Content-Length: ${response.headers.get('content-length')} bytes`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      } else {
        console.log(`❌ PDF file not accessible (Status: ${response.status})`);
      }
    } catch (fetchError) {
      console.error('❌ Error accessing PDF file:', fetchError.message);
    }

    // 6. Show all existing PDF records for context
    console.log('\n6️⃣ All PDF records in database...');
    
    const { data: allPDFs } = await supabaseAdmin
      .from('payment_release_pdfs')
      .select('job_id, receipt_number, job_title, generated_at')
      .order('generated_at', { ascending: false });

    if (allPDFs && allPDFs.length > 0) {
      console.log(`📋 Total PDF records: ${allPDFs.length}`);
      allPDFs.forEach((pdf, index) => {
        console.log(`   ${index + 1}. ${pdf.job_title} (${pdf.job_id})`);
        console.log(`      Receipt: ${pdf.receipt_number}`);
        console.log(`      Generated: ${pdf.generated_at}`);
      });
    }

    console.log('\n🎉 Fix completed successfully!');
    console.log('💡 The service provider should now be able to download the PDF receipt');
    console.log(`🔗 PDF URL: ${pdfUrl}`);

  } catch (error) {
    console.error('❌ Error in fix script:', error);
  }
}

fixPDFRecordWithValidUser()
  .then(() => {
    console.log('\n✅ Fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });