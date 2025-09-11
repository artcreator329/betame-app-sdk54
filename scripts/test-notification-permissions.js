/**
 * Test Script: Notification Permission Service
 * 
 * This script tests the notification permission functionality
 * Run this in your app's debug console or as a standalone test
 */

import { NotificationPermissionService } from '../lib/notification-permission-service';
import { checkNotificationPermissions } from '../lib/local-notifications';

export async function testNotificationPermissions() {
  console.log('🧪 Testing Notification Permission Service...\n');

  try {
    // Test 1: Check current permission status
    console.log('1️⃣ Checking current permission status...');
    const hasPermission = await checkNotificationPermissions();
    console.log(`   Current permission: ${hasPermission ? '✅ Granted' : '❌ Denied'}\n`);

    // Test 2: Get detailed permission status
    console.log('2️⃣ Getting detailed permission status...');
    const status = await NotificationPermissionService.getCurrentPermissionStatus();
    console.log('   Status:', {
      hasPermission: status.hasPermission ? '✅ Yes' : '❌ No',
      lastChecked: status.lastChecked ? new Date(status.lastChecked).toLocaleString() : 'Never',
      lastDismissed: status.lastDismissed ? new Date(status.lastDismissed).toLocaleString() : 'Never',
    });
    console.log('');

    // Test 3: Check if should prompt
    console.log('3️⃣ Checking if should prompt for permissions...');
    const shouldPrompt = await NotificationPermissionService.shouldPromptForPermissions();
    console.log(`   Should prompt: ${shouldPrompt ? '✅ Yes' : '❌ No'}\n`);

    // Test 4: Test the prompt (only if should prompt)
    if (shouldPrompt) {
      console.log('4️⃣ Testing permission prompt...');
      console.log('   (This will show a system dialog)');
      const granted = await NotificationPermissionService.checkAndPromptIfNeeded();
      console.log(`   Result: ${granted ? '✅ Granted' : '❌ Denied'}\n`);
    } else {
      console.log('4️⃣ Skipping prompt test (not needed)\n');
    }

    // Test 5: Final status check
    console.log('5️⃣ Final permission status...');
    const finalStatus = await checkNotificationPermissions();
    console.log(`   Final permission: ${finalStatus ? '✅ Granted' : '❌ Denied'}\n`);

    console.log('✅ Notification permission tests completed!');
    
    return {
      initialPermission: hasPermission,
      shouldPrompt,
      finalPermission: finalStatus,
      status,
    };

  } catch (error) {
    console.error('❌ Error testing notification permissions:', error);
    throw error;
  }
}

export async function resetAndTestPermissions() {
  console.log('🔄 Resetting permission state and testing...\n');
  
  try {
    // Reset the permission state
    await NotificationPermissionService.resetPermissionState();
    console.log('✅ Permission state reset\n');
    
    // Run the full test
    return await testNotificationPermissions();
  } catch (error) {
    console.error('❌ Error in reset and test:', error);
    throw error;
  }
}

export async function forcePromptTest() {
  console.log('🚀 Force testing permission prompt...\n');
  
  try {
    const granted = await NotificationPermissionService.forceCheckPermissions();
    console.log(`Force prompt result: ${granted ? '✅ Granted' : '❌ Denied'}\n`);
    
    const finalStatus = await checkNotificationPermissions();
    console.log(`Final status: ${finalStatus ? '✅ Granted' : '❌ Denied'}\n`);
    
    return { granted, finalStatus };
  } catch (error) {
    console.error('❌ Error in force prompt test:', error);
    throw error;
  }
}

// Usage examples:
// 
// Basic test:
// import { testNotificationPermissions } from './scripts/test-notification-permissions';
// testNotificationPermissions();
//
// Reset and test:
// import { resetAndTestPermissions } from './scripts/test-notification-permissions';
// resetAndTestPermissions();
//
// Force prompt:
// import { forcePromptTest } from './scripts/test-notification-permissions';
// forcePromptTest();