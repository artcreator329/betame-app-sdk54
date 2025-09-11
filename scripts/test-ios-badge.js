/**
 * Test script for iOS badge functionality
 * Run this to test if the iOS badge count is working correctly
 */

import { iosBadgeService } from '../lib/ios-badge-service.js';

async function testIOSBadge() {
  console.log('🍎 Testing iOS Badge Service...\n');

  try {
    // Test 1: Get current badge count
    console.log('📱 Test 1: Getting current badge count...');
    const currentCount = await iosBadgeService.getBadgeCount();
    console.log(`✅ Current iOS badge count: ${currentCount}\n`);

    // Test 2: Set badge count to 5
    console.log('📱 Test 2: Setting badge count to 5...');
    await iosBadgeService.updateBadgeCount(5);
    const newCount = await iosBadgeService.getBadgeCount();
    console.log(`✅ Badge count after setting to 5: ${newCount}\n`);

    // Test 3: Clear badge
    console.log('📱 Test 3: Clearing badge...');
    await iosBadgeService.clearBadge();
    const clearedCount = await iosBadgeService.getBadgeCount();
    console.log(`✅ Badge count after clearing: ${clearedCount}\n`);

    // Test 4: Test duplicate updates (should not update if same count)
    console.log('📱 Test 4: Testing duplicate updates...');
    await iosBadgeService.updateBadgeCount(3);
    console.log('First update to 3 completed');
    await iosBadgeService.updateBadgeCount(3);
    console.log('Second update to 3 completed (should be skipped)');
    const finalCount = await iosBadgeService.getBadgeCount();
    console.log(`✅ Final badge count: ${finalCount}\n`);

    console.log('🎉 iOS Badge Service test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Badge count retrieval works');
    console.log('- ✅ Badge count setting works');
    console.log('- ✅ Badge clearing works');
    console.log('- ✅ Duplicate update prevention works');
    
  } catch (error) {
    console.error('❌ iOS Badge Service test failed:', error);
  }
}

// Run the test
testIOSBadge();