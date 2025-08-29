#!/usr/bin/env node

/**
 * Fix missing PDF database record for existing PDF file
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co';
const supabaseKey = '<REDACTED_JWT>';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixMissingPDFDatabaseRecord() {
  console.log('🔧 Fixing Missing PDF Database Record');
  console.log('=' .repeat(40));

  const problemOrderId = '74dc2a9d-8c73-4c8b-bdcf-c5482584ae15';
  const pdfUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co/storage/v1/object/public/documents/payment-release-pdfs/74dc2a9d-8c73-4c8b-bdcf-c5482584ae15/PaymentRelease_Service_Offer_Unknown_Service_Provider_74DC2A9D_2025-08-29.pdf';
  const pdfFilename = 'PaymentRelease_Service_Offer_Unknown_Service_Provider_74DC2A9D_2025-08-29.pdf';

  console.log(`Order ID: ${problemOrderId}`);
  console.log(`PDF URL: ${pdfUrl}`);

  try {
    // 1. Verify the PDF file exists and is accessible
    console.log('\n1️⃣ Verifying PDF file accessibility...');
    
    try {
      const response = await fetch(pdfUrl, { method: 'HEAD' });
      
      if (response.ok) {
        console.log('✅ PDF file is accessible');
        console.log(`   Status: ${response.status}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
        console.log(`   Content-Length: ${response.headers.get('content-length')} bytes`);
      } else {
        console.log(`❌ PDF file not accessible (Status: ${response.status})`);
        return;
      }
    } catch (fetchError) {
      console.error('❌ Error accessing PDF file:', fetchError.message);
      return;
    }

    // 2. Check if database record already exists
    console.log('\n2️⃣ Checking existing database records...');
    
    const { data: existingRecord, error: checkError } = await supabase
      .from('payment_release_pdfs')
      .select('*')
      .eq('job_id', problemOrderId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing records:', checkError);
      return;
    }

    if (existingRecord) {
      console.log('✅ Database record already exists:');
      console.log(`   Receipt Number: ${existingRecord.receipt_number}`);
      console.log(`   PDF URL: ${existingRecord.pdf_file_url}`);
      console.log('   No action needed - record exists');
      return;
    }

    console.log('❌ No database record found - creating one...');

    // 3. Try to get order information for better record details
    console.log('\n3️⃣ Looking up order information...');
    
    let orderInfo = null;
    
    // Check different tables for order information
    const tables = ['orders', 'active_jobs', 'job_status', 'service_offers'];
    
    for (const table of tables) {
      try {
        const { data: orderData, error: orderError } = await supabase
          .from(table)
          .select('*')
          .eq('id', problemOrderId)
          .single();

        if (!orderError && orderData) {
          console.log(`✅ Found order information in ${table} table`);
          orderInfo = { ...orderData, table_source: table };
          break;
        }
      } catch (tableError) {
        // Continue to next table
      }
    }

    if (!orderInfo) {
      console.log('⚠️ No order information found - using default values');
    } else {
      console.log(`   Title: ${orderInfo.title || orderInfo.service_title || 'Unknown'}`);
      console.log(`   Amount: ${orderInfo.amount || orderInfo.price || 0}`);
      console.log(`   Table Source: ${orderInfo.table_source}`);
    }

    // 4. Create the database record
    console.log('\n4️⃣ Creating database record...');
    
    const receiptNumber = `PR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const recordData = {
      job_id: problemOrderId,
      job_table_source: orderInfo?.table_source || 'orders',
      admin_user_id: '00000000-0000-0000-0000-000000000000', // System user
      pdf_file_url: pdfUrl,
      pdf_filename: pdfFilename,
      receipt_number: receiptNumber,
      job_title: orderInfo?.title || orderInfo?.service_title || 'Service Order',
      service_provider_name: orderInfo?.service_provider_name || 'Service Provider',
      buyer_name: orderInfo?.buyer_name || orderInfo?.customer_name || 'Customer',
      original_amount: orderInfo?.amount || orderInfo?.price || 0,
      final_payout: (orderInfo?.amount || orderInfo?.price || 0) - (orderInfo?.platform_fee || 0),
      currency: 'RM',
      generated_at: new Date().toISOString()
    };

    console.log('📋 Record data to insert:');
    console.log(JSON.stringify(recordData, null, 2));

    const { data: insertResult, error: insertError } = await supabase
      .from('payment_release_pdfs')
      .insert(recordData)
      .select();

    if (insertError) {
      console.error('❌ Error creating database record:', insertError);
      return;
    }

    console.log('✅ Database record created successfully!');
    console.log('📋 Created record:', insertResult[0]);

    // 5. Test PDF retrieval
    console.log('\n5️⃣ Testing PDF retrieval...');
    
    const { data: testRecord, error: testError } = await supabase
      .from('payment_release_pdfs')
      .select('*')
      .eq('job_id', problemOrderId)
      .single();

    if (testError) {
      console.error('❌ Error retrieving created record:', testError);
    } else {
      console.log('✅ PDF record can be retrieved successfully!');
      console.log(`   Receipt Number: ${testRecord.receipt_number}`);
      console.log(`   PDF URL: ${testRecord.pdf_file_url}`);
      console.log(`   Job Title: ${testRecord.job_title}`);
    }

    // 6. Test the frontend PDF service
    console.log('\n6️⃣ Testing frontend PDF service compatibility...');
    
    // Simulate what the PaymentReleasePDFService.getPDFReceipt() method does
    const { data: frontendTest, error: frontendError } = await supabase
      .from('payment_release_pdfs')
      .select('pdf_file_url, job_id, job_title, generated_at')
      .eq('job_id', problemOrderId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (frontendError) {
      console.error('❌ Frontend service test failed:', frontendError);
    } else {
      console.log('✅ Frontend service compatibility test passed!');
      console.log('   The PDF should now be accessible from the frontend');
    }

    console.log('\n🎉 Fix completed successfully!');
    console.log('💡 The service provider should now be able to download the PDF receipt');

  } catch (error) {
    console.error('❌ Error in fix script:', error);
  }
}

fixMissingPDFDatabaseRecord()
  .then(() => {
    console.log('\n✅ Fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });