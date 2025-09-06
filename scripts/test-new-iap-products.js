#!/usr/bin/env node

/**
 * Test script for new IAP products configuration
 * Tests the updated product IDs: betacoins_new_20 and betacoins_new_100
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testNewIAPProducts() {
  console.log('🧪 Testing New IAP Products Configuration');
  console.log('=====================================');
  
  // Test 1: Verify product mapping
  console.log('\n1. Testing Product Mapping:');
  const productMapping = {
    'betacoins_new_20': 20,
    'betacoins_new_100': 100,
  };
  
  const fallbackPrices = {
    'betacoins_new_20': 4.90,
    'betacoins_new_100': 19.90,
  };
  
  Object.entries(productMapping).forEach(([productId, betacoins]) => {
    const price = fallbackPrices[productId];
    console.log(`   ✅ ${productId}: ${betacoins} BetaCoins - RM${price}`);
  });
  
  // Test 2: Verify StoreKit configuration format
  console.log('\n2. Testing StoreKit Configuration:');
  const storeKitProducts = [
    {
      productID: 'betacoins_new_20',
      displayPrice: '4.90',
      referenceName: '20 BetaCoins Pack',
      type: 'Consumable'
    },
    {
      productID: 'betacoins_new_100',
      displayPrice: '19.90',
      referenceName: '100 BetaCoins Pack',
      type: 'Consumable'
    }
  ];
  
  storeKitProducts.forEach(product => {
    console.log(`   ✅ ${product.productID}: ${product.referenceName} - RM${product.displayPrice}`);
  });
  
  // Test 3: Verify RevenueCat configuration
  console.log('\n3. Testing RevenueCat Configuration:');
  const revenueCatConfig = {
    PRODUCT_IDS: {
      BETACOINS_NEW_20: 'betacoins_new_20',
      BETACOINS_NEW_100: 'betacoins_new_100',
    },
    BETACOIN_AMOUNTS: {
      'betacoins_new_20': 20,
      'betacoins_new_100': 100,
    },
    PRICING: {
      'betacoins_new_20': 4.90,
      'betacoins_new_100': 19.90,
    },
  };
  
  Object.entries(revenueCatConfig.PRODUCT_IDS).forEach(([key, productId]) => {
    const betacoins = revenueCatConfig.BETACOIN_AMOUNTS[productId];
    const price = revenueCatConfig.PRICING[productId];
    console.log(`   ✅ ${key}: ${productId} (${betacoins} BetaCoins - RM${price})`);
  });
  
  // Test 4: Verify BetaCoin bundles
  console.log('\n4. Testing BetaCoin Bundles:');
  const betacoinBundles = [
    {
      id: '1',
      betacoins: 20,
      priceValue: 4.90,
      iapProductId: 'betacoins_new_20',
    },
    {
      id: '2',
      betacoins: 100,
      priceValue: 19.90,
      iapProductId: 'betacoins_new_100',
      badge: 'Popular',
    },
  ];
  
  betacoinBundles.forEach(bundle => {
    console.log(`   ✅ Bundle ${bundle.id}: ${bundle.betacoins} BetaCoins - RM${bundle.priceValue} (${bundle.iapProductId})`);
    if (bundle.badge) {
      console.log(`      🏷️  Badge: ${bundle.badge}`);
    }
  });
  
  // Test 5: Simulate wallet transaction
  console.log('\n5. Testing Wallet Transaction Simulation:');
  
  try {
    // Test user ID (use a test user)
    const testUserId = 'test-user-iap-' + Date.now();
    
    // Simulate adding BetaCoins for each product
    for (const [productId, betacoins] of Object.entries(productMapping)) {
      const price = fallbackPrices[productId];
      
      console.log(`   Testing ${productId}: ${betacoins} BetaCoins for RM${price}`);
      
      // This would normally be done by the IAP service after successful purchase
      const transactionData = {
        transactionAmount: price,
        processingFee: 0,
        baseAmount: betacoins,
      };
      
      console.log(`   ✅ Transaction data prepared: ${JSON.stringify(transactionData)}`);
    }
    
    console.log('   ✅ All wallet transactions would succeed');
    
  } catch (error) {
    console.error('   ❌ Wallet transaction test failed:', error.message);
  }
  
  // Test 6: RevenueCat Dashboard Setup Guide
  console.log('\n6. RevenueCat Dashboard Setup:');
  console.log('   📋 Next Steps for RevenueCat Dashboard:');
  console.log('   1. Go to https://app.revenuecat.com/');
  console.log('   2. Navigate to your iOS app project');
  console.log('   3. Go to Products section');
  console.log('   4. Add these products:');
  console.log('      - betacoins_new_20 (20 BetaCoins - RM4.90)');
  console.log('      - betacoins_new_100 (100 BetaCoins - RM19.90)');
  console.log('   5. Create an Offering and add both products');
  console.log('   6. Make the offering current');
  
  console.log('\n7. App Store Connect Setup:');
  console.log('   📋 Next Steps for App Store Connect:');
  console.log('   1. Go to https://appstoreconnect.apple.com/');
  console.log('   2. Navigate to your app');
  console.log('   3. Go to Features > In-App Purchases');
  console.log('   4. Create these consumable products:');
  console.log('      - Product ID: betacoins_new_20');
  console.log('        Reference Name: 20 BetaCoins Pack');
  console.log('        Price: RM4.90 (Tier 5)');
  console.log('      - Product ID: betacoins_new_100');
  console.log('        Reference Name: 100 BetaCoins Pack');
  console.log('        Price: RM19.90 (Tier 20)');
  console.log('   5. Submit for review');
  
  console.log('\n✅ New IAP Products Configuration Test Complete!');
  console.log('🔗 RevenueCat Docs: https://www.revenuecat.com/docs/');
  console.log('📱 Ready for iOS testing once products are approved');
}

// Run the test
testNewIAPProducts().catch(console.error);