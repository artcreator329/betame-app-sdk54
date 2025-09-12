#!/usr/bin/env node

/**
 * Debug script for intermittent upload failures
 * This script runs continuous tests to identify patterns in upload failures
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

// Test configuration
const TEST_CONFIG = {
  totalTests: 20,
  testInterval: 5000, // 5 seconds between tests
  fileSize: 100 * 1024, // 100KB test files
  timeout: 30000, // 30 second timeout per upload
};

let testResults = [];
let consecutiveFailures = 0;
let consecutiveSuccesses = 0;

async function createTestFile(size) {
  const buffer = Buffer.alloc(size);
  // Fill with pattern to make it compressible
  for (let i = 0; i < size; i++) {
    buffer[i] = i % 256;
  }
  return buffer;
}

async function testSingleUpload(testNumber) {
  const testStart = Date.now();
  const testFile = await createTestFile(TEST_CONFIG.fileSize);
  const fileName = `debug-test/intermittent-test-${testNumber}-${Date.now()}.bin`;
  
  console.log(`\n🧪 Test ${testNumber}/${TEST_CONFIG.totalTests} - ${new Date().toISOString()}`);
  
  const result = {
    testNumber,
    timestamp: new Date().toISOString(),
    success: false,
    uploadTime: 0,
    error: null,
    networkLatency: 0,
    storageLatency: 0,
    authStatus: 'unknown',
    fileSize: TEST_CONFIG.fileSize,
  };
  
  try {
    // 1. Test network latency
    const networkStart = Date.now();
    try {
      const response = await fetch('https://www.google.com', { method: 'HEAD' });
      result.networkLatency = Date.now() - networkStart;
      console.log(`   🌐 Network latency: ${result.networkLatency}ms`);
    } catch (error) {
      result.networkLatency = Date.now() - networkStart;
      console.log(`   🌐 Network test failed: ${error.message}`);
    }
    
    // 2. Test Supabase storage latency
    const storageStart = Date.now();
    try {
      const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      });
      result.storageLatency = Date.now() - storageStart;
      console.log(`   🗄️ Storage latency: ${result.storageLatency}ms`);
    } catch (error) {
      result.storageLatency = Date.now() - storageStart;
      console.log(`   🗄️ Storage test failed: ${error.message}`);
    }
    
    // 3. Check auth status
    try {
      const { data: { session } } = await supabase.auth.getSession();
      result.authStatus = session ? 'authenticated' : 'not_authenticated';
      console.log(`   🔐 Auth status: ${result.authStatus}`);
    } catch (error) {
      result.authStatus = 'error';
      console.log(`   🔐 Auth check failed: ${error.message}`);
    }
    
    // 4. Attempt upload with timeout
    const uploadStart = Date.now();
    
    const uploadPromise = supabase.storage
      .from('profile-images')
      .upload(fileName, testFile, {
        contentType: 'application/octet-stream',
        upsert: true,
      });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout')), TEST_CONFIG.timeout);
    });
    
    const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);
    result.uploadTime = Date.now() - uploadStart;
    
    if (error) {
      result.success = false;
      result.error = error.message;
      consecutiveFailures++;
      consecutiveSuccesses = 0;
      console.log(`   ❌ Upload failed: ${error.message} (${result.uploadTime}ms)`);
      console.log(`   📊 Consecutive failures: ${consecutiveFailures}`);
    } else {
      result.success = true;
      consecutiveSuccesses++;
      consecutiveFailures = 0;
      console.log(`   ✅ Upload successful (${result.uploadTime}ms)`);
      console.log(`   📊 Consecutive successes: ${consecutiveSuccesses}`);
      
      // Clean up successful upload
      try {
        await supabase.storage.from('profile-images').remove([fileName]);
        console.log(`   🗑️ Test file cleaned up`);
      } catch (cleanupError) {
        console.log(`   ⚠️ Cleanup failed: ${cleanupError.message}`);
      }
    }
    
  } catch (error) {
    result.success = false;
    result.error = error.message;
    result.uploadTime = Date.now() - testStart;
    consecutiveFailures++;
    consecutiveSuccesses = 0;
    console.log(`   ❌ Test failed: ${error.message}`);
    console.log(`   📊 Consecutive failures: ${consecutiveFailures}`);
  }
  
  testResults.push(result);
  return result;
}

function analyzeResults() {
  console.log('\n📊 ANALYSIS RESULTS');
  console.log('='.repeat(50));
  
  const totalTests = testResults.length;
  const successfulTests = testResults.filter(r => r.success).length;
  const failedTests = totalTests - successfulTests;
  const successRate = ((successfulTests / totalTests) * 100).toFixed(1);
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Successful: ${successfulTests} (${successRate}%)`);
  console.log(`Failed: ${failedTests} (${(100 - parseFloat(successRate)).toFixed(1)}%)`);
  
  if (failedTests > 0) {
    console.log('\n❌ FAILURE ANALYSIS:');
    
    // Group failures by error type
    const errorTypes = {};
    testResults.filter(r => !r.success).forEach(r => {
      const errorType = r.error || 'Unknown error';
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    });
    
    Object.entries(errorTypes).forEach(([error, count]) => {
      console.log(`   • ${error}: ${count} times`);
    });
    
    // Check for patterns
    console.log('\n🔍 PATTERN ANALYSIS:');
    
    // Network latency correlation
    const failedWithHighLatency = testResults.filter(r => !r.success && r.networkLatency > 2000).length;
    if (failedWithHighLatency > 0) {
      console.log(`   • ${failedWithHighLatency} failures had high network latency (>2s)`);
    }
    
    // Storage latency correlation
    const failedWithHighStorageLatency = testResults.filter(r => !r.success && r.storageLatency > 5000).length;
    if (failedWithHighStorageLatency > 0) {
      console.log(`   • ${failedWithHighStorageLatency} failures had high storage latency (>5s)`);
    }
    
    // Time-based patterns
    const failuresByHour = {};
    testResults.filter(r => !r.success).forEach(r => {
      const hour = new Date(r.timestamp).getHours();
      failuresByHour[hour] = (failuresByHour[hour] || 0) + 1;
    });
    
    if (Object.keys(failuresByHour).length > 0) {
      console.log('   • Failures by hour:', failuresByHour);
    }
  }
  
  // Performance analysis
  const successfulUploads = testResults.filter(r => r.success);
  if (successfulUploads.length > 0) {
    const avgUploadTime = successfulUploads.reduce((sum, r) => sum + r.uploadTime, 0) / successfulUploads.length;
    const minUploadTime = Math.min(...successfulUploads.map(r => r.uploadTime));
    const maxUploadTime = Math.max(...successfulUploads.map(r => r.uploadTime));
    
    console.log('\n⚡ PERFORMANCE ANALYSIS:');
    console.log(`   Average upload time: ${Math.round(avgUploadTime)}ms`);
    console.log(`   Fastest upload: ${minUploadTime}ms`);
    console.log(`   Slowest upload: ${maxUploadTime}ms`);
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (successRate < 80) {
    console.log('   • Upload success rate is low - investigate network/server issues');
  }
  
  if (testResults.some(r => r.networkLatency > 3000)) {
    console.log('   • High network latency detected - consider connection optimization');
  }
  
  if (testResults.some(r => r.storageLatency > 10000)) {
    console.log('   • High storage latency detected - Supabase may be experiencing issues');
  }
  
  const networkFailures = testResults.filter(r => !r.success && r.error?.includes('Network')).length;
  if (networkFailures > totalTests * 0.3) {
    console.log('   • Many network-related failures - check internet connection stability');
  }
  
  const timeoutFailures = testResults.filter(r => !r.success && r.error?.includes('timeout')).length;
  if (timeoutFailures > 0) {
    console.log(`   • ${timeoutFailures} timeout failures - consider increasing timeout values`);
  }
}

async function runIntermittentUploadTest() {
  console.log('🔍 Starting Intermittent Upload Failure Debug Test');
  console.log(`📋 Configuration: ${TEST_CONFIG.totalTests} tests, ${TEST_CONFIG.testInterval}ms interval, ${TEST_CONFIG.fileSize} bytes per file`);
  console.log('=' .repeat(70));
  
  for (let i = 1; i <= TEST_CONFIG.totalTests; i++) {
    await testSingleUpload(i);
    
    // Wait between tests (except for the last one)
    if (i < TEST_CONFIG.totalTests) {
      console.log(`   ⏳ Waiting ${TEST_CONFIG.testInterval}ms before next test...`);
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testInterval));
    }
    
    // Early termination if too many consecutive failures
    if (consecutiveFailures >= 5) {
      console.log('\n🛑 Stopping test due to 5 consecutive failures');
      break;
    }
  }
  
  analyzeResults();
  
  // Save results to file
  const resultsFile = `debug-results-${Date.now()}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify({
    config: TEST_CONFIG,
    results: testResults,
    summary: {
      totalTests: testResults.length,
      successfulTests: testResults.filter(r => r.success).length,
      failedTests: testResults.filter(r => !r.success).length,
      consecutiveFailures,
      consecutiveSuccesses,
    }
  }, null, 2));
  
  console.log(`\n💾 Results saved to: ${resultsFile}`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test interrupted by user');
  if (testResults.length > 0) {
    analyzeResults();
  }
  process.exit(0);
});

// Run the test
runIntermittentUploadTest().catch(console.error);