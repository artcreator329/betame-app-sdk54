#!/usr/bin/env node

/**
 * Test script specifically for cover photo upload issues
 * This script helps diagnose networking problems with cover photo uploads
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

async function testCoverPhotoUpload() {
  console.log('🖼️ Testing Cover Photo Upload Functionality\n');

  try {
    // Test 1: Network connectivity with timeout
    console.log('1️⃣ Testing network connectivity with timeout...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      console.log('✅ Basic internet connectivity: OK');
    } catch (error) {
      clearTimeout(timeoutId);
      console.log('❌ Basic internet connectivity: FAILED');
      console.log('   Error:', error.message);
      return;
    }

    // Test 2: Supabase API latency test
    console.log('\n2️⃣ Testing Supabase API latency...');
    const latencyTests = [];
    
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': supabaseAnonKey,
          },
        });
        const latency = Date.now() - startTime;
        latencyTests.push(latency);
        console.log(`   Test ${i + 1}: ${latency}ms`);
      } catch (error) {
        console.log(`   Test ${i + 1}: FAILED - ${error.message}`);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (latencyTests.length > 0) {
      const avgLatency = latencyTests.reduce((a, b) => a + b, 0) / latencyTests.length;
      console.log(`   Average latency: ${Math.round(avgLatency)}ms`);
      
      if (avgLatency > 3000) {
        console.log('   ⚠️ High latency detected - this may cause upload timeouts');
      } else if (avgLatency > 1000) {
        console.log('   ⚠️ Moderate latency - uploads may be slower');
      } else {
        console.log('   ✅ Good latency for uploads');
      }
    }

    // Test 3: Create progressively larger test files
    console.log('\n3️⃣ Testing uploads with different file sizes...');
    
    const testSizes = [
      { name: 'Small (1KB)', size: 1024 },
      { name: 'Medium (100KB)', size: 100 * 1024 },
      { name: 'Large (1MB)', size: 1024 * 1024 },
      { name: 'Very Large (4MB)', size: 4 * 1024 * 1024 }
    ];
    
    for (const testSize of testSizes) {
      console.log(`\n   Testing ${testSize.name} upload...`);
      
      // Create test data
      const testData = new Uint8Array(testSize.size);
      for (let i = 0; i < testSize.size; i++) {
        testData[i] = i % 256; // Fill with pattern
      }
      
      const testFileName = `test-uploads/size-test-${testSize.size}-${Date.now()}.bin`;
      
      try {
        const uploadStart = Date.now();
        
        // Set timeout based on file size (30 seconds per MB)
        const timeoutMs = Math.max(30000, (testSize.size / (1024 * 1024)) * 30000);
        
        const uploadPromise = supabase.storage
          .from('profile-images')
          .upload(testFileName, testData, {
            contentType: 'application/octet-stream',
            upsert: true,
          });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Upload timeout')), timeoutMs);
        });
        
        const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);
        const uploadTime = Date.now() - uploadStart;
        
        if (error) {
          console.log(`   ❌ ${testSize.name} upload failed: ${error.message}`);
          
          if (error.message.includes('Network request failed')) {
            console.log('   💡 Network connectivity issue detected');
            console.log('   💡 Try: Check internet connection, switch networks, or try again later');
          }
        } else {
          console.log(`   ✅ ${testSize.name} upload successful in ${uploadTime}ms`);
          console.log(`   📊 Speed: ${Math.round((testSize.size / 1024) / (uploadTime / 1000))} KB/s`);
          
          // Clean up test file
          await supabase.storage.from('profile-images').remove([testFileName]);
        }
        
      } catch (error) {
        console.log(`   ❌ ${testSize.name} upload error: ${error.message}`);
        
        if (error.message.includes('timeout')) {
          console.log('   💡 Upload timed out - network may be too slow for large files');
        }
      }
    }

    // Test 4: Concurrent upload test
    console.log('\n4️⃣ Testing concurrent uploads (simulating retry scenario)...');
    
    const concurrentUploads = [];
    const testData = new Uint8Array(50 * 1024); // 50KB test files
    
    for (let i = 0; i < 3; i++) {
      const fileName = `test-uploads/concurrent-${i}-${Date.now()}.bin`;
      concurrentUploads.push(
        supabase.storage
          .from('profile-images')
          .upload(fileName, testData, {
            contentType: 'application/octet-stream',
            upsert: true,
          })
          .then(result => ({ index: i, result }))
          .catch(error => ({ index: i, error }))
      );
    }
    
    const results = await Promise.all(concurrentUploads);
    
    let successCount = 0;
    results.forEach(({ index, result, error }) => {
      if (error) {
        console.log(`   Upload ${index + 1}: ❌ ${error.message}`);
      } else if (result.error) {
        console.log(`   Upload ${index + 1}: ❌ ${result.error.message}`);
      } else {
        console.log(`   Upload ${index + 1}: ✅ Success`);
        successCount++;
      }
    });
    
    console.log(`\n   Concurrent upload success rate: ${successCount}/3`);
    
    if (successCount < 3) {
      console.log('   💡 Some concurrent uploads failed - network may be unstable');
    }

    // Clean up concurrent test files
    const cleanupFiles = results
      .filter(r => !r.error && !r.result?.error)
      .map((_, index) => `test-uploads/concurrent-${index}-${Date.now()}.bin`);
    
    if (cleanupFiles.length > 0) {
      await supabase.storage.from('profile-images').remove(cleanupFiles);
    }

    console.log('\n🎯 Cover Photo Upload Diagnosis Complete!');
    console.log('\n💡 Troubleshooting Tips:');
    console.log('   • If large file uploads fail, try reducing image quality');
    console.log('   • Switch from cellular to WiFi for better stability');
    console.log('   • Ensure stable internet connection before uploading');
    console.log('   • Try uploading during off-peak hours');
    console.log('   • Contact support if issues persist with small files');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('   Stack trace:', error.stack);
  }
}

// Run the test
testCoverPhotoUpload().catch(console.error);