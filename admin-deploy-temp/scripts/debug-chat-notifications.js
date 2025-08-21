#!/usr/bin/env node

/**
 * Debug script to test chat notification flow and identify self-notification bug
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function debugChatNotifications() {
  console.log('🔍 Debugging chat notification flow...');
  
  try {
    // Test scenario: Andriana sends a message to another user
    const andrianaUserId = 'test-andriana-id';
    const otherUserId = 'test-other-user-id';
    const chatId = 'test-chat-id';
    
    console.log('\n📋 Test scenario:');
    console.log('- Andriana (sender):', andrianaUserId);
    console.log('- Other user (recipient):', otherUserId);
    console.log('- Chat ID:', chatId);
    
    // Simulate the chat_participants query from the sendMessage function
    console.log('\n🔍 Testing chat_participants query...');
    console.log('Query: SELECT user_id FROM chat_participants WHERE chat_id = ? AND user_id != ?');
    console.log('Parameters:', { chatId, senderId: andrianaUserId });
    
    // This is the actual query from the sendMessage function
    const { data: participants, error } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('chat_id', chatId)
      .neq('user_id', andrianaUserId);
    
    console.log('Query result:', { participants, error });
    
    if (participants && participants.length > 0) {
      const otherParticipantId = participants[0].user_id;
      console.log('\n✅ Other participant found:', otherParticipantId);
      
      // Check if this would cause a self-notification
      if (otherParticipantId === andrianaUserId) {
        console.log('❌ BUG DETECTED: Other participant is the same as sender!');
        console.log('This would cause a self-notification.');
      } else {
        console.log('✅ No self-notification issue detected in this query.');
      }
      
      // Simulate the notification call
      console.log('\n📱 Simulating notification call:');
      console.log('notificationService.addChatNotification({');
      console.log('  participantId:', otherParticipantId, '(recipient)');
      console.log('  participantName: "Andriana Chua"');
      console.log('  senderId:', andrianaUserId, '(sender)');
      console.log('});');
      
      // Check the self-notification prevention logic
      if (andrianaUserId === otherParticipantId) {
        console.log('❌ SELF-NOTIFICATION DETECTED: senderId === participantId');
      } else {
        console.log('✅ Self-notification prevention would work correctly');
      }
    } else {
      console.log('❌ No other participants found - this might be the issue!');
    }
    
    // Let's also check what's actually in the chat_participants table
    console.log('\n🔍 Checking all chat_participants for this chat...');
    const { data: allParticipants, error: allError } = await supabase
      .from('chat_participants')
      .select('*')
      .eq('chat_id', chatId);
    
    console.log('All participants:', { allParticipants, allError });
    
    // Check if there might be duplicate entries or missing entries
    if (allParticipants) {
      const userIds = allParticipants.map(p => p.user_id);
      console.log('User IDs in chat:', userIds);
      
      if (userIds.length === 1) {
        console.log('❌ POTENTIAL ISSUE: Only one participant in chat');
      } else if (userIds.length > 2) {
        console.log('⚠️ WARNING: More than 2 participants in chat');
      } else {
        console.log('✅ Normal 2-participant chat');
      }
      
      // Check for duplicates
      const uniqueUserIds = [...new Set(userIds)];
      if (uniqueUserIds.length !== userIds.length) {
        console.log('❌ DUPLICATE PARTICIPANTS DETECTED');
      }
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

// Run the debug
debugChatNotifications().then(() => {
  console.log('\n🏁 Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});