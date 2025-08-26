/**
 * Test Chat Notification System
 * 
 * This script tests the chat notification system to identify why
 * incoming chat messages are not showing up on the notification page.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testChatNotificationSystem() {
  console.log('🧪 Testing Chat Notification System...\n');

  try {
    // Step 1: Check recent chat messages
    console.log('1️⃣ Checking recent chat messages...');
    const { data: recentMessages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (messagesError) {
      console.error('❌ Error fetching recent messages:', messagesError);
      return;
    }

    console.log(`📊 Found ${recentMessages.length} recent messages`);

    // Step 2: Check if notifications exist for these messages
    console.log('\n2️⃣ Checking for existing notifications...');
    for (const message of recentMessages) {
      const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'chat')
        .eq('data->>chatId', message.chat_id)
        .gte('created_at', message.created_at);

      if (notifError) {
        console.error(`❌ Error checking notifications for message ${message.id}:`, notifError);
        continue;
      }

      console.log(`📝 Message ${message.id}: ${notifications.length} notifications found`);
    }

    // Step 3: Test notification creation manually
    console.log('\n3️⃣ Testing manual notification creation...');
    
    if (recentMessages.length > 0) {
      const testMessage = recentMessages[0];
      
      // Get chat participants
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', testMessage.chat_id)
        .single();

      if (chatError) {
        console.error('❌ Error fetching chat:', chatError);
        return;
      }

      // Get sender profile
      const { data: senderProfile, error: senderError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', testMessage.sender_id)
        .single();

      if (senderError) {
        console.error('❌ Error fetching sender profile:', senderError);
        return;
      }

      // Determine recipient (the other participant)
      const recipientId = testMessage.sender_id === chat.participant1_id 
        ? chat.participant2_id 
        : chat.participant1_id;

      console.log('📝 Test message details:');
      console.log('  - Message ID:', testMessage.id);
      console.log('  - Chat ID:', testMessage.chat_id);
      console.log('  - Sender:', senderProfile.full_name, `(${testMessage.sender_id})`);
      console.log('  - Recipient ID:', recipientId);
      console.log('  - Message:', testMessage.message);

      // Create test notification
      const testNotificationData = {
        user_id: recipientId,
        type: 'chat',
        title: `New message from ${senderProfile.full_name}`,
        message: testMessage.message.length > 50 
          ? testMessage.message.substring(0, 50) + '...' 
          : testMessage.message,
        data: {
          chatId: testMessage.chat_id,
          participantId: testMessage.sender_id,
          participantName: senderProfile.full_name,
          participantImage: senderProfile.avatar_url || '',
        },
        created_at: new Date().toISOString(),
        is_read: false
      };

      console.log('\n📝 Creating test notification...');
      const { data: testNotification, error: createError } = await supabase
        .from('notifications')
        .insert(testNotificationData)
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create test notification:', createError);
        return;
      }

      console.log('✅ Test notification created successfully:', testNotification.id);

      // Clean up test notification
      await supabase
        .from('notifications')
        .delete()
        .eq('id', testNotification.id);

      console.log('✅ Test notification cleaned up');
    }

    // Step 4: Check RPC function
    console.log('\n4️⃣ Testing RPC notification creation...');
    
    if (recentMessages.length > 0) {
      const testMessage = recentMessages[0];
      
      // Get chat participants again for RPC test
      const { data: chatForRpc, error: chatRpcError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', testMessage.chat_id)
        .single();

      if (chatRpcError) {
        console.error('❌ Error fetching chat for RPC test:', chatRpcError);
        return;
      }

      const recipientId = testMessage.sender_id === chatForRpc.participant1_id 
        ? chatForRpc.participant2_id 
        : chatForRpc.participant1_id;

      // Get sender profile for RPC test
      const { data: senderProfileForRpc, error: senderRpcError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', testMessage.sender_id)
        .single();

      if (senderRpcError) {
        console.error('❌ Error fetching sender profile for RPC test:', senderRpcError);
        return;
      }

      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_notification', {
        p_user_id: recipientId,
        p_type: 'chat',
        p_title: `Test RPC notification from ${senderProfileForRpc.full_name}`,
        p_message: 'This is a test notification created via RPC',
        p_data: {
          chatId: testMessage.chat_id,
          participantId: testMessage.sender_id,
          participantName: senderProfileForRpc.full_name,
          participantImage: senderProfileForRpc.avatar_url || '',
        }
      });

      if (rpcError) {
        console.error('❌ RPC notification creation failed:', rpcError);
      } else {
        console.log('✅ RPC notification creation successful:', rpcResult);
      }
    }

    // Step 5: Check notification service logic
    console.log('\n5️⃣ Analyzing notification service logic...');
    console.log('🔍 Potential issues:');
    console.log('  - Check if AuthContext chat subscription is working');
    console.log('  - Check if notificationService.addChatNotification is being called');
    console.log('  - Check if self-notification prevention is too aggressive');
    console.log('  - Check if realtime subscriptions are properly set up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testChatNotificationSystem()
    .then(() => {
      console.log('\n✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testChatNotificationSystem };
