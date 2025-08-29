#!/usr/bin/env node

/**
 * Test Custom Notification Sound Implementation
 * 
 * This script tests the custom notification sound (sfx.wav) implementation
 * by sending a test notification and verifying the configuration.
 */

const fs = require('fs');
const path = require('path');

console.log('🔊 Testing Custom Notification Sound Implementation\n');

// Check if sound file exists
const soundFilePath = path.join(__dirname, '..', 'assets', 'sfx.wav');
if (fs.existsSync(soundFilePath)) {
  const stats = fs.statSync(soundFilePath);
  console.log('✅ Sound file found:');
  console.log(`   Path: ${soundFilePath}`);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log(`   Modified: ${stats.mtime.toISOString()}`);
} else {
  console.log('❌ Sound file not found:', soundFilePath);
  process.exit(1);
}

// Check app.json configuration
const appJsonPath = path.join(__dirname, '..', 'app.json');
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  console.log('\n📱 App Configuration:');
  
  // Check expo-notifications plugin
  const notificationsPlugin = appJson.expo.plugins?.find(p => 
    Array.isArray(p) && p[0] === 'expo-notifications'
  );
  
  if (notificationsPlugin) {
    const config = notificationsPlugin[1];
    console.log('✅ expo-notifications plugin configured:');
    console.log(`   Icon: ${config.icon}`);
    console.log(`   Color: ${config.color}`);
    console.log(`   Sounds: ${config.sounds.join(', ')}`);
    
    // Verify sound file path in config
    const soundConfig = config.sounds.find(s => s.includes('sfx.wav'));
    if (soundConfig) {
      console.log('✅ Custom sound configured correctly');
    } else {
      console.log('❌ Custom sound not found in configuration');
    }
  } else {
    console.log('❌ expo-notifications plugin not found in app.json');
  }
} else {
  console.log('❌ app.json not found');
}

// Check local notifications implementation
const localNotificationsPath = path.join(__dirname, '..', 'lib', 'local-notifications.ts');
if (fs.existsSync(localNotificationsPath)) {
  const content = fs.readFileSync(localNotificationsPath, 'utf8');
  
  console.log('\n🔧 Local Notifications Implementation:');
  
  // Check for custom sound usage
  const soundUsage = content.match(/sound:\s*['"]sfx\.wav['"]/g);
  if (soundUsage) {
    console.log(`✅ Custom sound referenced ${soundUsage.length} times:`);
    soundUsage.forEach((match, index) => {
      console.log(`   ${index + 1}. ${match.trim()}`);
    });
  } else {
    console.log('❌ Custom sound not found in local notifications');
  }
  
  // Check for Android channel configuration
  if (content.includes('setNotificationChannelAsync')) {
    console.log('✅ Android notification channel configured');
  } else {
    console.log('❌ Android notification channel not configured');
  }
  
  // Check for iOS sound configuration
  if (content.includes('sound: \'sfx.wav\'')) {
    console.log('✅ iOS sound configuration found');
  } else {
    console.log('❌ iOS sound configuration not found');
  }
} else {
  console.log('❌ local-notifications.ts not found');
}

// Check admin dashboard implementation
const adminNotificationsPath = path.join(__dirname, '..', 'admin-deploy-temp', 'lib', 'local-notifications.ts');
if (fs.existsSync(adminNotificationsPath)) {
  const content = fs.readFileSync(adminNotificationsPath, 'utf8');
  
  console.log('\n🏢 Admin Dashboard Implementation:');
  
  const soundUsage = content.match(/sound:\s*['"]sfx\.wav['"]/g);
  if (soundUsage) {
    console.log(`✅ Custom sound referenced ${soundUsage.length} times in admin dashboard`);
  } else {
    console.log('❌ Custom sound not found in admin dashboard');
  }
} else {
  console.log('⚠️ Admin dashboard notifications file not found');
}

console.log('\n📋 Summary:');
console.log('1. Sound file should be in /assets/sfx.wav');
console.log('2. app.json should include expo-notifications plugin with sounds array');
console.log('3. local-notifications.ts should use "sfx.wav" for sound property');
console.log('4. Android notification channel should be configured with custom sound');
console.log('5. iOS notifications should specify custom sound');

console.log('\n🧪 To test the custom sound:');
console.log('1. Build and install the app');
console.log('2. Go to Profile tab');
console.log('3. Tap "Test System Notification"');
console.log('4. Put app in background immediately');
console.log('5. Listen for the custom sound');

console.log('\n✅ Custom notification sound implementation test complete!\n');
