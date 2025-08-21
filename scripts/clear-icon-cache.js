#!/usr/bin/env node

/**
 * Quick Icon Cache Clear Script
 * Focuses specifically on clearing icon-related caches
 */

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

console.log('🎨 Clearing App Icon Cache...');
console.log('==============================');

function safeExec(command, description) {
  try {
    console.log(`  - ${description}...`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.log(`  ⚠️  ${description} failed: ${error.message}`);
    return false;
  }
}

// 1. Verify new icon exists
console.log('🔍 Verifying icon files...');
const iconPath = './assets/images/icon.png';
if (fs.existsSync(iconPath)) {
  const stats = fs.statSync(iconPath);
  console.log(`  ✅ Icon found: ${Math.round(stats.size / 1024)}KB, modified: ${stats.mtime.toLocaleString()}`);
} else {
  console.log('  ❌ Icon not found at ./assets/images/icon.png');
  process.exit(1);
}

// 2. Clear Expo cache (icon-specific)
console.log('📱 Clearing Expo icon cache...');
safeExec('expo start --clear --non-interactive || true', 'Clearing Expo cache');

// 3. Clear Metro cache
console.log('🚇 Clearing Metro cache...');
safeExec('npx react-native start --reset-cache --non-interactive || true', 'Clearing Metro cache');

// 4. Platform-specific icon cache clearing
if (os.platform() === 'darwin') {
  console.log('🍎 Clearing iOS icon cache...');
  
  // Clear iOS build folder (contains cached icons)
  if (fs.existsSync('ios/build')) {
    fs.rmSync('ios/build', { recursive: true, force: true });
    console.log('  ✅ Cleared iOS build folder');
  }
  
  // Clear Xcode DerivedData (contains cached app icons)
  const derivedDataPath = `${os.homedir()}/Library/Developer/Xcode/DerivedData`;
  if (fs.existsSync(derivedDataPath)) {
    safeExec(`rm -rf "${derivedDataPath}"/*`, 'Clearing Xcode DerivedData');
  }
  
  // Reset iOS Simulator (clears installed apps and their icons)
  safeExec('xcrun simctl erase all || true', 'Resetting iOS Simulator');
}

console.log('🤖 Clearing Android icon cache...');

// Clear Android build folders (contain cached icons)
if (fs.existsSync('android/build')) {
  fs.rmSync('android/build', { recursive: true, force: true });
  console.log('  ✅ Cleared Android build folder');
}

if (fs.existsSync('android/app/build')) {
  fs.rmSync('android/app/build', { recursive: true, force: true });
  console.log('  ✅ Cleared Android app build folder');
}

// 5. Clear system temp files that might contain cached icons
console.log('🗂️  Clearing temp icon files...');
const tempDir = os.tmpdir();
try {
  const tempFiles = fs.readdirSync(tempDir);
  tempFiles.forEach(file => {
    if (file.includes('expo') || file.includes('react-native') || file.includes('metro')) {
      try {
        const fullPath = `${tempDir}/${file}`;
        if (fs.statSync(fullPath).isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
          console.log(`  ✅ Removed temp directory: ${file}`);
        }
      } catch (error) {
        // Ignore errors for individual files
      }
    }
  });
} catch (error) {
  console.log('  ⚠️  Could not clean temp files');
}

// 6. Prebuild to regenerate native code with new icon
console.log('🔨 Regenerating native code with new icon...');
safeExec('expo prebuild --clean || true', 'Running expo prebuild');

console.log('');
console.log('✅ Icon cache clearing completed!');
console.log('');
console.log('📋 Important next steps:');
console.log('1. 🗑️  DELETE the app from your device/simulator completely');
console.log('2. 🔄 REINSTALL the app (don\'t just restart it)');
console.log('3. 🚀 For development: expo start --clear');
console.log('4. 🏗️  For production: eas build --platform all --clear-cache');
console.log('');
console.log('💡 Why delete and reinstall?');
console.log('   - iOS caches app icons very aggressively');
console.log('   - Android may cache icons in app data');
console.log('   - Only a fresh install guarantees the new icon appears');
console.log('');
console.log('🎯 Icon should now be updated on next fresh install!');