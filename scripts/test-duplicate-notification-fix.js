#!/usr/bin/env node

/**
 * Test script to verify that duplicate chat notifications have been fixed
 * 
 * This script will:
 * 1. Send a test message between two users
 * 2. Check that only ONE notification is created (not 2-3 duplicates)
 * 3. Verify the notification has correct data
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDuplicateNotificationFix() {
  console.log('🧪 Testing Duplicate Notification Fix');
  console.log('=====================================\n');

  try {
    // Get two test users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .limit(2);

    if (usersError || !users || users.length < 2) {
      console.error('❌ Need at least 2 users in the database to test');
      return;
    }

    const sender = users[0];
    const recipient = users[1];

    console.log('👤 Sender:', sender.full_name, `(${sender.id})`);
    console.log('👤 Recipient:', recipient.full_name, `(${recipient.id})`);

    // Create or get a chat between these users
    console.log('\n📱 Creating/getting chat...');
    const { data: existingChats } = await supabase
      .from('chats')
      .select('*')
      .or(`and(participant1_id.eq.${sender.id},participant2_id.eq.${recipient.id}),and(participant1_id.eq.${recipient.id},participant2_id.eq.${sender.id})`);

    let chatId;
    if (existingChats && existingChats.length > 0) {
      chatId = existingChats[0].id;
      console.log('✅ Using existing chat:', chatId);
    } else {
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          participant1_id: sender.id,
          participant2_id: recipient.id
        })
        .select()
        .single();

      if (chatError) {
        console.error('❌ Error creating chat:', chatError);
        return;
      }

      chatId = newChat.id;
      console.log('✅ Created new chat:', chatId);
    }

    // Clear existing notifications for recipient to get clean test
    console.log('\n🧹 Clearing existing notifications for recipient...');
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', recipient.id);

    // Count notifications before sending message
    const { data: beforeNotifications } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', recipient.id);

    const beforeCount = beforeNotifications?.length || 0;
    console.log(`📊 Notifications before: ${beforeCount}`);

    // Send a test message
    const testMessage = `Test message at ${new Date().toISOString()}`;
    console.log('\n📤 Sending test message:', testMessage);

    const { data: messageData, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        sender_id: sender.id,
        sender_name: sender.full_name || 'Test User',
        sender_image: sender.avatar_url || 'https://via.placeholder.com/40',
        message: testMessage,
        message_type: 'text'
      })
      .select()
      .single();

    if (messageError) {
      console.error('❌ Error sending message:', messageError);
      return;
    }

    console.log('✅ Message sent successfully:', messageData.id);

    // Wait a moment for notifications to be processed
    console.log('\n⏳ Waiting for notifications to be processed...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Count notifications after sending message
    const { data: afterNotifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', recipient.id)
      .order('created_at', { ascending: false });

    const afterCount = afterNotifications?.length || 0;
    const newNotifications = afterCount - beforeCount;

    console.log(`📊 Notifications after: ${afterCount}`);
    console.log(`📊 New notifications: ${newNotifications}`);

    // Check results
    if (newNotifications === 1) {
      console.log('\n✅ SUCCESS: Exactly 1 notification created (no duplicates!)');
      
      const notification = afterNotifications[0];
      console.log('📋 Notification details:');
      console.log('  - Type:', notification.type);
      console.log('  - Title:', notification.title);
      console.log('  - Message:', notification.message);
      console.log('  - Data:', JSON.stringify(notification.data, null, 2));
      
    } else if (newNotifications === 0) {
      console.log('\n❌ ISSUE: No notifications were created');
      console.log('This might indicate the notification system is not working');
      
    } else if (newNotifications > 1) {
      console.log(`\n❌ ISSUE: ${newNotifications} duplicate notifications created!`);
      console.log('The fix did not work properly');
      
      console.log('\n📋 Duplicate notifications:');
      afterNotifications.slice(0, newNotifications).forEach((notif, index) => {
        console.log(`  ${index + 1}. ${notif.title} - ${notif.message}`);
      });
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', recipient.id);

    await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageData.id);

    console.log('✅ Cleanup completed');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testDuplicateNotificationFix().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});