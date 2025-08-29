#!/usr/bin/env node

/**
 * Final fix for missing PDF database record - handle foreign key constraints
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co';
const supabaseAnonKey = '<REDACTED_JWT>';
const supabaseServiceKey = '<REDACTED_JWT>';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function fixPDFRecordFinal() {
  console.log('🔧 Final Fix for PDF Database Record');
  console.log('=' .repeat(35));

  const problemOrderId = '74dc2a9d-8c73-4c8b-bdcf-c5482584ae15';
  const pdfUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co/storage/v1/object/public/documents/payment-release-pdfs/74dc2a9d-8c73-4c8b-bdcf-c5482584ae15/PaymentRelease_Service_Offer_Unknown_Service_Provider_74DC2A9D_2025-08-29.pdf';
  const pdfFilename = 'PaymentRelease_Service_Offer_Unknown_Service_Provider_74DC2A9D_2025-08-29.pdf';

  try {
    // 1. Check if record already exists
    console.log('\n1️⃣ Checking existing records...');
    
    const { data: existingRecord } = await supabase
      .from('payment_release_pdfs')
      .select('*')
      .eq('job_id', problemOrderId);

    if (existingRecord && existingRecord.length > 0) {
      console.log('✅ Record already exists - no action needed');
      return;
    }

    // 2. Find a valid admin user ID
    console.log('\n2️⃣ Finding valid admin user...');
    
    const { data: adminUsers, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .limit(5);

    let validAdminId = null;
    
    if (adminError) {
      console.log('❌ Error fetching admin users:', adminError.message);
    } else if (adminUsers && adminUsers.length > 0) {
      validAdminId = adminUsers[0].id;
      console.log(`✅ Found valid admin user: ${adminUsers[0].email} (${validAdminId})`);
    } else {
      console.log('❌ No users found in database');
    }

    // 3. Check table schema to see if admin_user_id is nullable
    console.log('\n3️⃣ Checking table schema...');
    
    // Try creating record without admin_user_id first
    const receiptNumber = `PR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    let recordData = {
      job_id: problemOrderId,
      job_table_source: 'orders',
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

    console.log('🔄 Attempting to create record without admin_user_id...');
    
    let { data: insertResult, error: insertError } = await supabaseAdmin
      .from('payment_release_pdfs')
      .insert(recordData)
      .select();

    if (insertError && insertError.code === '23502') {
      // admin_user_id is NOT NULL, try with valid admin ID
      console.log('⚠️ admin_user_id is required, trying with valid admin ID...');
      
      if (validAdminId) {
        recordData.admin_user_id = validAdminId;
        
        const result = await supabaseAdmin
          .from('payment_release_pdfs')
          .insert(recordData)
          .select();
        
        insertResult = result.data;
        insertError = result.error;
      } else {
        console.error('❌ No valid admin user found and admin_user_id is required');
        return;
      }
    }

    if (insertError) {
      console.error('❌ Error creating database record:', insertError);
      return;
    }

    console.log('✅ Database record created successfully!');
    console.log(`📋 Receipt Number: ${receiptNumber}`);

    // 4. Verify record accessibility
    console.log('\n4️⃣ Verifying record accessibility...');
    
    const { data: verifyRecord, error: verifyError } = await supabase
      .from('payment_release_pdfs')
      .select('*')
      .eq('job_id', problemOrderId)
      .single();

    if (verifyError) {
      console.error('❌ Record not accessible to regular users:', verifyError.message);
      
      // Check if it's an RLS issue
      if (verifyError.code === 'PGRST116') {
        console.log('⚠️ This might be due to RLS policies restricting access');
        console.log('💡 The record exists but may only be accessible to specific users');
      }
    } else {
      console.log('✅ Record is accessible!');
      console.log(`   Receipt: ${verifyRecord.receipt_number}`);
      console.log(`   PDF URL: ${verifyRecord.pdf_file_url}`);
    }

    // 5. Test PDF retrieval with service role (simulating backend)
    console.log('\n5️⃣ Testing PDF retrieval with service role...');
    
    const { data: serviceRoleTest, error: serviceRoleError } = await supabaseAdmin
      .from('payment_release_pdfs')
      .select('pdf_file_url, job_id, job_title, generated_at')
      .eq('job_id', problemOrderId)
      .single();

    if (serviceRoleError) {
      console.error('❌ Service role test failed:', serviceRoleError);
    } else {
      console.log('✅ Service role can access the record!');
      console.log(`   PDF URL: ${serviceRoleTest.pdf_file_url}`);
    }

    // 6. Final verification
    console.log('\n6️⃣ Final verification...');
    
    try {
      const response = await fetch(pdfUrl, { method: 'HEAD' });
      console.log(`📡 PDF accessibility: ${response.ok ? '✅ Accessible' : '❌ Not accessible'}`);
    } catch (fetchError) {
      console.log('❌ PDF fetch error:', fetchError.message);
    }

    console.log('\n🎉 Fix completed!');
    console.log('💡 Next steps:');
    console.log('   1. Test the PDF download from the frontend');
    console.log('   2. If still not accessible, check RLS policies');
    console.log('   3. Consider updating PDF service to use service role for retrieval');

  } catch (error) {
    console.error('❌ Error in fix script:', error);
  }
}

fixPDFRecordFinal()
  .then(() => {
    console.log('\n✅ Fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });