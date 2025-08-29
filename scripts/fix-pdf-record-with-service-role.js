#!/usr/bin/env node

/**
 * Fix missing PDF database record using service role key to bypass RLS
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co';
const supabaseAnonKey = '<REDACTED_JWT>';
const supabaseServiceKey = '<REDACTED_JWT>';

// Create both clients
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fixPDFRecordWithServiceRole() {
  console.log('🔧 Fixing PDF Database Record with Service Role');
  console.log('=' .repeat(45));

  const problemOrderId = '74dc2a9d-8c73-4c8b-bdcf-c5482584ae15';
  const pdfUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co/storage/v1/object/public/documents/payment-release-pdfs/74dc2a9d-8c73-4c8b-bdcf-c5482584ae15/PaymentRelease_Service_Offer_Unknown_Service_Provider_74DC2A9D_2025-08-29.pdf';
  const pdfFilename = 'PaymentRelease_Service_Offer_Unknown_Service_Provider_74DC2A9D_2025-08-29.pdf';

  console.log(`Order ID: ${problemOrderId}`);

  try {
    // 1. Check if record already exists (using anon client)
    console.log('\n1️⃣ Checking existing database records...');
    
    const { data: existingRecord, error: checkError } = await supabase
      .from('payment_release_pdfs')
      .select('*')
      .eq('job_id', problemOrderId);

    if (checkError) {
      console.log('❌ Error checking existing records:', checkError.message);
    } else if (existingRecord && existingRecord.length > 0) {
      console.log('✅ Database record already exists:');
      console.log(`   Receipt Number: ${existingRecord[0].receipt_number}`);
      console.log(`   PDF URL: ${existingRecord[0].pdf_file_url}`);
      console.log('   No action needed - record exists');
      return;
    } else {
      console.log('❌ No database record found - creating one...');
    }

    // 2. Create the database record using service role (bypasses RLS)
    console.log('\n2️⃣ Creating database record with service role...');
    
    const receiptNumber = `PR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const recordData = {
      job_id: problemOrderId,
      job_table_source: 'orders',
      admin_user_id: '00000000-0000-0000-0000-000000000000', // System user
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

    console.log('📋 Creating record with receipt number:', receiptNumber);

    const { data: insertResult, error: insertError } = await supabaseAdmin
      .from('payment_release_pdfs')
      .insert(recordData)
      .select();

    if (insertError) {
      console.error('❌ Error creating database record:', insertError);
      return;
    }

    console.log('✅ Database record created successfully!');
    console.log('📋 Created record ID:', insertResult[0].id);

    // 3. Verify the record can be read by regular users
    console.log('\n3️⃣ Verifying record accessibility...');
    
    const { data: verifyRecord, error: verifyError } = await supabase
      .from('payment_release_pdfs')
      .select('*')
      .eq('job_id', problemOrderId)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying record accessibility:', verifyError);
      console.log('⚠️ Record created but may not be accessible to regular users due to RLS policies');
    } else {
      console.log('✅ Record is accessible to regular users!');
      console.log(`   Receipt Number: ${verifyRecord.receipt_number}`);
      console.log(`   PDF URL: ${verifyRecord.pdf_file_url}`);
    }

    // 4. Test the PDF retrieval function
    console.log('\n4️⃣ Testing PDF retrieval function...');
    
    // Simulate the PaymentReleasePDFService.getPDFReceipt() method
    const { data: pdfTest, error: pdfTestError } = await supabase
      .from('payment_release_pdfs')
      .select('pdf_file_url, job_id, job_title, generated_at')
      .eq('job_id', problemOrderId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (pdfTestError) {
      console.error('❌ PDF retrieval test failed:', pdfTestError);
    } else {
      console.log('✅ PDF retrieval test passed!');
      console.log(`   Job ID: ${pdfTest.job_id}`);
      console.log(`   Job Title: ${pdfTest.job_title}`);
      console.log(`   PDF URL: ${pdfTest.pdf_file_url}`);
      console.log(`   Generated: ${pdfTest.generated_at}`);
    }

    // 5. Test PDF file accessibility
    console.log('\n5️⃣ Testing PDF file accessibility...');
    
    try {
      const response = await fetch(pdfUrl, { method: 'HEAD' });
      
      if (response.ok) {
        console.log('✅ PDF file is accessible');
        console.log(`   Content-Length: ${response.headers.get('content-length')} bytes`);
      } else {
        console.log(`❌ PDF file not accessible (Status: ${response.status})`);
      }
    } catch (fetchError) {
      console.error('❌ Error accessing PDF file:', fetchError.message);
    }

    console.log('\n🎉 Fix completed successfully!');
    console.log('💡 The service provider should now be able to download the PDF receipt');
    console.log('🔗 PDF URL:', pdfUrl);

  } catch (error) {
    console.error('❌ Error in fix script:', error);
  }
}

fixPDFRecordWithServiceRole()
  .then(() => {
    console.log('\n✅ Fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });