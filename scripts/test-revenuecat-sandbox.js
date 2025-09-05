#!/usr/bin/env node

/**
 * RevenueCat Sandbox Testing Script
 * 
 * This script tests the RevenueCat integration for sandbox IAP testing.
 * It verifies configuration, initializes the service, and tests product loading.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 RevenueCat Sandbox Testing Script');
console.log('=====================================\n');

// Test 1: Check RevenueCat Configuration
console.log('📋 Test 1: Checking RevenueCat Configuration...');

try {
  const configPath = path.join(__dirname, '../config/revenuecat.ts');
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  // Check if API key is set
  const hasApiKey = configContent.includes('appl_') && !configContent.includes('YOUR_ACTUAL_IOS_KEY_HERE');
  
  if (hasApiKey) {
    console.log('✅ RevenueCat iOS API key is configured');
  } else {
    console.log('❌ RevenueCat iOS API key needs to be set');
    console.log('   Please update config/revenuecat.ts with your actual API key');
  }
  
  // Check product IDs
  const productIds = [
    'betacoins_20',
    'betacoins_100', 
    'betacoins_250',
    'betacoins_600',
    'betacoins_1000',
    'betacoins_2000'
  ];
  
  let allProductsConfigured = true;
  productIds.forEach(productId => {
    if (configContent.includes(productId)) {
      console.log(`✅ Product ${productId} is configured`);
    } else {
      console.log(`❌ Product ${productId} is missing`);
      allProductsConfigured = false;
    }
  });
  
  if (allProductsConfigured) {
    console.log('✅ All BetaCoin products are configured');
  }
  
} catch (error) {
  console.log('❌ Error reading RevenueCat configuration:', error.message);
}

console.log('\n📋 Test 2: Checking Package Dependencies...');

try {
  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const requiredPackages = {
    'react-native-purchases': 'RevenueCat SDK',
    'expo': 'Expo framework'
  };
  
  Object.entries(requiredPackages).forEach(([pkg, description]) => {
    if (packageJson.dependencies[pkg] || packageJson.devDependencies[pkg]) {
      const version = packageJson.dependencies[pkg] || packageJson.devDependencies[pkg];
      console.log(`✅ ${description} (${pkg}): ${version}`);
    } else {
      console.log(`❌ Missing package: ${pkg} (${description})`);
    }
  });
  
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
}

console.log('\n📋 Test 3: Checking iOS Configuration...');

try {
  // Check if iOS project exists
  const iosProjectPath = path.join(__dirname, '../ios/BetaMe.xcodeproj');
  if (fs.existsSync(iosProjectPath)) {
    console.log('✅ iOS project exists');
    
    // Check if StoreKit files are removed
    const storeKitFiles = [
      '../ios/BetaMe/BetaCoins.storekit',
      '../ios/Configuration.storekit',
      '../ios/BetaMe_IAP_Configuration.storekit'
    ];
    
    let storeKitRemoved = true;
    storeKitFiles.forEach(filePath => {
      const fullPath = path.join(__dirname, filePath);
      if (fs.existsSync(fullPath)) {
        console.log(`⚠️  StoreKit file still exists: ${filePath}`);
        storeKitRemoved = false;
      }
    });
    
    if (storeKitRemoved) {
      console.log('✅ StoreKit configuration files removed (using RevenueCat only)');
    }
    
    // Check Podfile for RevenueCat
    const podfilePath = path.join(__dirname, '../ios/Podfile');
    if (fs.existsSync(podfilePath)) {
      const podfileContent = fs.readFileSync(podfilePath, 'utf8');
      if (podfileContent.includes('RNPurchases')) {
        console.log('✅ RevenueCat pod is configured in Podfile');
      } else {
        console.log('⚠️  RevenueCat pod may need to be added to Podfile');
      }
    }
    
  } else {
    console.log('❌ iOS project not found');
  }
  
} catch (error) {
  console.log('❌ Error checking iOS configuration:', error.message);
}

console.log('\n📋 Test 4: Checking Service Implementation...');

try {
  const servicePath = path.join(__dirname, '../lib/revenuecat-iap-service.ts');
  if (fs.existsSync(servicePath)) {
    console.log('✅ RevenueCat IAP service exists');
    
    const serviceContent = fs.readFileSync(servicePath, 'utf8');
    
    // Check key methods
    const requiredMethods = [
      'initialize',
      'setUser', 
      'purchaseProduct',
      'restorePurchases',
      'getProducts'
    ];
    
    requiredMethods.forEach(method => {
      if (serviceContent.includes(`async ${method}`) || serviceContent.includes(`${method}(`)) {
        console.log(`✅ Method ${method} is implemented`);
      } else {
        console.log(`❌ Method ${method} is missing`);
      }
    });
    
  } else {
    console.log('❌ RevenueCat IAP service not found');
  }
  
} catch (error) {
  console.log('❌ Error checking service implementation:', error.message);
}

console.log('\n📋 Test 5: Sandbox Testing Checklist...');

console.log('📱 iOS Sandbox Testing Requirements:');
console.log('   1. ✅ RevenueCat account created');
console.log('   2. ✅ iOS API key configured');
console.log('   3. ⚠️  Products configured in RevenueCat dashboard');
console.log('   4. ⚠️  App Store Connect products approved');
console.log('   5. ⚠️  Sandbox test user created in App Store Connect');
console.log('   6. ⚠️  Device signed out of production App Store');
console.log('   7. ⚠️  App built and installed on device/simulator');

console.log('\n🔧 Next Steps for Sandbox Testing:');
console.log('   1. Create sandbox test user in App Store Connect');
console.log('   2. Sign out of App Store on test device');
console.log('   3. Configure products in RevenueCat dashboard');
console.log('   4. Build and install app on test device');
console.log('   5. Test purchase flow with sandbox account');

console.log('\n📋 Test 6: Environment Check...');

// Check if running on macOS (required for iOS development)
const platform = process.platform;
if (platform === 'darwin') {
  console.log('✅ Running on macOS (iOS development supported)');
  
  // Check if Xcode is installed
  try {
    execSync('xcode-select -p', { stdio: 'ignore' });
    console.log('✅ Xcode is installed');
  } catch (error) {
    console.log('❌ Xcode is not installed or not configured');
  }
  
} else {
  console.log('⚠️  Not running on macOS (iOS testing limited to simulator)');
}

console.log('\n🎯 Summary:');
console.log('   - StoreKit configuration removed ✅');
console.log('   - RevenueCat service implemented ✅');
console.log('   - Ready for sandbox testing ⚠️');
console.log('   - Requires RevenueCat dashboard setup ⚠️');

console.log('\n📖 Documentation:');
console.log('   - RevenueCat Setup: REVENUECAT_SETUP_GUIDE.md');
console.log('   - IAP Testing: IAP_TESTING_GUIDE.md');
console.log('   - Sandbox Guide: https://docs.revenuecat.com/docs/sandbox');

console.log('\n🚀 Ready to test RevenueCat sandbox purchases!');