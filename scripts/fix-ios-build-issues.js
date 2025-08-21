#!/usr/bin/env node

/**
 * Fix iOS Build Issues Script
 * Addresses specific Xcode build problems including DerivedData cache issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔧 Fixing iOS Build Issues...');
console.log('==============================');

function safeExec(command, description, options = {}) {
  try {
    console.log(`  - ${description}...`);
    const result = execSync(command, { 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return { success: true, output: result };
  } catch (error) {
    console.log(`  ⚠️  ${description} failed: ${error.message}`);
    return { success: false, error };
  }
}

// 1. Clean Xcode DerivedData completely
console.log('🍎 Cleaning Xcode DerivedData...');
const derivedDataPath = path.join(os.homedir(), 'Library/Developer/Xcode/DerivedData');
if (fs.existsSync(derivedDataPath)) {
  try {
    execSync(`rm -rf "${derivedDataPath}"/*`, { stdio: 'inherit' });
    console.log('  ✅ Cleared all DerivedData');
  } catch (error) {
    console.log('  ⚠️  Could not clear DerivedData:', error.message);
  }
}

// 2. Clean SDK stat caches specifically
console.log('📊 Cleaning SDK stat caches...');
const sdkStatCachePath = path.join(derivedDataPath, 'SDKStatCaches.noindex');
if (fs.existsSync(sdkStatCachePath)) {
  try {
    execSync(`rm -rf "${sdkStatCachePath}"`, { stdio: 'inherit' });
    console.log('  ✅ Cleared SDK stat caches');
  } catch (error) {
    console.log('  ⚠️  Could not clear SDK stat caches:', error.message);
  }
}

// 3. Clean iOS build folder
console.log('📱 Cleaning iOS build folder...');
if (fs.existsSync('ios/build')) {
  try {
    execSync('rm -rf ios/build', { stdio: 'inherit' });
    console.log('  ✅ Cleared iOS build folder');
  } catch (error) {
    console.log('  ⚠️  Could not clear iOS build folder:', error.message);
  }
}

// 4. Clean Pods
console.log('☕ Cleaning CocoaPods...');
if (fs.existsSync('ios/Pods')) {
  safeExec('rm -rf ios/Pods', 'Removing Pods folder');
}
if (fs.existsSync('ios/Podfile.lock')) {
  safeExec('rm ios/Podfile.lock', 'Removing Podfile.lock');
}

// 5. Clean node_modules
console.log('📦 Cleaning node_modules...');
if (fs.existsSync('node_modules')) {
  safeExec('rm -rf node_modules', 'Removing node_modules');
}

// 6. Reinstall dependencies
console.log('📥 Reinstalling dependencies...');
safeExec('npm install', 'Installing npm dependencies');

// 7. Reinstall Pods
console.log('☕ Reinstalling CocoaPods...');
safeExec('cd ios && pod install --repo-update', 'Installing CocoaPods');

// 8. Check for simulator issues
console.log('📱 Checking iOS Simulator...');
const simulatorResult = safeExec('xcrun simctl list devices', 'Listing simulators', { silent: true });
if (simulatorResult.success) {
  console.log('  ✅ iOS Simulator accessible');
} else {
  console.log('  ⚠️  iOS Simulator may have issues');
}

// 9. Verify Xcode installation
console.log('🔍 Verifying Xcode...');
const xcodeResult = safeExec('xcode-select -p', 'Checking Xcode path', { silent: true });
if (xcodeResult.success) {
  console.log('  ✅ Xcode path:', xcodeResult.output.toString().trim());
} else {
  console.log('  ❌ Xcode not properly configured');
  console.log('  💡 Try: sudo xcode-select --install');
}

// 10. Check for common issues
console.log('🔍 Checking for common issues...');

// Check if using new Expo CLI
const hasLocalExpoCLI = fs.existsSync('node_modules/.bin/expo');
if (hasLocalExpoCLI) {
  console.log('  ✅ Local Expo CLI found');
} else {
  console.log('  ⚠️  Local Expo CLI not found - this may cause issues');
}

// Check app.json configuration
if (fs.existsSync('app.json')) {
  try {
    const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    if (appConfig.expo && appConfig.expo.ios) {
      console.log('  ✅ iOS configuration found in app.json');
    } else {
      console.log('  ⚠️  iOS configuration missing in app.json');
    }
  } catch (error) {
    console.log('  ⚠️  Could not parse app.json');
  }
}

console.log('');
console.log('✅ iOS build issue fixes completed!');
console.log('');
console.log('📋 Next steps:');
console.log('1. 🚀 Try building again with: npx expo run:ios');
console.log('2. 📱 Or start development server: npx expo start');
console.log('3. 🔄 If issues persist, try: npx expo prebuild --clean');
console.log('');
console.log('💡 Common solutions:');
console.log('- Use "npx expo" instead of global "expo" command');
console.log('- Ensure Xcode is updated to latest version');
console.log('- Try building on a different simulator');
console.log('- Check that iOS deployment target matches your setup');
console.log('');
console.log('🆘 If problems continue:');
console.log('1. Open ios/YourApp.xcworkspace in Xcode');
console.log('2. Clean Build Folder (Cmd+Shift+K)');
console.log('3. Build manually in Xcode to see detailed errors');