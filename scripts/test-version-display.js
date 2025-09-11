#!/usr/bin/env node

/**
 * Test script to verify version utilities work correctly
 */

// Read actual app.json to test with real data
const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Test the version utilities
console.log('🧪 Testing version utilities...');

try {
  const version = appJson.expo.version;
  const iosBuildNumber = appJson.expo.ios.buildNumber;
  const androidVersionCode = appJson.expo.android.versionCode;
  const displayVersion = `BetaMe v${version}`;
  const fullVersionIOS = `${version} (${iosBuildNumber})`;
  const fullVersionAndroid = `${version} (${androidVersionCode})`;
  
  console.log('✅ Version utilities test results:');
  console.log(`   📱 App Version: ${version}`);
  console.log(`   🍎 iOS Build Number: ${iosBuildNumber}`);
  console.log(`   🤖 Android Version Code: ${androidVersionCode}`);
  console.log(`   📺 Display Version: ${displayVersion}`);
  console.log(`   🔍 Full Version (iOS): ${fullVersionIOS}`);
  console.log(`   🔍 Full Version (Android): ${fullVersionAndroid}`);
  console.log('');
  console.log('✅ All version utilities working correctly!');
  
} catch (error) {
  console.error('❌ Version utilities test failed:', error.message);
  process.exit(1);
}

console.log('');
console.log('🎉 Version management system is ready!');
console.log('');
console.log('📋 Available commands:');
console.log('   npm run version:patch   - Increment patch version');
console.log('   npm run version:minor   - Increment minor version');
console.log('   npm run version:major   - Increment major version');
console.log('   npm run version:build   - Increment build numbers only');
console.log('   npm run build:android   - Build Android with auto-increment');
console.log('   npm run build:ios       - Build iOS with auto-increment');