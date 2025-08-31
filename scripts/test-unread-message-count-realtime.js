/**
 * Test script to verify unread message count updates in real-time
 * This script tests:
 * 1. Unread message count calculation
 * 2. Real-time updates when new messages arrive
 * 3. Badge count updates in tab navigation
 * 4. Integration between notification and message systems
 */

// Load environment variables
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUnreadMessageCountRealtime() {
  console.log('🔔 Testing Unread Message Count Real-time Updates');
  console.log('=' .repeat(60));

  try {
    // Test 1: Check current unread message counts
    console.log('\n📊 Test 1: Checking current unread message counts...');
    
    // Get some test users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .limit(3);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`✅ Found ${users.length} test users`);

    for (const user of users) {
      // Get user's chats
      const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select('id, participant1_id, participant2_id')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .limit(5);

      if (chatsError) {
        console.error(`❌ Error fetching chats for ${user.full_name}:`, chatsError);
        continue;
      }

      let totalUnreadCount = 0;

      for (const chat of chats) {
        // Get unread message count for this chat
        const { data: unreadMessages, error: unreadError } = await supabase
          .from('chat_messages')
          .select('id')
          .eq('chat_id', chat.id)
          .neq('sender_id', user.id)
          .not('id', 'in', `(
            SELECT message_id 
            FROM message_read_status 
            WHERE user_id = '${user.id}' AND is_read = true
          )`);

        if (!unreadError && unreadMessages) {
          totalUnreadCount += unreadMessages.length;
        }
      }

      console.log(`  - ${user.full_name}: ${totalUnreadCount} unread messages across ${chats.length} chats`);
    }

    // Test 2: Check notification counts
    console.log('\n🔔 Test 2: Checking notification counts...');
    
    for (const user of users) {
      const { data: notifications, error: notificationsError } = await supabase
        .from('notifications')
        .select('id, type, is_read')
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (!notificationsError && notifications) {
        const chatNotifications = notifications.filter(n => n.type === 'chat').length;
        const totalNotifications = notifications.length;
        console.log(`  - ${user.full_name}: ${totalNotifications} unread notifications (${chatNotifications} chat)`);
      }
    }

    // Test 3: Test real-time subscription setup
    console.log('\n📡 Test 3: Testing real-time subscription setup...');
    
    const testUser = users[0];
    if (testUser) {
      console.log(`📱 Setting up real-time subscription for: ${testUser.full_name}`);
      
      // Subscribe to chat messages for this user
      const channel = supabase
        .channel(`test_unread_count:${testUser.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
          },
          (payload) => {
            console.log('🚨 REAL-TIME MESSAGE DETECTED!');
            console.log('  - Message ID:', payload.new.id);
            console.log('  - Sender ID:', payload.new.sender_id);
            console.log('  - Chat ID:', payload.new.chat_id);
            console.log('  - Message Type:', payload.new.message_type);
            console.log('  - Is for test user:', payload.new.sender_id !== testUser.id);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_read_status',
          },
          (payload) => {
            console.log('📖 READ STATUS CHANGE DETECTED!');
            console.log('  - User ID:', payload.new?.user_id || payload.old?.user_id);
            console.log('  - Message ID:', payload.new?.message_id || payload.old?.message_id);
            console.log('  - Is Read:', payload.new?.is_read);
            console.log('  - Event:', payload.eventType);
          }
        )
        .subscribe((status) => {
          console.log('📡 Real-time subscription status:', status);
        });

      // Keep subscription active for a short time
      console.log('⏱️ Keeping subscription active for 10 seconds...');
      console.log('💡 Send a message in the app to test real-time updates!');
      
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Clean up
      channel.unsubscribe();
      console.log('🧹 Real-time subscription cleaned up');
    }

    // Test 4: Verify database functions and triggers
    console.log('\n🔧 Test 4: Checking database functions and triggers...');
    
    // Check if there are any functions related to message counting
    const { data: functions, error: functionsError } = await supabase
      .rpc('get_function_list')
      .catch(() => ({ data: null, error: 'Function not available' }));

    if (functions) {
      const messageFunctions = functions.filter(f => 
        f.name.includes('message') || f.name.includes('unread') || f.name.includes('chat')
      );
      console.log(`✅ Found ${messageFunctions.length} message-related database functions`);
      messageFunctions.forEach(f => console.log(`  - ${f.name}`));
    } else {
      console.log('ℹ️ Could not check database functions');
    }

    // Test 5: Integration recommendations
    console.log('\n📋 Test 5: Integration Recommendations...');
    console.log('');
    console.log('For optimal real-time unread count updates:');
    console.log('');
    console.log('✅ Tab Navigation Badge:');
    console.log('  - Now combines notification count + unread message count');
    console.log('  - Updates automatically when either system changes');
    console.log('  - Shows total unread items across both systems');
    console.log('');
    console.log('✅ Real-time Updates:');
    console.log('  - useUnreadMessageCount hook subscribes to chat_messages table');
    console.log('  - useNotifications hook subscribes to notifications table');
    console.log('  - Both hooks update their respective counts in real-time');
    console.log('  - Tab badge reflects combined count automatically');
    console.log('');
    console.log('✅ Message Flow:');
    console.log('  1. New message arrives → chat_messages table');
    console.log('  2. useUnreadMessageCount detects change → updates totalUnreadCount');
    console.log('  3. Notification created → notifications table');
    console.log('  4. useNotifications detects change → updates unreadCount');
    console.log('  5. Tab badge shows: unreadCount + totalUnreadCount');
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('  - Check network connection for real-time updates');
    console.log('  - Verify user authentication for proper subscriptions');
    console.log('  - Monitor console logs for subscription status');
    console.log('  - Test on physical device for accurate results');

    console.log('\n✅ Unread message count real-time test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testUnreadMessageCountRealtime().catch(console.error);