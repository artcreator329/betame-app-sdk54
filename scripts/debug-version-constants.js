#!/usr/bin/env node

/**
 * Debug script to check what version constants are being read
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging version constants...');
console.log('');

// Read app.json directly
const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

console.log('📄 app.json values:');
console.log(`   Version: ${appJson.expo.version}`);
console.log(`   iOS Build: ${appJson.expo.ios.buildNumber}`);
console.log(`   Android Version Code: ${appJson.expo.android.versionCode}`);
console.log('');

// Read package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log('📦 package.json values:');
console.log(`   Version: ${packageJson.version}`);
console.log('');

// Check if there are any other config files that might override
const expoJsonPath = path.join(__dirname, '..', 'expo.json');
if (fs.existsSync(expoJsonPath)) {
  const expoJson = JSON.parse(fs.readFileSync(expoJsonPath, 'utf8'));
  console.log('⚠️  expo.json found (might override app.json):');
  console.log(`   Version: ${expoJson.expo?.version || 'not set'}`);
  console.log('');
}

console.log('💡 If the app is showing a different version:');
console.log('   1. Restart the Expo development server');
console.log('   2. Clear the cache: expo start --clear');
console.log('   3. Reload the app completely');
console.log('');
console.log('🔄 Expected display version: BetaMe v' + appJson.expo.version);