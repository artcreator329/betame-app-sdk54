#!/usr/bin/env node

/**
 * IAP Testing Setup Script
 * Helps set up testing environment for RevenueCat IAP while waiting for Apple review
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Setting up IAP Testing Environment...\n');

// Check if StoreKit configuration exists
const storekitConfigPath = path.join(__dirname, '../ios/BetaMe/Configuration.storekit');
if (fs.existsSync(storekitConfigPath)) {
  console.log('✅ StoreKit Configuration file found');
} else {
  console.log('❌ StoreKit Configuration file not found');
  console.log('   Please ensure ios/BetaMe/Configuration.storekit exists');
}

// Check if RevenueCat test config exists
const revenuecatTestPath = path.join(__dirname, '../config/revenuecat-test.ts');
if (fs.existsSync(revenuecatTestPath)) {
  console.log('✅ RevenueCat test configuration found');
} else {
  console.log('❌ RevenueCat test configuration not found');
}

// Check if RevenueCat service exists
const revenuecatServicePath = path.join(__dirname, '../lib/revenuecat-iap-service.ts');
if (fs.existsSync(revenuecatServicePath)) {
  console.log('✅ RevenueCat IAP service found');
} else {
  console.log('❌ RevenueCat IAP service not found');
}

// Check if test component exists
const testComponentPath = path.join(__dirname, '../components/RevenueCatTest.tsx');
if (fs.existsSync(testComponentPath)) {
  console.log('✅ RevenueCat test component found');
} else {
  console.log('❌ RevenueCat test component not found');
}

console.log('\n🚀 Testing Setup Instructions:');
console.log('\n1. **StoreKit Configuration Testing (Recommended)**');
console.log('   - Open: ios/BetaMe.xcworkspace in Xcode');
console.log('   - Go to: Product → Scheme → Edit Scheme');
console.log('   - Select: Run → Options tab');
console.log('   - Set: StoreKit Configuration to "Configuration.storekit"');
console.log('   - Run: Build and run in simulator');

console.log('\n2. **Sandbox Testing**');
console.log('   - Create sandbox testers in App Store Connect');
console.log('   - Sign out of regular Apple ID on device');
console.log('   - Sign in with sandbox test account');
console.log('   - Test purchases (they\'ll be free)');

console.log('\n3. **RevenueCat Test Component**');
console.log('   - Navigate to: app/revenuecat-test.tsx in your app');
console.log('   - Use the test interface to verify functionality');

console.log('\n4. **Monitor RevenueCat Dashboard**');
console.log('   - Visit: https://app.revenuecat.com/');
console.log('   - Check Events tab for purchase events');
console.log('   - Verify customer info updates');

console.log('\n📋 Testing Checklist:');
console.log('   □ Products load correctly');
console.log('   □ Purchase flow works');
console.log('   □ Success handling works');
console.log('   □ Error handling works');
console.log('   □ BetaCoins added to wallet');
console.log('   □ Purchase restoration works');

console.log('\n📚 Documentation:');
console.log('   - IAP_TESTING_GUIDE.md - Complete testing guide');
console.log('   - REVENUECAT_SETUP_GUIDE.md - RevenueCat setup');
console.log('   - components/RevenueCatTest.tsx - Test component');

console.log('\n🎯 Ready to test! Start with StoreKit Configuration testing.');
console.log('   This allows you to test without Apple approval.\n');









