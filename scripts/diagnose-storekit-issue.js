/**
 * Diagnose StoreKit Configuration Issues
 * 
 * This script helps identify exactly what's wrong with the StoreKit setup
 */

import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { getRevenueCatApiKey } from '../config/revenuecat';

async function diagnoseStoreKitIssue() {
  console.log('🔍 Diagnosing StoreKit Configuration Issues...\n');

  // Test 1: Platform Check
  console.log('📋 Test 1: Platform Check');
  console.log('Platform:', Platform.OS);
  if (Platform.OS !== 'ios') {
    console.log('❌ Not running on iOS - StoreKit only works on iOS');
    return;
  }
  console.log('✅ Running on iOS\n');

  // Test 2: RevenueCat API Key
  console.log('📋 Test 2: RevenueCat API Key');
  try {
    const apiKey: <REDACTED>();
    if (apiKey) {
      console.log('✅ RevenueCat API key found');
      console.log('Key starts with:', apiKey.substring(0, 10) + '...');
    } else {
      console.log('❌ RevenueCat API key not found');
      return;
    }
  } catch (error) {
    console.log('❌ Error getting RevenueCat API key:', error.message);
    return;
  }
  console.log('');

  // Test 3: RevenueCat Configuration
  console.log('📋 Test 3: RevenueCat Configuration');
  try {
    await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    
    Purchases.configure({
      apiKey: <REDACTED>(),
      appUserID: null,
    });
    
    console.log('✅ RevenueCat configured successfully');
  } catch (error) {
    console.log('❌ RevenueCat configuration failed:', error.message);
    return;
  }
  console.log('');

  // Test 4: Product IDs Definition
  console.log('📋 Test 4: Product IDs Definition');
  const productIds = [
    'betacoins_20',
    'betacoins_100', 
    'betacoins_250',
    'betacoins_600',
    'betacoins_1000',
    'betacoins_2000',
  ];
  
  console.log('✅ Product IDs defined:');
  productIds.forEach(id => console.log(`   - ${id}`));
  console.log('');

  // Test 5: Direct StoreKit Product Loading
  console.log('📋 Test 5: Direct StoreKit Product Loading');
  try {
    console.log('Attempting to load products from StoreKit...');
    const products = await Purchases.getProducts(productIds);
    
    if (products && products.length > 0) {
      console.log(`✅ Found ${products.length} products from StoreKit!`);
      products.forEach(product => {
        console.log(`   📦 ${product.identifier}: ${product.title} - ${product.priceString}`);
      });
    } else {
      console.log('❌ No products found from StoreKit');
      console.log('   This indicates a StoreKit configuration issue:');
      console.log('   1. StoreKit file not properly linked in Xcode');
      console.log('   2. StoreKit testing not enabled in scheme');
      console.log('   3. Product IDs don\'t match StoreKit configuration');
      console.log('   4. Bundle ID doesn\'t match StoreKit configuration');
    }
  } catch (error) {
    console.log('❌ Error loading products from StoreKit:', error.message);
    console.log('   Common causes:');
    console.log('   - StoreKit configuration file not found');
    console.log('   - Scheme not configured for StoreKit testing');
    console.log('   - Invalid product IDs in StoreKit file');
  }
  console.log('');

  // Test 6: RevenueCat Offerings (Expected to Fail)
  console.log('📋 Test 6: RevenueCat Offerings (Expected to Fail)');
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current) {
      console.log('✅ RevenueCat offerings found (unexpected but good!)');
      console.log('Available packages:', offerings.current.availablePackages.length);
    } else {
      console.log('❌ No RevenueCat offerings (expected for unapproved products)');
      console.log('   This is normal when products are WAITING_FOR_REVIEW');
    }
  } catch (error) {
    console.log('❌ RevenueCat offerings error (expected):', error.message);
    console.log('   This confirms products are not approved by Apple yet');
  }
  console.log('');

  // Test 7: Customer Info
  console.log('📋 Test 7: Customer Info');
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    console.log('✅ Customer info retrieved');
    console.log('Original App User ID:', customerInfo.originalAppUserId);
    console.log('Active Entitlements:', Object.keys(customerInfo.entitlements.active).length);
  } catch (error) {
    console.log('❌ Error getting customer info:', error.message);
  }
  console.log('');

  // Test 8: Simulate Purchase Attempt
  console.log('📋 Test 8: Simulate Purchase Attempt');
  console.log('⚠️ This will attempt to trigger a purchase dialog');
  console.log('   Cancel the dialog if it appears to avoid charges');
  
  try {
    // Try to purchase the first product
    const testProductId = 'betacoins_20';
    console.log(`Attempting to purchase ${testProductId}...`);
    
    // This should trigger the purchase flow
    const result = await Purchases.purchaseProduct(testProductId);
    console.log('✅ Purchase initiated successfully');
    console.log('Product Identifier:', result.productIdentifier);
  } catch (error) {
    console.log('❌ Purchase failed:', error.message);
    
    if (error.message.includes('Couldn\'t find product')) {
      console.log('   🔧 DIAGNOSIS: StoreKit Configuration Issue');
      console.log('   SOLUTION: Follow Xcode StoreKit Setup Guide');
    } else if (error.message.includes('cancelled')) {
      console.log('   ✅ Purchase was cancelled (this is actually good!)');
      console.log('   This means StoreKit is working and found the product');
    } else {
      console.log('   🔧 DIAGNOSIS: Other purchase error');
      console.log('   Check error details above');
    }
  }
  console.log('');

  // Summary and Recommendations
  console.log('📋 DIAGNOSIS SUMMARY');
  console.log('===================');
  console.log('');
  console.log('If you see "No products found from StoreKit":');
  console.log('1. 🔧 Open Xcode and check StoreKit file is linked');
  console.log('2. 🔧 Verify scheme has StoreKit Configuration enabled');
  console.log('3. 🔧 Check product IDs match exactly');
  console.log('4. 🔧 Ensure bundle ID matches StoreKit config');
  console.log('');
  console.log('If you see "Couldn\'t find product" on purchase:');
  console.log('1. 🔧 Same as above - StoreKit configuration issue');
  console.log('2. 🔧 Try cleaning and rebuilding Xcode project');
  console.log('3. 🔧 Restart iOS Simulator');
  console.log('');
  console.log('If purchase is cancelled:');
  console.log('✅ StoreKit is working correctly!');
  console.log('✅ Products are loaded and purchasable');
  console.log('');
  console.log('Next steps:');
  console.log('📖 Read: XCODE_STOREKIT_SETUP_GUIDE.md');
  console.log('🔧 Fix: Xcode StoreKit configuration');
  console.log('🧪 Test: Run this script again after fixes');
}

// Export for use in other scripts
export { diagnoseStoreKitIssue };

// Run the diagnosis if this file is executed directly
if (require.main === module) {
  diagnoseStoreKitIssue().catch(console.error);
}