#!/usr/bin/env node

/**
 * Test script for Supabase storage upload functionality
 * This script helps diagnose storage upload issues for AI image generation
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStorageUpload() {
  console.log('🧪 Testing Supabase Storage Upload Functionality\n');

  try {
    // Test 1: Check network connectivity
    console.log('1️⃣ Testing network connectivity...');
    const connectivityTest = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseAnonKey,
      },
    });
    
    if (connectivityTest.ok || connectivityTest.status === 401) {
      console.log('✅ Network connectivity: OK');
    } else {
      console.log('❌ Network connectivity: FAILED');
      console.log(`   Status: ${connectivityTest.status} ${connectivityTest.statusText}`);
      return;
    }

    // Test 2: Check bucket existence
    console.log('\n2️⃣ Testing bucket accessibility...');
    const { data: bucketList, error: bucketError } = await supabase.storage
      .from('documents')
      .list('', { limit: 1 });

    if (bucketError) {
      console.log('❌ Bucket accessibility: FAILED');
      console.log('   Error:', bucketError.message);
      console.log('   Suggestion: Run the setup_storage_bucket.sql script');
      return;
    } else {
      console.log('✅ Bucket accessibility: OK');
    }

    // Test 3: Create a test image (1x1 PNG)
    console.log('\n3️⃣ Creating test image...');
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg==';
    
    // Convert base64 to ArrayBuffer
    const binaryString = atob(testImageBase64);
    const arrayBuffer = new ArrayBuffer(binaryString.length);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }
    
    console.log('✅ Test image created (size:', arrayBuffer.byteLength, 'bytes)');

    // Test 4: Upload test image
    console.log('\n4️⃣ Testing image upload...');
    const testFileName = `test_upload_${Date.now()}.png`;
    const testFilePath = `ai-generated-images/${testFileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(testFilePath, arrayBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.log('❌ Image upload: FAILED');
      console.log('   Error:', uploadError.message);
      console.log('   Error details:', JSON.stringify(uploadError, null, 2));
      
      // Provide specific troubleshooting suggestions
      if (uploadError.message.includes('Network request failed')) {
        console.log('\n🔧 Troubleshooting suggestions:');
        console.log('   - Check your internet connection');
        console.log('   - Verify Supabase project is active');
        console.log('   - Check if you\'re behind a firewall or proxy');
        console.log('   - Try again in a few minutes (temporary network issue)');
      } else if (uploadError.message.includes('permission')) {
        console.log('\n🔧 Troubleshooting suggestions:');
        console.log('   - Run the setup_storage_bucket.sql script');
        console.log('   - Check RLS policies on storage.objects table');
        console.log('   - Verify bucket permissions');
      }
      return;
    } else {
      console.log('✅ Image upload: SUCCESS');
      console.log('   File path:', uploadData.path);
    }

    // Test 5: Get public URL
    console.log('\n5️⃣ Testing public URL generation...');
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(testFilePath);

    if (urlData?.publicUrl) {
      console.log('✅ Public URL generation: SUCCESS');
      console.log('   URL:', urlData.publicUrl);
    } else {
      console.log('❌ Public URL generation: FAILED');
      return;
    }

    // Test 6: Verify URL accessibility
    console.log('\n6️⃣ Testing URL accessibility...');
    try {
      const urlTest = await fetch(urlData.publicUrl, { method: 'HEAD' });
      if (urlTest.ok) {
        console.log('✅ URL accessibility: SUCCESS');
      } else {
        console.log('❌ URL accessibility: FAILED');
        console.log('   Status:', urlTest.status, urlTest.statusText);
      }
    } catch (error) {
      console.log('❌ URL accessibility: FAILED');
      console.log('   Error:', error.message);
    }

    // Test 7: Clean up test file
    console.log('\n7️⃣ Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('documents')
      .remove([testFilePath]);

    if (deleteError) {
      console.log('⚠️ Cleanup: PARTIAL (file may remain)');
      console.log('   Error:', deleteError.message);
    } else {
      console.log('✅ Cleanup: SUCCESS');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('   Your Supabase storage is properly configured for AI image uploads.');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('   Stack trace:', error.stack);
  }
}

// Run the test
testStorageUpload().catch(console.error);