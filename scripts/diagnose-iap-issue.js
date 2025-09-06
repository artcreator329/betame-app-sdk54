#!/usr/bin/env node

/**
 * Diagnose IAP "Purchase Not Available" Issue
 * Quick diagnostic to identify the root cause
 */

console.log('🔍 IAP Issue Diagnostic');
console.log('=======================');

console.log('\n📋 Checking Configuration Files...');

// Check if files exist and have correct content
const fs = require('fs');
const path = require('path');

// 1. Check StoreKit configuration
console.log('\n1. StoreKit Configuration:');
try {
  const storeKitPath = 'ios/BetaMe/BetaCoins.storekit';
  if (fs.existsSync(storeKitPath)) {
    const storeKitContent = JSON.parse(fs.readFileSync(storeKitPath, 'utf8'));
    console.log('   ✅ BetaCoins.storekit exists');
    console.log(`   📦 Products found: ${storeKitContent.products.length}`);
    
    storeKitContent.products.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.productID} - RM${product.displayPrice}`);
    });
    
    const teamId = storeKitContent.settings._developerTeamID;
    if (teamId === 'YOUR_TEAM_ID') {
      console.log('   ⚠️  Developer Team ID is placeholder - this may cause issues');
    } else if (teamId === '') {
      console.log('   ✅ Developer Team ID is empty (good for testing)');
    } else {
      console.log(`   ✅ Developer Team ID: ${teamId}`);
    }
  } else {
    console.log('   ❌ BetaCoins.storekit not found');
  }
} catch (error) {
  console.log('   ❌ Error reading StoreKit configuration:', error.message);
}

// 2. Check RevenueCat service
console.log('\n2. RevenueCat Service Configuration:');
try {
  const serviceContent = fs.readFileSync('lib/revenuecat-iap-service.ts', 'utf8');
  
  if (serviceContent.includes('betacoins_new_20')) {
    console.log('   ✅ New product IDs found in service');
  } else if (serviceContent.includes('betacoins_20')) {
    console.log('   ⚠️  Old product IDs still in service');
  }
  
  if (serviceContent.includes('<REDACTED_REVENUECAT_KEY>')) {
    console.log('   ✅ RevenueCat API key configured');
  } else {
    console.log('   ❌ RevenueCat API key not found');
  }
} catch (error) {
  console.log('   ❌ Error reading RevenueCat service:', error.message);
}

// 3. Check BetaCoin Purchase component
console.log('\n3. BetaCoin Purchase Component:');
try {
  const componentContent = fs.readFileSync('components/BetaCoinPurchase.tsx', 'utf8');
  
  if (componentContent.includes('betacoins_new_20')) {
    console.log('   ✅ New product IDs found in component');
  } else if (componentContent.includes('betacoins_20')) {
    console.log('   ⚠️  Old product IDs still in component');
  }
  
  // Count bundles
  const bundleMatches = componentContent.match(/id: '\d+'/g);
  if (bundleMatches) {
    console.log(`   📦 BetaCoin bundles configured: ${bundleMatches.length}`);
  }
} catch (error) {
  console.log('   ❌ Error reading BetaCoin component:', error.message);
}

console.log('\n🎯 Most Likely Causes:');
console.log('   1. StoreKit configuration not properly loaded in Xcode scheme');
console.log('   2. Developer Team ID placeholder causing validation issues');
console.log('   3. Xcode not recognizing the StoreKit configuration file');
console.log('   4. RevenueCat trying to load from App Store Connect (which has no products yet)');

console.log('\n🔧 Immediate Fix Steps:');
console.log('   1. Open Xcode → Product → Scheme → Edit Scheme');
console.log('   2. Run → Options → StoreKit Configuration → Select "BetaCoins.storekit"');
console.log('   3. Clean Build Folder (Cmd+Shift+K)');
console.log('   4. Build and run again');

console.log('\n⚡ Quick Test:');
console.log('   → Run in iOS Simulator (not device)');
console.log('   → StoreKit configuration should work automatically');
console.log('   → If still failing, check Xcode console for StoreKit errors');

console.log('\n📱 Platform Check:');
console.log('   → IAP only works on iOS');
console.log('   → Android uses Curlec payment system');
console.log('   → Make sure you\'re testing on iOS simulator/device');

console.log('\n🚨 If Nothing Works:');
console.log('   → Create new StoreKit configuration file in Xcode');
console.log('   → File → New → File → StoreKit Configuration');
console.log('   → Add the two products manually');
console.log('   → Update scheme to use new configuration');

console.log('\n✅ Success Indicators:');
console.log('   → Purchase modal shows 2 products');
console.log('   → No "Purchase Not Available" error');
console.log('   → Test purchase completes successfully');
console.log('   → BetaCoins added to wallet after purchase');