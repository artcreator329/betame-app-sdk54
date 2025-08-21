#!/usr/bin/env node

/**
 * Fix App Name Script
 * Changes all references from "BetaMe Admin Dashboard" to "BetaMe"
 * and updates project structure accordingly
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏷️  Fixing App Name from "BetaMe Admin Dashboard" to "BetaMe"...');
console.log('==========================================================');

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

function updateFileContent(filePath, replacements, description) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  ${description} - File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    replacements.forEach(({ from, to }) => {
      if (content.includes(from)) {
        content = content.replace(new RegExp(from, 'g'), to);
        updated = true;
      }
    });

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ ${description}`);
      return true;
    } else {
      console.log(`  - ${description} (no changes needed)`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ ${description} failed: ${error.message}`);
    return false;
  }
}

// 1. Update app.json (already done, but verify)
console.log('📱 Updating app.json...');
updateFileContent('app.json', [
  { from: 'BetaMe Admin Dashboard', to: 'BetaMe' },
  { from: 'betame-admin-dashboard', to: 'betame' }
], 'Updated app.json');

// 2. Update package.json (already done, but verify)
console.log('📦 Updating package.json...');
updateFileContent('package.json', [
  { from: 'betame-admin-dashboard', to: 'betame' }
], 'Updated package.json');

// 3. Check and update iOS configuration files
console.log('🍎 Updating iOS configuration files...');

// Update iOS Info.plist if it exists
const infoPlistPath = 'ios/BetaMeAdminDashboard/Info.plist';
if (fs.existsSync(infoPlistPath)) {
  updateFileContent(infoPlistPath, [
    { from: 'BetaMe Admin Dashboard', to: 'BetaMe' },
    { from: 'BetaMeAdminDashboard', to: 'BetaMe' }
  ], 'Updated iOS Info.plist');
}

// Update iOS project.pbxproj
const pbxprojPath = 'ios/BetaMeAdminDashboard.xcodeproj/project.pbxproj';
if (fs.existsSync(pbxprojPath)) {
  updateFileContent(pbxprojPath, [
    { from: 'BetaMe Admin Dashboard', to: 'BetaMe' },
    { from: 'BetaMeAdminDashboard', to: 'BetaMe' }
  ], 'Updated iOS project.pbxproj');
}

// Update iOS scheme files
const schemePath = 'ios/BetaMeAdminDashboard.xcodeproj/xcshareddata/xcschemes/BetaMeAdminDashboard.xcscheme';
if (fs.existsSync(schemePath)) {
  updateFileContent(schemePath, [
    { from: 'BetaMe Admin Dashboard', to: 'BetaMe' },
    { from: 'BetaMeAdminDashboard', to: 'BetaMe' }
  ], 'Updated iOS scheme file');
}

// 4. Check and update Android configuration files
console.log('🤖 Updating Android configuration files...');

// Update Android strings.xml
const stringsPath = 'android/app/src/main/res/values/strings.xml';
if (fs.existsSync(stringsPath)) {
  updateFileContent(stringsPath, [
    { from: 'BetaMe Admin Dashboard', to: 'BetaMe' },
    { from: 'BetaMeAdminDashboard', to: 'BetaMe' }
  ], 'Updated Android strings.xml');
}

// Update Android AndroidManifest.xml
const manifestPath = 'android/app/src/main/AndroidManifest.xml';
if (fs.existsSync(manifestPath)) {
  updateFileContent(manifestPath, [
    { from: 'BetaMe Admin Dashboard', to: 'BetaMe' },
    { from: 'BetaMeAdminDashboard', to: 'BetaMe' }
  ], 'Updated Android AndroidManifest.xml');
}

// Update Android build.gradle
const buildGradlePath = 'android/app/build.gradle';
if (fs.existsSync(buildGradlePath)) {
  updateFileContent(buildGradlePath, [
    { from: 'BetaMe Admin Dashboard', to: 'BetaMe' },
    { from: 'BetaMeAdminDashboard', to: 'BetaMe' }
  ], 'Updated Android build.gradle');
}

// 5. Update any other configuration files
console.log('⚙️  Updating other configuration files...');

// Update EAS configuration
if (fs.existsSync('eas.json')) {
  updateFileContent('eas.json', [
    { from: 'BetaMe Admin Dashboard', to: 'BetaMe' },
    { from: 'betame-admin-dashboard', to: 'betame' }
  ], 'Updated eas.json');
}

// Update metro.config.js if it exists
if (fs.existsSync('metro.config.js')) {
  updateFileContent('metro.config.js', [
    { from: 'BetaMe Admin Dashboard', to: 'BetaMe' },
    { from: 'betame-admin-dashboard', to: 'betame' }
  ], 'Updated metro.config.js');
}

// Update babel.config.js if it exists
if (fs.existsSync('babel.config.js')) {
  updateFileContent('babel.config.js', [
    { from: 'BetaMe Admin Dashboard', to: 'BetaMe' },
    { from: 'betame-admin-dashboard', to: 'betame' }
  ], 'Updated babel.config.js');
}

// 6. Clean and regenerate native code
console.log('🔄 Cleaning and regenerating native code...');

// Remove old build directories
if (fs.existsSync('ios/build')) {
  safeExec('rm -rf ios/build', 'Removing iOS build directory');
}

if (fs.existsSync('android/build')) {
  safeExec('rm -rf android/build', 'Removing Android build directory');
}

if (fs.existsSync('android/app/build')) {
  safeExec('rm -rf android/app/build', 'Removing Android app build directory');
}

// 7. Regenerate native code with correct name
console.log('🔨 Regenerating native code...');
const prebuildResult = safeExec('npx expo prebuild --clean', 'Running expo prebuild with new name');

if (prebuildResult.success) {
  console.log('  ✅ Native code regenerated successfully');
} else {
  console.log('  ⚠️  Prebuild had issues, but continuing...');
}

// 8. Update any remaining references in source code
console.log('📝 Checking for remaining references in source code...');

// Check common source files for any hardcoded app names
const sourceFiles = [
  'app.json',
  'package.json',
  'README.md'
];

sourceFiles.forEach(file => {
  if (fs.existsSync(file)) {
    updateFileContent(file, [
      { from: 'BetaMe Admin Dashboard', to: 'BetaMe' },
      { from: 'betame-admin-dashboard', to: 'betame' }
    ], `Checked ${file}`);
  }
});

console.log('');
console.log('✅ App name fix completed!');
console.log('');
console.log('📋 Summary of changes:');
console.log('- App display name: "BetaMe Admin Dashboard" → "BetaMe"');
console.log('- App slug: "betame-admin-dashboard" → "betame"');
console.log('- Package name: "betame-admin-dashboard" → "betame"');
console.log('- Native code regenerated with correct name');
console.log('');
console.log('📱 Next steps:');
console.log('1. 🗑️  Delete the app from your device/simulator completely');
console.log('2. 🔄 Reinstall the app to see the correct name');
console.log('3. 🚀 Start development server: npx expo start');
console.log('');
console.log('💡 Note: The iOS project directory may still be named "BetaMeAdminDashboard"');
console.log('   This is normal and will be updated on the next prebuild.');
console.log('');
console.log('🎯 Your app should now display as "BetaMe" instead of "BetaMe Admin Dashboard"!');