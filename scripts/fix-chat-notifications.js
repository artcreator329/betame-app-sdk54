/**
 * Fix Chat Notifications
 * 
 * This script fixes missing chat notifications by:
 * 1. Backfilling missing notifications for recent messages
 * 2. Creating a more robust notification system
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixChatNotifications() {
  console.log('🔧 Fixing Chat Notifications...\n');

  try {
    // Step 1: Find all chat messages without notifications
    console.log('1️⃣ Finding chat messages without notifications...');
    const { data: recentMessages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('❌ Error fetching recent messages:', messagesError);
      return;
    }

    console.log(`📊 Found ${recentMessages.length} recent messages`);

    // Step 2: Get all existing chat notifications
    console.log('\n2️⃣ Getting existing chat notifications...');
    const { data: existingNotifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'chat')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (notifError) {
      console.error('❌ Error fetching notifications:', notifError);
      return;
    }

    console.log(`📊 Found ${existingNotifications.length} existing chat notifications`);

    // Step 3: Identify messages without notifications
    console.log('\n3️⃣ Identifying messages without notifications...');
    const messagesWithNotifications = new Set();
    
    existingNotifications.forEach(notification => {
      if (notification.data && notification.data.chatId) {
        messagesWithNotifications.add(notification.data.chatId);
      }
    });

    const messagesWithoutNotifications = recentMessages.filter(message => 
      !messagesWithNotifications.has(message.chat_id)
    );

    console.log(`📊 Found ${messagesWithoutNotifications.length} messages without notifications`);

    if (messagesWithoutNotifications.length === 0) {
      console.log('✅ All messages have notifications! No action needed.');
      return;
    }

    // Step 4: Get all chat details and profiles
    console.log('\n4️⃣ Getting chat details and profiles...');
    
    // Get unique chat IDs
    const chatIds = [...new Set(messagesWithoutNotifications.map(m => m.chat_id))];
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .in('id', chatIds);

    if (chatsError) {
      console.error('❌ Error fetching chats:', chatsError);
      return;
    }

    // Get unique user IDs
    const userIds = new Set();
    messagesWithoutNotifications.forEach(m => userIds.add(m.sender_id));
    chats.forEach(c => {
      userIds.add(c.participant1_id);
      userIds.add(c.participant2_id);
    });

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', Array.from(userIds));

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }

    // Create lookup maps
    const chatMap = {};
    chats.forEach(chat => chatMap[chat.id] = chat);

    const profileMap = {};
    profiles.forEach(profile => profileMap[profile.id] = profile);

    // Step 5: Create missing notifications
    console.log('\n5️⃣ Creating missing notifications...');
    let successCount = 0;
    let errorCount = 0;

    for (const message of messagesWithoutNotifications) {
      try {
        const chat = chatMap[message.chat_id];
        if (!chat) {
          console.log(`⚠️ Chat not found for message ${message.id}`);
          continue;
        }

        const senderProfile = profileMap[message.sender_id];
        if (!senderProfile) {
          console.log(`⚠️ Sender profile not found for ${message.sender_id}`);
          continue;
        }

        // Determine recipient
        const recipientId = message.sender_id === chat.participant1_id 
          ? chat.participant2_id 
          : chat.participant1_id;

        // Create notification data
        const notificationData = {
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

        // Insert notification
        const { data: notification, error: insertError } = await supabase
          .from('notifications')
          .insert(notificationData)
          .select()
          .single();

        if (insertError) {
          console.error(`❌ Failed to create notification for message ${message.id}:`, insertError.message);
          errorCount++;
        } else {
          console.log(`✅ Created notification for message ${message.id} (${senderProfile.full_name} → ${recipientId})`);
          successCount++;
        }

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error processing message ${message.id}:`, error.message);
        errorCount++;
      }
    }

    // Step 6: Summary
    console.log('\n📊 Summary:');
    console.log(`✅ Successfully created: ${successCount} notifications`);
    console.log(`❌ Failed to create: ${errorCount} notifications`);
    console.log(`📊 Total messages processed: ${messagesWithoutNotifications.length}`);

    if (successCount > 0) {
      console.log('\n🎉 Missing chat notifications have been fixed!');
    } else {
      console.log('\n⚠️ No notifications were created. Please check the errors above.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
if (require.main === module) {
  fixChatNotifications()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixChatNotifications };
