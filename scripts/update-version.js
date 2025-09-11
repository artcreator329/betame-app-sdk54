#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script to automatically update version numbers for iOS and Android builds
 * This should be run before each build to ensure version numbers are incremented
 */

const APP_JSON_PATH = path.join(__dirname, '..', 'app.json');
const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');

function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    process.exit(1);
  }
}

function writeJsonFile(filePath, data) {
  try {
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    process.exit(1);
  }
}

function incrementVersion(version, type = 'patch') {
  const parts = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'patch':
    default:
      parts[2]++;
      break;
  }
  
  return parts.join('.');
}

function main() {
  const args = process.argv.slice(2);
  const platform = args[0]; // 'ios', 'android', or 'both'
  const versionType = args[1] || 'patch'; // 'major', 'minor', 'patch'
  const incrementAppVersion = args.includes('--increment-version');

  if (!platform || !['ios', 'android', 'both'].includes(platform)) {
    console.log('Usage: node scripts/update-version.js <ios|android|both> [major|minor|patch] [--increment-version]');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/update-version.js ios           # Increment iOS build number only');
    console.log('  node scripts/update-version.js android       # Increment Android version code only');
    console.log('  node scripts/update-version.js both          # Increment both iOS and Android build numbers');
    console.log('  node scripts/update-version.js both minor --increment-version  # Increment app version (minor) and both build numbers');
    process.exit(1);
  }

  console.log('🔄 Updating version numbers...');

  // Read current configuration
  const appJson = readJsonFile(APP_JSON_PATH);
  const packageJson = readJsonFile(PACKAGE_JSON_PATH);

  const currentVersion = appJson.expo.version;
  let newVersion = currentVersion;

  // Increment app version if requested
  if (incrementAppVersion) {
    newVersion = incrementVersion(currentVersion, versionType);
    appJson.expo.version = newVersion;
    packageJson.version = newVersion;
    console.log(`📱 App version: ${currentVersion} → ${newVersion}`);
  }

  // Increment iOS build number
  if (platform === 'ios' || platform === 'both') {
    const currentBuildNumber = parseInt(appJson.expo.ios.buildNumber);
    const newBuildNumber = currentBuildNumber + 1;
    appJson.expo.ios.buildNumber = newBuildNumber.toString();
    console.log(`🍎 iOS build number: ${currentBuildNumber} → ${newBuildNumber}`);
  }

  // Increment Android version code
  if (platform === 'android' || platform === 'both') {
    const currentVersionCode = appJson.expo.android.versionCode;
    const newVersionCode = currentVersionCode + 1;
    appJson.expo.android.versionCode = newVersionCode;
    console.log(`🤖 Android version code: ${currentVersionCode} → ${newVersionCode}`);
  }

  // Write updated files
  writeJsonFile(APP_JSON_PATH, appJson);
  
  if (incrementAppVersion) {
    writeJsonFile(PACKAGE_JSON_PATH, packageJson);
  }

  console.log('');
  console.log('✅ Version update complete!');
  console.log(`📱 App Version: ${newVersion}`);
  console.log(`🍎 iOS Build: ${appJson.expo.ios.buildNumber}`);
  console.log(`🤖 Android Version Code: ${appJson.expo.android.versionCode}`);
}

if (require.main === module) {
  main();
}

module.exports = { incrementVersion };