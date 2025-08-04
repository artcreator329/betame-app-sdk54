import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseChatService } from '@/lib/supabase-chat-service';
import { supabase } from '@/lib/supabase';
import { notificationService } from '@/lib/notification-service';

/**
 * Hook to track total unread message count across all user chats
 * Updates in real-time when new messages arrive
 */
export function useUnreadMessageCount() {
  const { user } = useAuth();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [previousCount, setPreviousCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setTotalUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Get all user chats
      const userChats = await supabaseChatService.getUserChats(user.id);
      
      // Get unread count for each chat and sum them up
      const unreadCounts = await Promise.all(
        userChats.map(chat => 
          supabaseChatService.getUnreadMessageCount(chat.id, user.id)
        )
      );
      
      const totalCount = unreadCounts.reduce((sum, count) => sum + count, 0);
      
      // If count increased, create notification for new messages
      if (totalCount > previousCount && previousCount > 0) {
        console.log('🚨🚨🚨 UNREAD COUNT INCREASED!!! Creating notification!');
        console.log('Previous count:', previousCount, 'New count:', totalCount);
        
        // Get the latest message from the most recent chat to create proper notification
        try {
          const recentChats = await Promise.all(
            userChats.map(async (chat) => {
              const lastMessage = await supabaseChatService.getLastMessage(chat.id);
              return { chat, lastMessage };
            })
          );
          
          // Find the most recent message
          const mostRecentChat = recentChats
            .filter(({ lastMessage }) => lastMessage)
            .sort((a, b) => new Date(b.lastMessage!.created_at).getTime() - new Date(a.lastMessage!.created_at).getTime())[0];
          
          if (mostRecentChat && mostRecentChat.lastMessage) {
            const { chat, lastMessage } = mostRecentChat;
            
            // Only create notification if the message is not from current user
            if (lastMessage.sender_id !== user.id) {
              console.log('🚨 Creating notification for message from:', lastMessage.sender_name);
              
              await notificationService.addChatNotification({
                participantId: lastMessage.sender_id,
                participantName: lastMessage.sender_name || 'Unknown User',
                participantImage: lastMessage.sender_image || 'https://via.placeholder.com/50',
                message: lastMessage.message,
                chatId: chat.id
              });
              
              console.log('🎉🎉🎉 NOTIFICATION CREATED FROM UNREAD COUNT CHANGE!!! 🎉🎉🎉');
            }
          }
        } catch (error) {
          console.error('❌ Error creating notification from unread count:', error);
        }
      }
      
      setPreviousCount(totalCount);
      setTotalUnreadCount(totalCount);
    } catch (error) {
      console.error('Error loading unread message count:', error);
      setTotalUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  // Subscribe to real-time message updates using Supabase realtime
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔔 Setting up unread message count subscription for user:', user.id);

    // Subscribe to chat_messages table changes
    const channel = supabase
      .channel(`unread_count:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          console.log('🚨🚨🚨 UNREAD COUNT HOOK: MESSAGE DETECTED!!! 🚨🚨🚨');
          console.log('Event type:', payload.eventType);
          console.log('Message data:', payload.new);
          
          // If this is a new message AND not from current user, create notification
          if (payload.eventType === 'INSERT' && payload.new.sender_id !== user?.id) {
            console.log('🚨 NEW INCOMING MESSAGE - CREATING NOTIFICATION NOW!');
            
            try {
              // Verify this message is for the current user
              const { data: chat } = await supabase
                .from('chats')
                .select('id')
                .eq('id', payload.new.chat_id)
                .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
                .single();

              if (chat) {
                console.log('🚨 MESSAGE IS FOR CURRENT USER - GETTING PARTICIPANT INFO');
                
                // Get participant info
                const participant = await supabaseChatService.getParticipantById(payload.new.sender_id);
                
                if (participant) {
                  console.log('🚨 CREATING NOTIFICATION FROM:', participant.name);
                  
                  await notificationService.addChatNotification({
                    participantId: payload.new.sender_id,
                    participantName: participant.name,
                    participantImage: participant.image,
                    message: payload.new.message,
                    chatId: payload.new.chat_id
                  });
                  
                  console.log('🎉🎉🎉 NOTIFICATION CREATED SUCCESSFULLY IN UNREAD HOOK!!! 🎉🎉🎉');
                } else {
                  console.log('❌ Could not get participant info');
                }
              } else {
                console.log('ℹ️ Message not for current user');
              }
            } catch (error) {
              console.error('❌ Error creating notification in unread hook:', error);
            }
          }
          
          // Reload unread count when messages change
          loadUnreadCount();
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
          console.log('🔔 Message read status changed, refreshing unread count:', payload);
          // Reload unread count when read status changes
          loadUnreadCount();
        }
      )
      .subscribe();

    return () => {
      console.log('🔔 Cleaning up unread message count subscription');
      channel.unsubscribe();
    };
  }, [user?.id, loadUnreadCount]);

  return {
    totalUnreadCount,
    isLoading,
    refresh: loadUnreadCount,
  };
}