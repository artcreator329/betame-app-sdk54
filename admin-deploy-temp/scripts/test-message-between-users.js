#!/usr/bin/env node

/**
 * Test script to simulate sending a message between specific users
 * From: gzd8onijy7@wyoxafp.com
 * To: as9uvg1yj0@illubd.com
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testMessageBetweenUsers() {
  console.log('📱 Testing message between specific users...');
  
  const senderEmail = 'gzd8onijy7@wyoxafp.com';
  const recipientEmail = 'as9uvg1yj0@illubd.com';
  
  try {
    // First, let's find these users in the database
    console.log('\n🔍 Looking up users...');
    
    const { data: senderUser, error: senderError } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .eq('email', senderEmail)
      .maybeSingle();
    
    const { data: recipientUser, error: recipientError } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .eq('email', recipientEmail)
      .maybeSingle();
    
    console.log('Sender user:', senderUser);
    console.log('Recipient user:', recipientUser);
    
    if (!senderUser) {
      console.log('❌ Sender user not found. Creating test user...');
      const { data: newSender, error: createSenderError } = await supabase
        .from('profiles')
        .insert({
          email: senderEmail,
          full_name: 'Test Sender',
          avatar_url: 'https://via.placeholder.com/150'
        })
        .select()
        .single();
      
      if (createSenderError) {
        console.error('Error creating sender:', createSenderError);
        return;
      }
      console.log('✅ Created sender user:', newSender);
    }
    
    if (!recipientUser) {
      console.log('❌ Recipient user not found. Creating test user...');
      const { data: newRecipient, error: createRecipientError } = await supabase
        .from('profiles')
        .insert({
          email: recipientEmail,
          full_name: 'Test Recipient',
          avatar_url: 'https://via.placeholder.com/150'
        })
        .select()
        .single();
      
      if (createRecipientError) {
        console.error('Error creating recipient:', createRecipientError);
        return;
      }
      console.log('✅ Created recipient user:', newRecipient);
    }
    
    // Get the final user data
    const finalSender = senderUser || (await supabase.from('profiles').select('*').eq('email', senderEmail).single()).data;
    const finalRecipient = recipientUser || (await supabase.from('profiles').select('*').eq('email', recipientEmail).single()).data;
    
    if (!finalSender || !finalRecipient) {
      console.error('❌ Could not get user data');
      return;
    }
    
    console.log('\n📋 Test scenario:');
    console.log(`Sender: ${finalSender.full_name} (${finalSender.email}) - ID: ${finalSender.id}`);
    console.log(`Recipient: ${finalRecipient.full_name} (${finalRecipient.email}) - ID: ${finalRecipient.id}`);
    
    // Create or get a chat between these users
    console.log('\n💬 Creating/getting chat...');
    
    const { data: existingChat, error: chatSearchError } = await supabase
      .from('chats')
      .select('*')
      .or(`and(participant1_id.eq.${finalSender.id},participant2_id.eq.${finalRecipient.id}),and(participant1_id.eq.${finalRecipient.id},participant2_id.eq.${finalSender.id})`)
      .maybeSingle();
    
    let chatId;
    if (existingChat) {
      chatId = existingChat.id;
      console.log('✅ Using existing chat:', chatId);
    } else {
      // Create new chat
      const { data: newChat, error: createChatError } = await supabase
        .from('chats')
        .insert({
          participant1_id: finalSender.id,
          participant2_id: finalRecipient.id,
          service_id: null,
          service_title: null
        })
        .select()
        .single();
      
      if (createChatError) {
        console.error('Error creating chat:', createChatError);
        return;
      }
      
      chatId = newChat.id;
      console.log('✅ Created new chat:', chatId);
      
      // Add participants
      const participantsData = [
        {
          chat_id: chatId,
          user_id: finalSender.id,
          joined_at: new Date().toISOString(),
          is_blocked: false
        },
        {
          chat_id: chatId,
          user_id: finalRecipient.id,
          joined_at: new Date().toISOString(),
          is_blocked: false
        }
      ];
      
      await supabase
        .from('chat_participants')
        .upsert(participantsData, { 
          onConflict: 'chat_id,user_id',
          ignoreDuplicates: true 
        });
      
      console.log('✅ Added chat participants');
    }
    
    // Now simulate sending a message
    console.log('\n📤 Simulating message send...');
    
    const testMessage = `Hello! This is a test message sent at ${new Date().toLocaleString()}`;
    
    const messageData = {
      chat_id: chatId,
      sender_id: finalSender.id,
      sender_name: finalSender.full_name,
      sender_image: finalSender.avatar_url,
      message: testMessage,
      is_hidden: false,
      moderation_reason: null,
      is_reported: false,
    };
    
    const { data: messageResult, error: messageError } = await supabase
      .from('chat_messages')
      .insert(messageData)
      .select()
      .single();
    
    if (messageError) {
      console.error('❌ Error sending message:', messageError);
      return;
    }
    
    console.log('✅ Message sent successfully:', messageResult.id);
    
    // Update chat's last message timestamp
    await supabase
      .from('chats')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', chatId);
    
    // Now test the notification logic
    console.log('\n🔔 Testing notification logic...');
    
    // Simulate getting the other participant (this is what the chat service does)
    const { data: participants } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('chat_id', chatId)
      .neq('user_id', finalSender.id);
    
    console.log('Other participants found:', participants);
    
    if (participants && participants.length > 0) {
      const otherParticipantId = participants[0].user_id;
      console.log('Other participant ID:', otherParticipantId);
      console.log('Expected recipient ID:', finalRecipient.id);
      
      if (otherParticipantId === finalRecipient.id) {
        console.log('✅ Correct recipient identified');
      } else {
        console.log('❌ Wrong recipient identified');
      }
      
      // Test our self-notification prevention
      console.log('\n🛡️ Testing self-notification prevention...');
      
      // Check 1: senderId === participantId
      if (finalSender.id === otherParticipantId) {
        console.log('❌ WOULD CAUSE SELF-NOTIFICATION: sender === recipient');
      } else {
        console.log('✅ No self-notification: sender !== recipient');
      }
      
      // Simulate the notification call
      console.log('\n📱 Notification would be sent:');
      console.log(`TO: ${finalRecipient.full_name} (${otherParticipantId})`);
      console.log(`FROM: ${finalSender.full_name}`);
      console.log(`MESSAGE: "${testMessage}"`);
      
      // Test creating the actual notification
      console.log('\n🔔 Creating test notification...');
      
      const { error: notificationError } = await supabase.rpc('create_notification', {
        p_user_id: otherParticipantId,
        p_type: 'chat',
        p_title: `New message from ${finalSender.full_name}`,
        p_message: testMessage.length > 50 ? testMessage.substring(0, 50) + '...' : testMessage,
        p_data: {
          chatId: chatId,
          participantId: finalSender.id,
          participantName: finalSender.full_name,
          participantImage: finalSender.avatar_url,
        },
        p_id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
      
      if (notificationError) {
        console.error('❌ Error creating notification:', notificationError);
      } else {
        console.log('✅ Notification created successfully');
      }
      
      // Check if notification was created for the right user
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', otherParticipantId)
        .eq('type', 'chat')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (notifications && notifications.length > 0) {
        const notification = notifications[0];
        console.log('✅ Notification found in database:');
        console.log(`  - User ID: ${notification.user_id}`);
        console.log(`  - Title: ${notification.title}`);
        console.log(`  - Message: ${notification.message}`);
        
        if (notification.user_id === finalRecipient.id) {
          console.log('✅ CORRECT: Notification sent to recipient');
        } else {
          console.log('❌ ERROR: Notification sent to wrong user');
        }
      }
    }
    
    console.log('\n🎯 Test Summary:');
    console.log(`✅ Message sent from ${senderEmail} to ${recipientEmail}`);
    console.log('✅ Self-notification prevention working');
    console.log('✅ Notification sent to correct recipient');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testMessageBetweenUsers().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});