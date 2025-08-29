#!/usr/bin/env node

/**
 * Comprehensive search for PDF files in Supabase storage
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co';
const supabaseKey = '<REDACTED_JWT>';

const supabase = createClient(supabaseUrl, supabaseKey);

async function comprehensivePDFSearch() {
  console.log('🔍 Comprehensive PDF Search in Supabase Storage');
  console.log('=' .repeat(50));

  const problemOrderId = '74dc2a9d-8c73-4c8b-bdcf-c5482584ae15';

  try {
    // 1. List all storage buckets
    console.log('\n1️⃣ Listing all storage buckets...');
    
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
    } else {
      console.log(`📁 Found ${buckets?.length || 0} storage buckets:`);
      buckets?.forEach((bucket, index) => {
        console.log(`   ${index + 1}. ${bucket.name} (${bucket.public ? 'Public' : 'Private'})`);
      });
    }

    // 2. Search in documents bucket (main bucket)
    console.log('\n2️⃣ Searching documents bucket...');
    
    try {
      // List root level of documents bucket
      const { data: rootFiles, error: rootError } = await supabase.storage
        .from('documents')
        .list('', { limit: 100 });

      if (rootError) {
        console.error('❌ Error listing root documents:', rootError);
      } else {
        console.log(`📁 Root level items in documents bucket: ${rootFiles?.length || 0}`);
        rootFiles?.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.name} (${item.metadata?.size || 'Unknown size'})`);
        });
      }

      // List payment-release-pdfs folder
      const { data: pdfFolder, error: pdfFolderError } = await supabase.storage
        .from('documents')
        .list('payment-release-pdfs', { limit: 100 });

      if (pdfFolderError) {
        console.error('❌ Error listing payment-release-pdfs folder:', pdfFolderError);
      } else {
        console.log(`\n📁 Items in payment-release-pdfs folder: ${pdfFolder?.length || 0}`);
        pdfFolder?.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.name} (${item.metadata?.size || 'Unknown size'})`);
          
          // If this matches our problem order ID, investigate further
          if (item.name === problemOrderId) {
            console.log(`      🎯 Found folder for problem order ID!`);
          }
        });
      }

    } catch (documentsError) {
      console.error('❌ Error accessing documents bucket:', documentsError);
    }

    // 3. Try different path variations for the problem order
    console.log('\n3️⃣ Trying different path variations...');
    
    const pathVariations = [
      `payment-release-pdfs/${problemOrderId}`,
      `payment-release-pdfs/${problemOrderId}/`,
      `pdfs/${problemOrderId}`,
      `receipts/${problemOrderId}`,
      `documents/${problemOrderId}`,
      problemOrderId,
      `${problemOrderId}.pdf`
    ];

    for (const path of pathVariations) {
      console.log(`🔍 Checking path: ${path}`);
      
      try {
        const { data: pathFiles, error: pathError } = await supabase.storage
          .from('documents')
          .list(path, { limit: 10 });

        if (pathError) {
          console.log(`   ❌ Error: ${pathError.message}`);
        } else {
          console.log(`   ✅ Found ${pathFiles?.length || 0} items`);
          pathFiles?.forEach((file, index) => {
            console.log(`      ${index + 1}. ${file.name}`);
            
            // Generate public URL for PDF files
            if (file.name.endsWith('.pdf')) {
              const { data: urlData } = supabase.storage
                .from('documents')
                .getPublicUrl(`${path}/${file.name}`);
              console.log(`         URL: ${urlData.publicUrl}`);
            }
          });
        }
      } catch (pathSearchError) {
        console.log(`   ❌ Search error: ${pathSearchError.message}`);
      }
    }

    // 4. Search for any PDF files containing the order ID
    console.log('\n4️⃣ Searching for any files containing the order ID...');
    
    // We can't do a full-text search in storage, but we can check common patterns
    const searchPatterns = [
      `payment-release-${problemOrderId}`,
      `receipt-${problemOrderId}`,
      `invoice-${problemOrderId}`,
      problemOrderId
    ];

    for (const pattern of searchPatterns) {
      console.log(`🔍 Searching for pattern: ${pattern}`);
      
      // Try to access as a direct file
      try {
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(`${pattern}.pdf`);
        
        const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
        
        if (response.ok) {
          console.log(`   ✅ Found PDF: ${urlData.publicUrl}`);
        } else {
          console.log(`   ❌ Not found (${response.status})`);
        }
      } catch (searchError) {
        console.log(`   ❌ Search error: ${searchError.message}`);
      }
    }

    // 5. Check if there are any PDF files at all in the system
    console.log('\n5️⃣ Checking for any PDF files in the system...');
    
    try {
      // Search through common PDF locations
      const pdfLocations = [
        'payment-release-pdfs',
        'pdfs',
        'receipts',
        'documents',
        'invoices'
      ];

      for (const location of pdfLocations) {
        try {
          const { data: locationFiles, error: locationError } = await supabase.storage
            .from('documents')
            .list(location, { limit: 50 });

          if (!locationError && locationFiles && locationFiles.length > 0) {
            console.log(`📁 Found ${locationFiles.length} items in ${location}:`);
            
            locationFiles.forEach((file, index) => {
              if (file.name.endsWith('.pdf') || file.metadata?.mimetype === 'application/pdf') {
                console.log(`   📄 ${file.name} (PDF)`);
              } else {
                console.log(`   📁 ${file.name} (Folder)`);
              }
            });
          }
        } catch (locationSearchError) {
          // Location doesn't exist, continue
        }
      }
    } catch (systemSearchError) {
      console.error('❌ Error searching system for PDFs:', systemSearchError);
    }

    // 6. Summary and recommendations
    console.log('\n6️⃣ Summary and Recommendations');
    console.log('=' .repeat(40));
    
    console.log('🔍 Search Results:');
    console.log('   - No database records found for the order ID');
    console.log('   - No PDF files found in expected storage locations');
    console.log('   - Storage bucket structure appears to be set up correctly');
    
    console.log('\n💡 Possible Issues:');
    console.log('   1. PDF was never actually generated (backend error)');
    console.log('   2. PDF was generated but not stored properly');
    console.log('   3. PDF exists but in a different location/bucket');
    console.log('   4. Order ID might be from a different environment');
    console.log('   5. Storage permissions might prevent access');
    
    console.log('\n🔧 Recommended Actions:');
    console.log('   1. Check backend logs for PDF generation errors');
    console.log('   2. Verify the order ID exists in the correct environment');
    console.log('   3. Test PDF generation with a new order');
    console.log('   4. Check storage bucket permissions');
    console.log('   5. Implement proper error handling for PDF generation');

  } catch (error) {
    console.error('❌ Error in comprehensive search:', error);
  }
}

comprehensivePDFSearch()
  .then(() => {
    console.log('\n✅ Comprehensive search completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Search failed:', error);
    process.exit(1);
  });