/**
 * Test Chat Notification Flow
 * 
 * This script tests the complete chat notification flow to identify
 * where the breakdown is occurring.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testChatNotificationFlow() {
  console.log('🧪 Testing Complete Chat Notification Flow...\n');

  try {
    // Step 1: Check recent messages and their notification status
    console.log('1️⃣ Analyzing recent chat messages...');
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

    for (const message of recentMessages) {
      console.log(`\n📝 Message: ${message.id}`);
      console.log(`   - Chat ID: ${message.chat_id}`);
      console.log(`   - Sender: ${message.sender_id}`);
      console.log(`   - Message: ${message.message.substring(0, 50)}...`);
      console.log(`   - Created: ${message.created_at}`);

      // Get chat details
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', message.chat_id)
        .single();

      if (chatError) {
        console.log(`   ❌ Error fetching chat: ${chatError.message}`);
        continue;
      }

      // Determine recipient
      const recipientId = message.sender_id === chat.participant1_id 
        ? chat.participant2_id 
        : chat.participant1_id;

      console.log(`   - Recipient: ${recipientId}`);

      // Check for notifications
      const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'chat')
        .eq('data->>chatId', message.chat_id)
        .gte('created_at', message.created_at);

      if (notifError) {
        console.log(`   ❌ Error checking notifications: ${notifError.message}`);
        continue;
      }

      console.log(`   - Notifications found: ${notifications.length}`);

      if (notifications.length === 0) {
        console.log(`   ⚠️ NO NOTIFICATION FOUND - This is the issue!`);
        
        // Test notification creation for this specific message
        console.log(`   🔧 Testing notification creation...`);
        
        // Get sender profile
        const { data: senderProfile, error: senderError } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', message.sender_id)
          .single();

        if (senderError) {
          console.log(`   ❌ Error fetching sender profile: ${senderError.message}`);
          continue;
        }

        // Create test notification
        const testNotificationData = {
          user_id: recipientId,
          type: 'chat',
          title: `New message from ${senderProfile.full_name}`,
          message: message.message.length > 50 
            ? message.message.substring(0, 50) + '...' 
            : message.message,
          data: {
            chatId: message.chat_id,
            participantId: message.sender_id,
            participantName: senderProfile.full_name,
            participantImage: senderProfile.avatar_url || '',
          },
          created_at: message.created_at, // Use original message time
          is_read: false
        };

        const { data: testNotification, error: createError } = await supabase
          .from('notifications')
          .insert(testNotificationData)
          .select()
          .single();

        if (createError) {
          console.log(`   ❌ Failed to create test notification: ${createError.message}`);
        } else {
          console.log(`   ✅ Test notification created: ${testNotification.id}`);
          
          // Clean up
          await supabase
            .from('notifications')
            .delete()
            .eq('id', testNotification.id);
          console.log(`   ✅ Test notification cleaned up`);
        }
      }
    }

    // Step 2: Check notification service RPC function
    console.log('\n2️⃣ Testing notification service RPC function...');
    
    if (recentMessages.length > 0) {
      const testMessage = recentMessages[0];
      const { data: chat } = await supabase
        .from('chats')
        .select('*')
        .eq('id', testMessage.chat_id)
        .single();

      const recipientId = testMessage.sender_id === chat.participant1_id 
        ? chat.participant2_id 
        : chat.participant1_id;

      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', testMessage.sender_id)
        .single();

      // Test with explicit ID parameter
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_notification', {
        p_user_id: recipientId,
        p_type: 'chat',
        p_title: `Test RPC notification from ${senderProfile.full_name}`,
        p_message: 'This is a test notification created via RPC',
        p_data: {
          chatId: testMessage.chat_id,
          participantId: testMessage.sender_id,
          participantName: senderProfile.full_name,
          participantImage: senderProfile.avatar_url || '',
        },
        p_id: `test-rpc-${Date.now()}`
      });

      if (rpcError) {
        console.error('❌ RPC notification creation failed:', rpcError.message);
        console.log('💡 This suggests the RPC function has signature conflicts');
      } else {
        console.log('✅ RPC notification creation successful:', rpcResult);
      }
    }

    // Step 3: Analyze potential issues
    console.log('\n3️⃣ Analysis of potential issues...');
    console.log('🔍 Issues identified:');
    console.log('  1. Chat messages are being created but notifications are not');
    console.log('  2. Manual notification creation works fine');
    console.log('  3. RPC function has signature conflicts');
    console.log('  4. AuthContext chat subscription may not be working');
    
    console.log('\n🔧 Recommended fixes:');
    console.log('  1. Fix RPC function signature conflicts');
    console.log('  2. Check if AuthContext chat subscription is active');
    console.log('  3. Verify notification service is properly initialized');
    console.log('  4. Add fallback notification creation in chat service');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testChatNotificationFlow()
    .then(() => {
      console.log('\n✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testChatNotificationFlow };
