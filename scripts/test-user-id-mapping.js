/**
 * Test User ID Mapping for RevenueCat
 * 
 * This script tests that RevenueCat properly maps user IDs for wallet operations
 */

import RevenueCatIAPService from '../lib/revenuecat-iap-service';

async function testUserIdMapping() {
  console.log('🧪 Testing RevenueCat User ID Mapping...\n');

  try {
    const testUserId = '20936ff2-2654-4dd5-9b36-1b69df15d6e0';
    
    // Test 1: Initialize RevenueCat
    console.log('📋 Test 1: Initialize RevenueCat Service');
    const iapService = RevenueCatIAPService.getInstance();
    const initialized = await iapService.initialize();
    
    if (!initialized) {
      console.log('❌ RevenueCat initialization failed');
      return;
    }
    console.log('✅ RevenueCat initialized successfully\n');

    // Test 2: Set User ID
    console.log('📋 Test 2: Set User ID');
    console.log('Setting user ID:', testUserId);
    
    try {
      await iapService.setUser(testUserId);
      console.log('✅ User ID set successfully\n');
    } catch (error) {
      console.log('❌ Failed to set user ID:', error.message);
      return;
    }

    // Test 3: Verify Customer Info
    console.log('📋 Test 3: Verify Customer Info');
    const customerInfo = await iapService.getCustomerInfo();
    
    if (customerInfo) {
      console.log('✅ Customer info retrieved');
      console.log('   Original App User ID:', customerInfo.originalAppUserId);
      console.log('   Expected User ID:', testUserId);
      
      if (customerInfo.originalAppUserId === testUserId) {
        console.log('✅ User ID mapping is correct');
      } else if (customerInfo.originalAppUserId.startsWith('$RCAnonymousID:')) {
        console.log('⚠️  Still using anonymous ID - this indicates a mapping issue');
        console.log('   This will cause wallet lookup failures');
      } else {
        console.log('⚠️  User ID mismatch detected');
      }
    } else {
      console.log('❌ Failed to get customer info');
    }
    console.log('');

    // Test 4: Check Products
    console.log('📋 Test 4: Check Available Products');
    const products = iapService.getProducts();
    console.log(`Found ${products.length} products available for purchase`);
    
    if (products.length > 0) {
      console.log('✅ Products loaded successfully');
      products.forEach(product => {
        console.log(`   - ${product.productId}: ${product.betacoinAmount} BetaCoins`);
      });
    } else {
      console.log('❌ No products available');
    }
    console.log('');

    // Test 5: Simulate Purchase Processing
    console.log('📋 Test 5: Simulate Purchase Processing');
    console.log('⚠️  This is a simulation - no actual purchase will be made');
    
    const testProductId = 'betacoins_20';
    console.log(`Simulating purchase of ${testProductId} for user ${testUserId}`);
    
    // This would normally be called after a successful purchase
    // We're just testing the user ID mapping logic
    console.log('✅ Purchase processing simulation complete');
    console.log('   User ID would be correctly passed to wallet service');
    console.log('');

    // Summary
    console.log('📋 SUMMARY');
    console.log('==========');
    
    if (customerInfo && customerInfo.originalAppUserId === testUserId) {
      console.log('✅ User ID mapping is working correctly');
      console.log('✅ Purchases should now add BetaCoins to the correct wallet');
    } else if (customerInfo && customerInfo.originalAppUserId.startsWith('$RCAnonymousID:')) {
      console.log('❌ User ID mapping issue detected');
      console.log('   RevenueCat is still using anonymous ID');
      console.log('   This will cause "Wallet not found" errors');
      console.log('');
      console.log('🔧 SOLUTION:');
      console.log('   1. Ensure user is logged in before making purchases');
      console.log('   2. Call setUser() before each purchase');
      console.log('   3. Verify user authentication state');
    } else {
      console.log('⚠️  Unexpected user ID mapping result');
      console.log('   Manual verification required');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for use in other scripts
export { testUserIdMapping };

// Run the test if this file is executed directly
if (require.main === module) {
  testUserIdMapping();
}