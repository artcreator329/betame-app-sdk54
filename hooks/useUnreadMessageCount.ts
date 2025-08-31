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
        
        // Skip notification creation from unread count change
        // Notifications are handled by real-time message subscription below
        console.log('📊 Unread count increased from', previousCount, 'to', totalCount);
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
                console.log('🚨 MESSAGE IS FOR CURRENT USER - Message type:', payload.new.message_type);
                
                // For regular chat messages, notification is handled by SupabaseChatService.sendMessage()
                // But for offer messages, we need backup notification creation since primary might fail
                if (payload.new.message_type === 'offer') {
                  console.log('🔔 useUnreadMessageCount: Offer message detected, creating backup notification...');
                  
                  // Get participant info
                  const participant = await supabaseChatService.getParticipantById(payload.new.sender_id);
                  
                  if (participant) {
                    console.log('🔔 useUnreadMessageCount: Creating offer notification from:', participant.name);
                    await notificationService.addOfferNotification({
                      participantId: userId, // Send notification TO the current user
                      participantName: participant.name,
                      participantImage: participant.image,
                      chatId: payload.new.chat_id,
                      offerId: payload.new.offer_id || 'unknown',
                      serviceTitle: 'Service Offer', // We don't have full service data here
                      price: payload.new.custom_price || 0,
                      currency: 'USD',
                      senderId: payload.new.sender_id,
                      isIncoming: true,
                    });
                    console.log('✅ useUnreadMessageCount: Offer notification created successfully');
                  }
                } else {
                  // For regular chat messages, notification is handled by sender
                  console.log('🔔 useUnreadMessageCount: Regular message, notification handled by sender');
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