/**
 * Test IAP Environment Detection
 * 
 * This script helps identify which IAP environment you're running in
 * and tests the appropriate product loading strategy
 */

import { Platform } from 'react-native';
import RevenueCatIAPService from '../lib/revenuecat-iap-service';

async function testIAPEnvironment() {
  console.log('🧪 Testing IAP Environment Detection...\n');

  try {
    // Test 1: Platform and Environment Detection
    console.log('📋 Test 1: Environment Detection');
    console.log('Platform:', Platform.OS);
    
    // Detect environment based on available features
    let environment = 'unknown';
    let expectedStrategy = 'unknown';
    
    if (Platform.OS === 'ios') {
      // Try to detect if we're in simulator vs device
      // This is a rough detection - in real app you might use other methods
      environment = 'iOS (Simulator or Device)';
      expectedStrategy = 'RevenueCat Offerings → StoreKit Config → Static Fallback';
    } else {
      environment = 'Non-iOS (Curlec payments)';
      expectedStrategy = 'Curlec payment system';
    }
    
    console.log('Environment:', environment);
    console.log('Expected Strategy:', expectedStrategy);
    console.log('');

    if (Platform.OS !== 'ios') {
      console.log('ℹ️  IAP testing only available on iOS');
      return;
    }

    // Test 2: Initialize RevenueCat
    console.log('📋 Test 2: Initialize RevenueCat Service');
    const iapService = RevenueCatIAPService.getInstance();
    const initialized = await iapService.initialize();
    
    if (!initialized) {
      console.log('❌ RevenueCat initialization failed');
      return;
    }
    console.log('✅ RevenueCat initialized successfully\n');

    // Test 3: Product Loading Strategy Test
    console.log('📋 Test 3: Product Loading Strategy');
    console.log('Testing product loading strategies in order...\n');
    
    // Force refresh to test loading
    await iapService.refreshProducts();
    const products = iapService.getProducts();
    
    console.log(`Found ${products.length} products total`);
    
    if (products.length > 0) {
      console.log('✅ Products loaded successfully');
      
      // Analyze which strategy worked
      let strategy = 'Unknown';
      let hasPackages = 0;
      let hasStoreProducts = 0;
      let hasStaticProducts = 0;
      
      products.forEach(product => {
        if (product.package) hasPackages++;
        if (product.storeProduct) hasStoreProducts++;
        if (!product.package && !product.storeProduct) hasStaticProducts++;
      });
      
      if (hasPackages > 0) {
        strategy = 'RevenueCat Offerings (TestFlight/Production)';
        console.log('🎯 Strategy Used: RevenueCat Offerings');
        console.log('   This means products are approved and available');
        console.log('   Environment: TestFlight or Production');
      } else if (hasStoreProducts > 0) {
        strategy = 'StoreKit Configuration (Simulator)';
        console.log('🎯 Strategy Used: StoreKit Configuration');
        console.log('   This means using .storekit file for testing');
        console.log('   Environment: iOS Simulator');
      } else if (hasStaticProducts > 0) {
        strategy = 'Static Fallback (Testing)';
        console.log('🎯 Strategy Used: Static Fallback');
        console.log('   This means neither RevenueCat nor StoreKit worked');
        console.log('   Environment: Testing/Development');
      }
      
      console.log('');
      console.log('📊 Product Analysis:');
      console.log(`   RevenueCat Packages: ${hasPackages}`);
      console.log(`   StoreKit Products: ${hasStoreProducts}`);
      console.log(`   Static Products: ${hasStaticProducts}`);
      console.log('');
      
      // Show product details
      console.log('📋 Available Products:');
      products.forEach(product => {
        const source = product.package ? 'RevenueCat' : 
                      product.storeProduct ? 'StoreKit' : 'Static';
        console.log(`   - ${product.productId}: ${product.betacoinAmount} BetaCoins - ${product.price} (${source})`);
      });
      
    } else {
      console.log('❌ No products loaded');
      console.log('   All strategies failed - check configuration');
    }
    console.log('');

    // Test 4: Purchase Capability Test
    console.log('📋 Test 4: Purchase Capability Analysis');
    
    if (products.length > 0) {
      const testProduct = products[0];
      
      if (testProduct.package) {
        console.log('✅ Can use RevenueCat package purchases');
        console.log('   Best for: TestFlight and Production');
        console.log('   Payment: Real App Store transactions');
      } else if (testProduct.storeProduct) {
        console.log('✅ Can use direct StoreKit purchases');
        console.log('   Best for: Simulator testing');
        console.log('   Payment: StoreKit test transactions');
      } else {
        console.log('⚠️  Using static products - purchases may not work');
        console.log('   This is for display testing only');
      }
    } else {
      console.log('❌ No purchase capability available');
    }
    console.log('');

    // Test 5: Environment Recommendations
    console.log('📋 Test 5: Environment Recommendations');
    
    if (hasPackages > 0) {
      console.log('🎉 PRODUCTION READY!');
      console.log('✅ RevenueCat offerings working');
      console.log('✅ Products approved by Apple');
      console.log('✅ Ready for TestFlight and App Store');
      console.log('');
      console.log('Next Steps:');
      console.log('1. Test purchases in TestFlight');
      console.log('2. Monitor RevenueCat analytics');
      console.log('3. Deploy to App Store');
    } else if (hasStoreProducts > 0) {
      console.log('🧪 SIMULATOR TESTING MODE');
      console.log('✅ StoreKit configuration working');
      console.log('✅ Good for development and testing');
      console.log('⚠️  Won\'t work on TestFlight or real devices');
      console.log('');
      console.log('Next Steps:');
      console.log('1. Submit products to Apple for review');
      console.log('2. Wait for Apple approval');
      console.log('3. Test with TestFlight once approved');
    } else {
      console.log('🔧 DEVELOPMENT MODE');
      console.log('⚠️  Using fallback products');
      console.log('⚠️  Purchases won\'t work');
      console.log('');
      console.log('Next Steps:');
      console.log('1. Fix StoreKit configuration');
      console.log('2. Submit products to Apple');
      console.log('3. Test in appropriate environment');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for use in other scripts
export { testIAPEnvironment };

// Run the test if this file is executed directly
if (require.main === module) {
  testIAPEnvironment();
}