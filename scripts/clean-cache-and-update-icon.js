#!/usr/bin/env node

/**
 * Clean Cache and Update App Icon Script (Node.js version)
 * This script cleans all caches and ensures the new icon is properly used
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🧹 Starting comprehensive cache cleaning and icon update...');
console.log('============================================================');

// Function to check if command exists
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Function to safely execute commands
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

// Function to safely remove directory
function safeRemoveDir(dirPath, description) {
  try {
    if (fs.existsSync(dirPath)) {
      console.log(`  - ${description}...`);
      fs.rmSync(dirPath, { recursive: true, force: true });
      return true;
    } else {
      console.log(`  - ${description} (not found, skipping)...`);
      return false;
    }
  } catch (error) {
    console.log(`  ⚠️  ${description} failed: ${error.message}`);
    return false;
  }
}

// 1. Clean Expo/React Native caches
console.log('📱 Cleaning Expo and React Native caches...');

if (commandExists('expo')) {
  safeExec('expo start --clear --non-interactive', 'Clearing Expo cache');
} else {
  console.log('  ⚠️  Expo CLI not found, skipping Expo cache clear');
}

// 2. Clean Metro bundler cache
console.log('🚇 Cleaning Metro bundler cache...');
if (commandExists('npx')) {
  // Kill any running Metro processes first
  try {
    if (os.platform() === 'win32') {
      execSync('taskkill /f /im node.exe', { stdio: 'ignore' });
    } else {
      execSync('pkill -f metro', { stdio: 'ignore' });
    }
  } catch (error) {
    // Ignore errors if no processes are running
  }
}

// 3. Clean package manager cache
console.log('📦 Cleaning package manager cache...');

if (commandExists('npm')) {
  safeExec('npm cache clean --force', 'Clearing npm cache');
}

if (commandExists('yarn')) {
  safeExec('yarn cache clean', 'Clearing yarn cache');
}

// 4. Clean node_modules and lock files
console.log('🗂️  Cleaning node_modules and lock files...');

safeRemoveDir('node_modules', 'Removing node_modules directory');
safeRemoveDir('package-lock.json', 'Removing package-lock.json');

if (fs.existsSync('yarn.lock')) {
  console.log('  - Keeping yarn.lock (recommended)');
}

// 5. Clean platform-specific caches
if (os.platform() === 'darwin') {
  console.log('🍎 Cleaning iOS specific caches...');
  
  safeRemoveDir('ios/build', 'Removing iOS build folder');
  
  const derivedDataPath = path.join(os.homedir(), 'Library/Developer/Xcode/DerivedData');
  if (fs.existsSync(derivedDataPath)) {
    safeExec(`rm -rf "${derivedDataPath}"/*`, 'Cleaning Xcode DerivedData');
  }
  
  if (commandExists('xcrun')) {
    safeExec('xcrun simctl erase all', 'Cleaning iOS Simulator cache');
  }
}

console.log('🤖 Cleaning Android specific caches...');

safeRemoveDir('android/build', 'Removing Android build folder');
safeRemoveDir('android/app/build', 'Removing Android app build folder');

const gradleCachePath = path.join(os.homedir(), '.gradle/caches');
safeRemoveDir(gradleCachePath, 'Cleaning Gradle cache');

// 6. Clean system temp files
console.log('🖥️  Cleaning system caches...');

const tempDir = os.tmpdir();
const reactNativeTempPattern = path.join(tempDir, 'react-native-*');
const metroTempPattern = path.join(tempDir, 'metro-*');

try {
  const tempFiles = fs.readdirSync(tempDir);
  tempFiles.forEach(file => {
    if (file.startsWith('react-native-') || file.startsWith('metro-')) {
      const fullPath = path.join(tempDir, file);
      safeRemoveDir(fullPath, `Removing temp file: ${file}`);
    }
  });
} catch (error) {
  console.log('  ⚠️  Could not clean temp files:', error.message);
}

// 7. Verify icon files
console.log('🎨 Verifying app icon files...');

const iconPaths = [
  './assets/images/icon.png',
  './assets/images/icon_splashscreen.png',
  './assets/images/favicon.png'
];

iconPaths.forEach(iconPath => {
  if (fs.existsSync(iconPath)) {
    const stats = fs.statSync(iconPath);
    console.log(`  ✅ Found: ${iconPath} (${Math.round(stats.size / 1024)}KB, modified: ${stats.mtime.toISOString()})`);
  } else {
    console.log(`  ❌ Missing: ${iconPath}`);
  }
});

// 8. Reinstall dependencies
console.log('📥 Reinstalling dependencies...');

if (commandExists('yarn')) {
  safeExec('yarn install', 'Installing with yarn');
} else if (commandExists('npm')) {
  safeExec('npm install', 'Installing with npm');
} else {
  console.log('  ❌ No package manager found!');
  process.exit(1);
}

// 9. Prebuild (if using Expo)
console.log('🔨 Running prebuild to regenerate native code...');

if (commandExists('expo')) {
  safeExec('expo prebuild --clean', 'Running expo prebuild');
} else {
  console.log('  ⚠️  Expo CLI not found, skipping prebuild');
}

// 10. Final instructions
console.log('✅ Cache cleaning completed!');
console.log('');
console.log('📋 Next steps to ensure new icon is used:');
console.log('1. For iOS: Delete app from simulator/device and reinstall');
console.log('2. For Android: Delete app from emulator/device and reinstall');
console.log('3. For development: Run one of the following commands:');
console.log('   expo start --clear');
console.log('   npx react-native start --reset-cache');
console.log('');
console.log('🏗️  To create new builds with updated icon:');
console.log('   eas build --platform all --clear-cache');
console.log('   # or for specific platform:');
console.log('   eas build --platform ios --clear-cache');
console.log('   eas build --platform android --clear-cache');
console.log('');
console.log('🎯 Icon cache clearing tips:');
console.log('- iOS: Icons are cached aggressively. Delete and reinstall the app.');
console.log('- Android: Clear app data or reinstall for immediate icon update.');
console.log('- Simulator/Emulator: Reset device for complete cache clear.');
console.log('');
console.log('🚀 Ready to start development server with clean cache!');

// Optional: Start development server automatically
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Would you like to start the development server now? (y/N): ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    console.log('🚀 Starting development server...');
    if (commandExists('expo')) {
      spawn('expo', ['start', '--clear'], { stdio: 'inherit' });
    } else if (commandExists('npx')) {
      spawn('npx', ['react-native', 'start', '--reset-cache'], { stdio: 'inherit' });
    }
  } else {
    console.log('👍 You can start the server manually when ready.');
  }
  rl.close();
});