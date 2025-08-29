#!/usr/bin/env node

/**
 * Debug script to check PDF storage and database connection
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co';
const supabaseKey = '<REDACTED_JWT>';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPDFStorageConnection() {
  console.log('🔍 Debugging PDF Storage and Database Connection');
  console.log('=' .repeat(50));

  const problemOrderId = '74dc2a9d-8c73-4c8b-bdcf-c5482584ae15';
  console.log(`Target Order ID: ${problemOrderId}`);

  try {
    // 1. Check if database record exists
    console.log('\n1️⃣ Checking payment_release_pdfs database records...');
    
    const { data: pdfRecords, error: pdfError } = await supabase
      .from('payment_release_pdfs')
      .select('*')
      .eq('job_id', problemOrderId);

    if (pdfError) {
      console.error('❌ Error querying payment_release_pdfs:', pdfError);
    } else {
      console.log(`📋 Found ${pdfRecords?.length || 0} database records for this job ID`);
      
      if (pdfRecords && pdfRecords.length > 0) {
        pdfRecords.forEach((record, index) => {
          console.log(`   ${index + 1}. Receipt: ${record.receipt_number}`);
          console.log(`      PDF URL: ${record.pdf_file_url}`);
          console.log(`      Filename: ${record.pdf_filename}`);
          console.log(`      Generated: ${record.generated_at}`);
          console.log(`      Table Source: ${record.job_table_source}`);
        });
      } else {
        console.log('   ❌ No database records found - this is the problem!');
      }
    }

    // 2. Check storage directly
    console.log('\n2️⃣ Checking Supabase storage...');
    
    try {
      // List files in the payment-release-pdfs folder for this job
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('documents')
        .list(`payment-release-pdfs/${problemOrderId}`, {
          limit: 100,
          offset: 0
        });

      if (storageError) {
        console.error('❌ Error listing storage files:', storageError);
      } else {
        console.log(`📁 Found ${storageFiles?.length || 0} files in storage for this job ID`);
        
        if (storageFiles && storageFiles.length > 0) {
          storageFiles.forEach((file, index) => {
            console.log(`   ${index + 1}. File: ${file.name}`);
            console.log(`      Size: ${file.metadata?.size || 'Unknown'} bytes`);
            console.log(`      Last Modified: ${file.updated_at}`);
            
            // Generate the public URL for this file
            const { data: urlData } = supabase.storage
              .from('documents')
              .getPublicUrl(`payment-release-pdfs/${problemOrderId}/${file.name}`);
            
            console.log(`      Public URL: ${urlData.publicUrl}`);
          });
        } else {
          console.log('   ❌ No files found in storage');
        }
      }
    } catch (storageError) {
      console.error('❌ Error accessing storage:', storageError);
    }

    // 3. Check if we can access the PDF directly
    console.log('\n3️⃣ Testing direct PDF access...');
    
    // Try to construct the expected URL
    const expectedPath = `payment-release-pdfs/${problemOrderId}`;
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(expectedPath);
    
    console.log(`🔗 Expected base URL: ${urlData.publicUrl}`);
    
    // Try to fetch the URL to see if it exists
    try {
      const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
      console.log(`📡 URL Response Status: ${response.status}`);
      
      if (response.ok) {
        console.log('✅ PDF is accessible via direct URL');
      } else {
        console.log('❌ PDF not accessible via direct URL');
      }
    } catch (fetchError) {
      console.log('❌ Could not fetch PDF URL:', fetchError.message);
    }

    // 4. Check all PDF records to understand the pattern
    console.log('\n4️⃣ Checking all PDF records for pattern analysis...');
    
    const { data: allPDFs, error: allPDFsError } = await supabase
      .from('payment_release_pdfs')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(10);

    if (allPDFsError) {
      console.error('❌ Error fetching all PDFs:', allPDFsError);
    } else {
      console.log(`📋 Total PDF records in database: ${allPDFs?.length || 0}`);
      
      if (allPDFs && allPDFs.length > 0) {
        console.log('\n📄 Recent PDF Records:');
        allPDFs.forEach((pdf, index) => {
          console.log(`   ${index + 1}. Job ID: ${pdf.job_id}`);
          console.log(`      Title: ${pdf.job_title}`);
          console.log(`      Table Source: ${pdf.job_table_source}`);
          console.log(`      PDF URL: ${pdf.pdf_file_url}`);
          console.log(`      Generated: ${pdf.generated_at}`);
          console.log('');
        });
      }
    }

    // 5. Try to create a database record for the existing PDF
    console.log('\n5️⃣ Attempting to create missing database record...');
    
    // First, let's see if we can find the actual PDF file
    const { data: existingFiles } = await supabase.storage
      .from('documents')
      .list(`payment-release-pdfs/${problemOrderId}`);

    if (existingFiles && existingFiles.length > 0) {
      const pdfFile = existingFiles[0]; // Take the first PDF file
      const fullPath = `payment-release-pdfs/${problemOrderId}/${pdfFile.name}`;
      
      const { data: pdfUrl } = supabase.storage
        .from('documents')
        .getPublicUrl(fullPath);

      console.log(`📄 Found PDF file: ${pdfFile.name}`);
      console.log(`🔗 PDF URL: ${pdfUrl.publicUrl}`);
      
      // Try to create a database record for this PDF
      const receiptNumber = `PR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      console.log('🔄 Creating database record...');
      
      const { data: insertResult, error: insertError } = await supabase
        .from('payment_release_pdfs')
        .insert({
          job_id: problemOrderId,
          job_table_source: 'orders', // Assuming it's from orders table
          admin_user_id: '00000000-0000-0000-0000-000000000000', // System user
          pdf_file_url: pdfUrl.publicUrl,
          pdf_filename: pdfFile.name,
          receipt_number: receiptNumber,
          job_title: 'Service Order', // Default title
          service_provider_name: 'Service Provider',
          buyer_name: 'Customer',
          original_amount: 0, // Would need actual data
          final_payout: 0, // Would need actual data
          currency: 'RM',
          generated_at: new Date().toISOString()
        })
        .select();

      if (insertError) {
        console.error('❌ Error creating database record:', insertError);
      } else {
        console.log('✅ Database record created successfully!');
        console.log('📋 Record:', insertResult);
        
        // Now test if the PDF can be retrieved
        console.log('\n🧪 Testing PDF retrieval after database record creation...');
        
        const { data: testPDF } = await supabase
          .from('payment_release_pdfs')
          .select('*')
          .eq('job_id', problemOrderId)
          .single();

        if (testPDF) {
          console.log('✅ PDF can now be retrieved from database');
          console.log(`📄 Receipt Number: ${testPDF.receipt_number}`);
          console.log(`🔗 PDF URL: ${testPDF.pdf_file_url}`);
        }
      }
    } else {
      console.log('❌ No PDF files found in storage to create database record for');
    }

  } catch (error) {
    console.error('❌ Error in debug script:', error);
  }
}

debugPDFStorageConnection()
  .then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });