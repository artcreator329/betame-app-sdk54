/**
 * Test StoreKit Configuration
 * 
 * This script helps verify that StoreKit configuration is properly set up
 * Run this in the iOS simulator to test IAP functionality
 */

import RevenueCatIAPService from '../lib/revenuecat-iap-service';

async function testStoreKitConfiguration() {
  console.log('🧪 Testing StoreKit Configuration...\n');

  try {
    // Test 1: Initialize RevenueCat service
    console.log('📋 Test 1: Initialize RevenueCat IAP Service');
    const iapService = RevenueCatIAPService.getInstance();
    
    const initialized = await iapService.initialize();
    if (initialized) {
      console.log('✅ RevenueCat IAP service initialized successfully');
    } else {
      console.log('❌ RevenueCat IAP service failed to initialize');
      return;
    }

    // Test 2: Check available products
    console.log('\n📋 Test 2: Check Available Products');
    const products = iapService.getProducts();
    console.log(`Found ${products.length} products:`);
    
    products.forEach(product => {
      console.log(`  - ${product.productId}: ${product.betacoinAmount} BetaCoins - ${product.price}`);
      console.log(`    Title: ${product.title}`);
      console.log(`    Has StoreProduct: ${!!product.storeProduct}`);
      console.log(`    Has Package: ${!!product.package}`);
    });

    if (products.length === 0) {
      console.log('❌ No products found. Check StoreKit configuration.');
      console.log('   Make sure BetaCoins.storekit is properly linked in Xcode');
      return;
    }

    // Test 3: Check IAP availability
    console.log('\n📋 Test 3: Check IAP Availability');
    const availability = await iapService.isIAPAvailable();
    console.log('IAP Available:', availability.available);
    if (!availability.available) {
      console.log('Reason:', availability.reason);
    }

    const status = await iapService.getIAPStatus();
    console.log('IAP Status:', status.message);
    console.log('Can Purchase:', status.canPurchase);

    // Test 4: Test product purchase (simulation)
    console.log('\n📋 Test 4: Simulate Product Purchase');
    const testProductId = 'betacoins_20';
    const testUserId = '20936ff2-2654-4dd5-9b36-1b69df15d6e0';
    
    console.log(`Attempting to purchase ${testProductId} for user ${testUserId}...`);
    console.log('Note: This will trigger the actual purchase flow in simulator');
    
    // Uncomment the line below to test actual purchase
    // const result = await iapService.purchaseProduct(testProductId, testUserId);
    // console.log('Purchase result:', result);
    
    console.log('⚠️ Actual purchase test skipped. Uncomment to test real purchase flow.');

    // Test 5: Check customer info
    console.log('\n📋 Test 5: Check Customer Info');
    try {
      const customerInfo = await iapService.getCustomerInfo();
      if (customerInfo) {
        console.log('✅ Customer info retrieved');
        console.log('Original App User ID:', customerInfo.originalAppUserId);
        console.log('Active Entitlements:', Object.keys(customerInfo.entitlements.active));
        console.log('First Seen:', customerInfo.firstSeen);
      } else {
        console.log('❌ No customer info available');
      }
    } catch (error) {
      console.log('❌ Error getting customer info:', error.message);
    }

    console.log('\n🎉 StoreKit Configuration Test Complete!');
    console.log('\n📝 Next Steps:');
    console.log('1. If products are found, StoreKit configuration is working');
    console.log('2. Test actual purchases in iOS Simulator');
    console.log('3. Check that purchases trigger wallet updates');
    console.log('4. Verify error handling for failed purchases');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure you\'re running on iOS Simulator');
    console.log('2. Check that BetaCoins.storekit is linked in Xcode project');
    console.log('3. Verify RevenueCat API key is configured');
    console.log('4. Ensure StoreKit testing is enabled in Xcode scheme');
  }
}

// Export for use in other scripts
export { testStoreKitConfiguration };

// Run the test if this file is executed directly
if (require.main === module) {
  testStoreKitConfiguration();
}