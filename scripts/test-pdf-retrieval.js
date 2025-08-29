#!/usr/bin/env node

/**
 * Test PDF retrieval functionality to verify it works end-to-end
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co';
const supabaseAnonKey = '<REDACTED_JWT>';
const supabaseServiceKey = '<REDACTED_JWT>';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testPDFRetrieval() {
  console.log('🧪 Testing PDF Retrieval Functionality');
  console.log('=' .repeat(40));

  const problemOrderId = '74dc2a9d-8c73-4c8b-bdcf-c5482584ae15';
  const expectedPdfUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co/storage/v1/object/public/documents/payment-release-pdfs/74dc2a9d-8c73-4c8b-bdcf-c5482584ae15/PaymentRelease_Service_Offer_Unknown_Service_Provider_74DC2A9D_2025-08-29.pdf';

  try {
    // 1. Test with anonymous client (simulating frontend)
    console.log('\n1️⃣ Testing with anonymous client (frontend simulation)...');
    
    const { data: anonData, error: anonError } = await supabase
      .from('payment_release_pdfs')
      .select('pdf_file_url, job_id, job_title, generated_at')
      .eq('job_id', problemOrderId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (anonError) {
      console.error('❌ Anonymous client error:', anonError);
      console.log('   This suggests RLS policies are blocking access');
    } else {
      console.log('✅ Anonymous client can access PDF record!');
      console.log(`   Job ID: ${anonData.job_id}`);
      console.log(`   Job Title: ${anonData.job_title}`);
      console.log(`   PDF URL: ${anonData.pdf_file_url}`);
      console.log(`   Generated: ${anonData.generated_at}`);
    }

    // 2. Test with service role (simulating backend)
    console.log('\n2️⃣ Testing with service role (backend simulation)...');
    
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('payment_release_pdfs')
      .select('pdf_file_url, job_id, job_title, generated_at')
      .eq('job_id', problemOrderId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (adminError) {
      console.error('❌ Service role error:', adminError);
    } else {
      console.log('✅ Service role can access PDF record!');
      console.log(`   Job ID: ${adminData.job_id}`);
      console.log(`   Job Title: ${adminData.job_title}`);
      console.log(`   PDF URL: ${adminData.pdf_file_url}`);
      console.log(`   Generated: ${adminData.generated_at}`);
    }

    // 3. Test PDF file accessibility
    console.log('\n3️⃣ Testing PDF file accessibility...');
    
    try {
      const response = await fetch(expectedPdfUrl, { method: 'HEAD' });
      
      console.log(`📡 PDF Response Status: ${response.status}`);
      
      if (response.ok) {
        console.log('✅ PDF file is accessible');
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
        console.log(`   Content-Length: ${response.headers.get('content-length')} bytes`);
        console.log(`   Last-Modified: ${response.headers.get('last-modified')}`);
      } else {
        console.log('❌ PDF file not accessible');
      }
    } catch (fetchError) {
      console.error('❌ Error fetching PDF:', fetchError.message);
    }

    // 4. Simulate the PaymentReleasePDFService.getPDFReceipt() method
    console.log('\n4️⃣ Simulating PaymentReleasePDFService.getPDFReceipt()...');
    
    async function simulateGetPDFReceipt(jobId) {
      try {
        console.log(`🔍 Searching for PDF receipt with job ID: ${jobId}`);
        
        const { data, error } = await supabase
          .from('payment_release_pdfs')
          .select('pdf_file_url, job_id, job_title, generated_at')
          .eq('job_id', jobId)
          .order('generated_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.log('❌ Database error:', error);
          return {
            success: false,
            error: 'PDF receipt not found'
          };
        }

        if (!data) {
          console.log('❌ No PDF record found for job ID:', jobId);
          return {
            success: false,
            error: 'PDF receipt not found'
          };
        }

        console.log('✅ PDF receipt found:', {
          jobId: data.job_id,
          jobTitle: data.job_title,
          generatedAt: data.generated_at,
          pdfUrl: data.pdf_file_url
        });

        return {
          success: true,
          pdfUrl: data.pdf_file_url
        };

      } catch (error) {
        console.error('❌ Error getting PDF receipt:', error);
        return {
          success: false,
          error: error.message || 'Failed to get PDF receipt'
        };
      }
    }

    const pdfResult = await simulateGetPDFReceipt(problemOrderId);
    
    if (pdfResult.success) {
      console.log('✅ PDF retrieval simulation successful!');
      console.log(`   PDF URL: ${pdfResult.pdfUrl}`);
    } else {
      console.log('❌ PDF retrieval simulation failed:');
      console.log(`   Error: ${pdfResult.error}`);
    }

    // 5. Check RLS policies
    console.log('\n5️⃣ Checking RLS policies...');
    
    // Try to get all PDF records to see if RLS is blocking
    const { data: allPDFs, error: allPDFsError } = await supabase
      .from('payment_release_pdfs')
      .select('job_id, receipt_number, job_title')
      .limit(5);

    if (allPDFsError) {
      console.error('❌ RLS blocking access to payment_release_pdfs:', allPDFsError);
      console.log('💡 This explains why the frontend cannot access PDF receipts');
    } else {
      console.log(`✅ Anonymous client can access ${allPDFs?.length || 0} PDF records`);
      if (allPDFs && allPDFs.length > 0) {
        allPDFs.forEach((pdf, index) => {
          console.log(`   ${index + 1}. ${pdf.job_title} (${pdf.job_id})`);
        });
      }
    }

    // 6. Summary and recommendations
    console.log('\n6️⃣ Summary and Recommendations');
    console.log('=' .repeat(40));
    
    if (anonError) {
      console.log('❌ Issue Identified: RLS policies are blocking frontend access');
      console.log('💡 Recommendations:');
      console.log('   1. Update RLS policies to allow users to access their PDF receipts');
      console.log('   2. Or modify PDF service to use service role for retrieval');
      console.log('   3. Ensure proper user authentication in PDF retrieval');
    } else {
      console.log('✅ PDF retrieval system is working correctly!');
      console.log('💡 The service provider should be able to download PDF receipts');
    }

  } catch (error) {
    console.error('❌ Error in test script:', error);
  }
}

testPDFRetrieval()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });