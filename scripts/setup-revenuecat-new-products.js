#!/usr/bin/env node

/**
 * RevenueCat Dashboard Setup Helper
 * Provides step-by-step instructions for configuring the new IAP products
 */

console.log('🚀 RevenueCat Dashboard Setup Helper');
console.log('====================================');

console.log('\n📋 Step-by-Step RevenueCat Configuration:');

console.log('\n1. 🌐 Access RevenueCat Dashboard');
console.log('   → Open: https://app.revenuecat.com/');
console.log('   → Login to your account');
console.log('   → Select your iOS app project');

console.log('\n2. 📦 Configure Products');
console.log('   → Navigate to "Products" section');
console.log('   → Click "Add Product"');
console.log('   → Add these exact product IDs:');
console.log('');
console.log('   Product 1:');
console.log('   ├── Product ID: betacoins_new_20');
console.log('   ├── Display Name: 20 BetaCoins Pack');
console.log('   ├── Description: Purchase 20 BetaCoins');
console.log('   └── Price: RM4.90');
console.log('');
console.log('   Product 2:');
console.log('   ├── Product ID: betacoins_new_100');
console.log('   ├── Display Name: 100 BetaCoins Pack');
console.log('   ├── Description: Purchase 100 BetaCoins');
console.log('   └── Price: RM19.90');

console.log('\n3. 🎯 Create Offering');
console.log('   → Navigate to "Offerings" section');
console.log('   → Click "Create Offering"');
console.log('   → Offering Details:');
console.log('     ├── Identifier: betacoins_packages');
console.log('     ├── Display Name: BetaCoin Packages');
console.log('     └── Description: Purchase BetaCoins for premium features');
console.log('   → Add both products to the offering');
console.log('   → Set as "Current Offering"');

console.log('\n4. 🔑 Verify API Configuration');
console.log('   → Navigate to "API Keys" section');
console.log('   → Verify iOS API Key is active:');
console.log('     └── <REDACTED_REVENUECAT_KEY>');

console.log('\n5. 🧪 Test Configuration');
console.log('   → Use RevenueCat\'s test mode');
console.log('   → Verify products appear in dashboard');
console.log('   → Test with StoreKit configuration file');

console.log('\n📱 App Store Connect Requirements:');
console.log('   ⚠️  Products must be created in App Store Connect first');
console.log('   ⚠️  Product IDs must match exactly');
console.log('   ⚠️  Products must be approved by Apple');

console.log('\n🔗 Useful Links:');
console.log('   • RevenueCat Dashboard: https://app.revenuecat.com/');
console.log('   • RevenueCat Docs: https://www.revenuecat.com/docs/');
console.log('   • App Store Connect: https://appstoreconnect.apple.com/');

console.log('\n✅ Configuration Checklist:');
console.log('   □ Products created in App Store Connect');
console.log('   □ Products added to RevenueCat dashboard');
console.log('   □ Offering created and set as current');
console.log('   □ API key verified');
console.log('   □ StoreKit configuration updated');
console.log('   □ App code updated with new product IDs');

console.log('\n🎉 Ready to test IAP integration!');
console.log('   Run: node scripts/test-revenuecat-sandbox.js');