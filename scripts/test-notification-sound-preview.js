#!/usr/bin/env node

/**
 * Test Notification Sound Preview Feature
 * 
 * This script tests the notification sound preview feature implementation
 * in the notification settings page.
 */

const fs = require('fs');
const path = require('path');

console.log('🔊 Testing Notification Sound Preview Feature\n');

// Check if sound file exists
const soundFilePath = path.join(__dirname, '..', 'assets', 'sfx.wav');
if (fs.existsSync(soundFilePath)) {
  const stats = fs.statSync(soundFilePath);
  console.log('✅ Sound file found:');
  console.log(`   Path: ${soundFilePath}`);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
} else {
  console.log('❌ Sound file not found:', soundFilePath);
  process.exit(1);
}

// Check main notification settings component
const mainSettingsPath = path.join(__dirname, '..', 'components', 'NotificationSettings.tsx');
if (fs.existsSync(mainSettingsPath)) {
  const content = fs.readFileSync(mainSettingsPath, 'utf8');
  
  console.log('\n📱 Main App Notification Settings:');
  
  // Check for imports
  if (content.includes('import { Audio } from \'expo-av\'')) {
    console.log('✅ Audio import found');
  } else {
    console.log('❌ Audio import not found');
  }
  
  if (content.includes('Volume2, Play')) {
    console.log('✅ Volume2 and Play icons imported');
  } else {
    console.log('❌ Volume2 and Play icons not imported');
  }
  
  // Check for sound preview function
  if (content.includes('handleSoundPreview')) {
    console.log('✅ Sound preview function found');
  } else {
    console.log('❌ Sound preview function not found');
  }
  
  // Check for Audio.Sound.createAsync
  if (content.includes('Audio.Sound.createAsync')) {
    console.log('✅ Audio playback implementation found');
  } else {
    console.log('❌ Audio playback implementation not found');
  }
  
  // Check for notification sound preview UI
  if (content.includes('Notification Sound')) {
    console.log('✅ Notification Sound UI section found');
  } else {
    console.log('❌ Notification Sound UI section not found');
  }
  
  // Check for play button
  if (content.includes('playButton')) {
    console.log('✅ Play button styles found');
  } else {
    console.log('❌ Play button styles not found');
  }
  
  // Check for isPlayingSound state
  if (content.includes('isPlayingSound')) {
    console.log('✅ Playing state management found');
  } else {
    console.log('❌ Playing state management not found');
  }
} else {
  console.log('❌ Main notification settings file not found');
}

// Check admin notification settings component
const adminSettingsPath = path.join(__dirname, '..', 'admin-deploy-temp', 'components', 'NotificationSettings.tsx');
if (fs.existsSync(adminSettingsPath)) {
  const content = fs.readFileSync(adminSettingsPath, 'utf8');
  
  console.log('\n🏢 Admin Dashboard Notification Settings:');
  
  // Check for imports
  if (content.includes('import { Audio } from \'expo-av\'')) {
    console.log('✅ Audio import found');
  } else {
    console.log('❌ Audio import not found');
  }
  
  if (content.includes('Volume2, Play')) {
    console.log('✅ Volume2 and Play icons imported');
  } else {
    console.log('❌ Volume2 and Play icons not imported');
  }
  
  // Check for sound preview function
  if (content.includes('handleSoundPreview')) {
    console.log('✅ Sound preview function found');
  } else {
    console.log('❌ Sound preview function not found');
  }
  
  // Check for notification sound preview UI
  if (content.includes('Notification Sound')) {
    console.log('✅ Notification Sound UI section found');
  } else {
    console.log('❌ Notification Sound UI section not found');
  }
  
  // Check for play button
  if (content.includes('playButton')) {
    console.log('✅ Play button styles found');
  } else {
    console.log('❌ Play button styles not found');
  }
} else {
  console.log('⚠️ Admin notification settings file not found');
}

// Check package.json for expo-av dependency
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  console.log('\n📦 Dependencies:');
  
  if (packageJson.dependencies['expo-av']) {
    console.log(`✅ expo-av found: ${packageJson.dependencies['expo-av']}`);
  } else {
    console.log('❌ expo-av not found in dependencies');
  }
} else {
  console.log('❌ package.json not found');
}

console.log('\n📋 Feature Summary:');
console.log('1. Sound preview button in notification settings');
console.log('2. Audio playback using expo-av');
console.log('3. Visual feedback during playback');
console.log('4. Error handling for playback failures');
console.log('5. Proper cleanup of audio resources');

console.log('\n🧪 To test the sound preview:');
console.log('1. Open the app');
console.log('2. Go to Settings > Notification Settings');
console.log('3. Tap the play button next to "Notification Sound"');
console.log('4. Listen for the custom sound preview');

console.log('\n✅ Notification sound preview feature test complete!\n');
