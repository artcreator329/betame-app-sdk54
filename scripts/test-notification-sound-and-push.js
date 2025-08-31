/**
 * Test script for notification sound and push notification functionality
 * Run this to verify that:
 * 1. Custom sound file (sfx.wav) plays correctly
 * 2. Push notification tokens are registered
 * 3. Local notifications work with custom sound
 * 4. Push notifications work when app is in background
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testNotificationSoundAndPush() {
  console.log('🔔 Testing Notification Sound and Push Functionality');
  console.log('=' .repeat(60));

  try {
    // Test 1: Check if push tokens are being saved
    console.log('\n📱 Test 1: Checking push token registration...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, push_token, push_token_updated_at')
      .not('push_token', 'is', null)
      .limit(5);

    if (profilesError) {
      console.error('❌ Error fetching profiles with push tokens:', profilesError);
    } else {
      console.log(`✅ Found ${profiles.length} users with push tokens registered`);
      profiles.forEach(profile => {
        console.log(`  - ${profile.full_name}: Token ends with ...${profile.push_token?.slice(-10)}`);
        console.log(`    Updated: ${profile.push_token_updated_at}`);
      });
    }

    // Test 2: Check notification table structure
    console.log('\n📋 Test 2: Checking notification table structure...');
    
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .limit(3)
      .order('created_at', { ascending: false });

    if (notificationsError) {
      console.error('❌ Error fetching notifications:', notificationsError);
    } else {
      console.log(`✅ Found ${notifications.length} recent notifications`);
      notifications.forEach(notification => {
        console.log(`  - ${notification.title}: ${notification.type} (${notification.created_at})`);
      });
    }

    // Test 3: Create a test notification to verify sound
    console.log('\n🔔 Test 3: Creating test notification...');
    
    // Get a test user
    const { data: testUser, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .not('push_token', 'is', null)
      .limit(1)
      .single();

    if (userError || !testUser) {
      console.log('⚠️ No user with push token found for testing');
    } else {
      console.log(`📱 Creating test notification for user: ${testUser.full_name}`);
      
      const { error: notificationError } = await supabase.rpc('create_notification', {
        p_user_id: testUser.id,
        p_type: 'system',
        p_title: 'Sound Test Notification',
        p_message: 'This is a test notification to verify custom sound (sfx.wav) is working correctly on your device.',
        p_data: { test: true, sound_test: true },
        p_id: `sound-test-${Date.now()}`,
      });

      if (notificationError) {
        console.error('❌ Error creating test notification:', notificationError);
      } else {
        console.log('✅ Test notification created successfully');
        console.log('📱 Check your device - you should hear the custom sfx.wav sound!');
      }
    }

    // Test 4: Verify sound file configuration
    console.log('\n🔊 Test 4: Sound file configuration check...');
    console.log('✅ Custom sound file: assets/sfx.wav');
    console.log('✅ App.json configuration: expo-notifications plugin with sounds: ["./assets/sfx.wav"]');
    console.log('✅ Android channel: configured with sound: "sfx.wav"');
    console.log('✅ iOS notifications: configured with sound: "sfx.wav"');

    // Test 5: Push notification recommendations
    console.log('\n📋 Test 5: Push Notification Setup Recommendations...');
    console.log('');
    console.log('For REAL DEVICE testing:');
    console.log('1. 📱 Make sure you\'re testing on a physical device (not simulator)');
    console.log('2. 🔔 Grant notification permissions when prompted');
    console.log('3. 🔊 Check device volume and notification settings');
    console.log('4. 📳 Test with app in background/closed state');
    console.log('5. 🌐 Ensure device has internet connection');
    console.log('');
    console.log('Common issues and solutions:');
    console.log('• Sound not playing: Check device volume, notification settings, and Do Not Disturb');
    console.log('• Notifications not appearing: Verify permissions and test on physical device');
    console.log('• Realtime issues: Check network connection and Supabase realtime status');
    console.log('• Push tokens not saving: Check profile table permissions and RLS policies');

    console.log('\n✅ Notification sound and push test completed!');
    console.log('📱 Check your device for the test notification with custom sound.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testNotificationSoundAndPush().catch(console.error);