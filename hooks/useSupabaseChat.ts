import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseChatService } from '@/lib/supabase-chat-service';
import { supabase } from '@/lib/supabase';
import { LiveChatMessage } from '@/types/chat';

interface UseSupabaseChatProps {
  chatId: string;
  currentUserId: string;
  currentUserName: string;
}

export function useSupabaseChat({ chatId, currentUserId, currentUserName }: UseSupabaseChatProps) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string>('connected');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // REMOVED: No longer need to track recent actions since we removed the problematic refresh


  // Load initial messages
  useEffect(() => {
    if (!chatId || !currentUserId) {
      return;
    }

    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const chatMessages = await supabaseChatService.getChatMessages(chatId, currentUserId);
        setMessages(chatMessages);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [chatId, currentUserId]);

  // Subscribe to new messages
  useEffect(() => {
    console.log('🔄 useSupabaseChat: Subscription effect triggered with:', { chatId, currentUserId });
    
    if (!chatId || !currentUserId) {
      console.log('🔄 useSupabaseChat: Skipping subscription - missing chatId or currentUserId');
      return;
    }

    console.log('🔄 useSupabaseChat: Setting up subscription for chat:', chatId);

    const handleNewMessage = (message: LiveChatMessage) => {
      console.log('🔄 useSupabaseChat: Received new message:', message.id);
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const exists = prev.some(msg => msg.id === message.id);
        if (exists) {
          console.log('🔄 useSupabaseChat: Message already exists, skipping:', message.id);
          return prev;
        }
        console.log('🔄 useSupabaseChat: Adding new message to state:', message.id);
        return [...prev, message];
      });
    };

    const handleDeleteMessage = (messageId: string) => {
      console.log('🔄 useSupabaseChat: Deleting message:', messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    };

    const handleUpdateMessage = (updatedMessage: LiveChatMessage) => {
      console.log('🔄 useSupabaseChat: Handling message update:', updatedMessage);
      console.log('🔄 useSupabaseChat: Updated message offer status:', updatedMessage.offerStatus);
      setMessages(prev => {
        const updated = prev.map(msg => {
          if (msg.id === updatedMessage.id) {
            console.log('🔄 useSupabaseChat: Updating message:', {
              oldStatus: msg.offerStatus,
              newStatus: updatedMessage.offerStatus,
              messageId: msg.id,
              offerId: msg.offerId
            });
            return updatedMessage;
          }
          // Also check for offer ID match in case message ID doesn't match
          if (msg.offerId && updatedMessage.offerId && msg.offerId === updatedMessage.offerId) {
            console.log('🔄 useSupabaseChat: Updating message by offer ID:', {
              oldStatus: msg.offerStatus,
              newStatus: updatedMessage.offerStatus,
              messageId: msg.id,
              offerId: msg.offerId
            });
            return { ...msg, offerStatus: updatedMessage.offerStatus };
          }
          return msg;
        });
        return updated;
      });
    };

    unsubscribeMessagesRef.current = supabaseChatService.subscribeToMessages(
      chatId,
      currentUserId,
      handleNewMessage,
      handleDeleteMessage,
      handleUpdateMessage
    );

    console.log('🔄 useSupabaseChat: Subscription established for chat:', chatId);

    return () => {
      console.log('🔄 useSupabaseChat: Cleaning up subscription for chat:', chatId);
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current();
      }
    };
  }, [chatId, currentUserId]);

  // Function to update a specific message's offer status
  const updateMessageOfferStatus = useCallback((offerId: string, newStatus: string) => {
    console.log('🔄 useSupabaseChat: Updating offer status locally:', { offerId, newStatus });
    
    // Simple, direct status update - no complex tracking needed
    setMessages(prev => 
      prev.map(msg => 
        msg.offerId === offerId 
          ? { ...msg, offerStatus: newStatus }
          : msg
      )
    );
  }, []);

  // EMERGENCY: Force bilateral sync for critical offer status changes
  const forceBilateralSync = useCallback(async (offerId: string, newStatus: string) => {
    console.log('🚨 useSupabaseChat: EMERGENCY - Forcing bilateral sync:', { offerId, newStatus });
    
    try {
      // 1. Update local state immediately
      updateMessageOfferStatus(offerId, newStatus);
      
      // 2. Force database update with timestamp
      const { error: dbError } = await supabase
        .from('chat_messages')
        .update({ 
          offer_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('offer_id', offerId);
      
      if (dbError) {
        console.error('🚨 EMERGENCY: Database update failed:', dbError);
      } else {
        console.log('🚨 EMERGENCY: Database updated successfully');
      }
      
      // 3. Trigger realtime by updating message timestamps
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('offer_id', offerId);
      
      if (messages) {
        for (const msg of messages) {
          await supabase
            .from('chat_messages')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', msg.id);
        }
        console.log('🚨 EMERGENCY: Triggered realtime for', messages.length, 'messages');
      }
      
    } catch (error) {
      console.error('🚨 EMERGENCY: Bilateral sync failed:', error);
    }
  }, [updateMessageOfferStatus]);

  // REMOVED: The problematic refresh mechanism that was causing status reversions
  // Status updates now rely ONLY on realtime subscriptions and direct user actions

  // Send message function
  const sendMessage = useCallback(async (
    message: string,
    senderName: string,
    senderImage: string,
    quotedMessageId?: string,
    quotedMessageContent?: string,
    quotedMessageSenderName?: string,
    quotedMessageType?: 'text' | 'service' | 'offer'
  ): Promise<boolean> => {
    try {
      const sentMessage = await supabaseChatService.sendMessage(
        chatId,
        currentUserId,
        senderName,
        senderImage,
        message,
        quotedMessageId,
        quotedMessageContent,
        quotedMessageSenderName,
        quotedMessageType
      );
      return sentMessage !== null;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, [chatId, currentUserId]);

  // Send service message function
  const sendServiceMessage = useCallback(async (
    senderName: string,
    senderImage: string,
    serviceData: {
      id: string;
      title: string;
      description: string;
      price: number;
      currency: string;
      image_url?: string;
      category_name?: string;
    }
  ): Promise<boolean> => {
    try {
      const sentMessage = await supabaseChatService.sendServiceMessage(
        chatId,
        currentUserId,
        senderName,
        senderImage,
        serviceData
      );
      return sentMessage !== null;
    } catch (error) {
      console.error('Error sending service message:', error);
      return false;
    }
  }, [chatId, currentUserId]);

  // Typing indicators (simplified for Supabase)
  const startTyping = useCallback(() => {
    if (isTyping) return;
    setIsTyping(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  }, [isTyping]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
  }, []);

  // Block user function
  const blockUser = useCallback(async (
    blockedUserId: string
  ): Promise<boolean> => {
    try {
      return await supabaseChatService.blockUser(chatId, blockedUserId, currentUserId);
    } catch (error) {
      console.error('Error blocking user:', error);
      return false;
    }
  }, [chatId, currentUserId]);

  // Report message function
  const reportMessage = useCallback(async (
    messageId: string,
    reason: string
  ): Promise<boolean> => {
    try {
      return await supabaseChatService.reportMessage(messageId, currentUserId, reason);
    } catch (error) {
      console.error('Error reporting message:', error);
      return false;
    }
  }, [currentUserId]);

  // Report user function
  const reportUser = useCallback(async (
    reportedUserId: string,
    reason: string
  ): Promise<boolean> => {
    try {
      return await supabaseChatService.reportUser(chatId, reportedUserId, currentUserId, reason);
    } catch (error) {
      console.error('Error reporting user:', error);
      return false;
    }
  }, [chatId, currentUserId]);

  // Delete message function
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      return await supabaseChatService.deleteMessage(messageId, currentUserId);
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }, [currentUserId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    messages,
    isLoading,
    connectionStatus,
    typingUsers,
    isTyping,
    sendMessage,
    sendServiceMessage,
    startTyping,
    stopTyping,
    blockUser,
    reportMessage,
    reportUser,
    deleteMessage,
    updateMessageOfferStatus,
    forceBilateralSync,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    isDisconnected: connectionStatus === 'disconnected' || connectionStatus === 'failed',
    createServiceOffer: supabaseChatService.createServiceOffer.bind(supabaseChatService),
    updateServiceOffer: supabaseChatService.updateServiceOffer.bind(supabaseChatService),
    acceptServiceOffer: supabaseChatService.acceptServiceOffer.bind(supabaseChatService),
    rejectServiceOffer: supabaseChatService.rejectServiceOffer.bind(supabaseChatService),
    cancelServiceOffer: supabaseChatService.cancelServiceOffer.bind(supabaseChatService),
  };
}

// Hook for managing user chats list
export function useUserChats(userId: string, excludeChatId?: string) {
  const [chats, setChats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<(() => void) | null>(null);

  const loadChats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    // Don't load chats if userId is empty
    if (!userId || userId.trim() === '') {
      setChats([]);
      setIsLoading(false);
      return;
    }
    
    try {
      const userChats = await supabaseChatService.getUserChats(userId);
      
      // Fetch last message and unread count for each chat
      const chatsWithLastMessage = await Promise.all(
        userChats.map(async (chat) => {
          const [lastMessage, unreadCount] = await Promise.all([
            supabaseChatService.getLastMessage(chat.id),
            supabaseChatService.getUnreadMessageCount(chat.id, userId)
          ]);
          return {
            ...chat,
            lastMessage,
            unreadCount
          };
        })
      );
      
      // Sort chats by last message timestamp (most recent first)
      const sortedChats = chatsWithLastMessage.sort((a, b) => {
        // Use lastMessageAt from the chat record, fallback to createdAt
        const aTime = new Date(a.lastMessageAt || a.createdAt).getTime();
        const bTime = new Date(b.lastMessageAt || b.createdAt).getTime();
        return bTime - aTime; // Descending order (newest first)
      });
      
      setChats(sortedChats);
      return sortedChats;
    } catch (err) {
      console.error('Error loading chats:', err);
      setError('Failed to load chats');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Subscribe to real-time updates for user chats
  const subscribeToChats = useCallback(() => {
    if (!userId) return;

    const handleChatUpdate = async (chatId: string) => {
      // Skip if this is the excluded chat (currently active chat)
      if (excludeChatId && chatId === excludeChatId) {
        return;
      }

      // Reload the specific chat data
      try {
        const userChats = await supabaseChatService.getUserChats(userId);
        const updatedChat = userChats.find(chat => chat.id === chatId);
        
        if (updatedChat) {
          // updatedChat already has lastMessage and unreadCount from getUserChats
          const chatWithDetails = updatedChat;

          setChats(prev => {
            const existingIndex = prev.findIndex(chat => chat.id === chatId);
            if (existingIndex >= 0) {
              const newChats = [...prev];
              newChats[existingIndex] = chatWithDetails;
              return newChats.sort((a, b) => {
                const aTime = new Date(a.lastMessageAt || a.createdAt).getTime();
                const bTime = new Date(b.lastMessageAt || b.createdAt).getTime();
                return bTime - aTime; // Descending order (newest first)
              });
            } else {
              return [chatWithDetails, ...prev].sort((a, b) => {
                const aTime = new Date(a.lastMessageAt || a.createdAt).getTime();
                const bTime = new Date(b.lastMessageAt || b.createdAt).getTime();
                return bTime - aTime; // Descending order (newest first)
              });
            }
          });
        }
      } catch (error) {
        console.error('Error updating chat:', error);
      }
    };

    subscriptionRef.current = supabaseChatService.subscribeToUserChats(userId, handleChatUpdate);
  }, [userId, excludeChatId]);

  // Mark chat as read
  const markChatAsRead = useCallback(async (chatId: string) => {
    // Don't mark as read if userId is empty
    if (!userId || userId.trim() === '') {
      return;
    }
    
    try {
      await supabaseChatService.markMessagesAsRead(chatId, userId);
      
      // Update local state to reflect read status
      setChats(prev => 
        prev.map(chat => 
          chat.id === chatId 
            ? { ...chat, unreadCount: 0 }
            : chat
        )
      );
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  }, [userId]);

  // Load chats on mount and when userId changes
  useEffect(() => {
    if (userId) {
      loadChats().then(() => {
        subscribeToChats();
      });
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
      }
    };
  }, [userId, loadChats, subscribeToChats]);

  return {
    chats,
    isLoading,
    error,
    loadChats,
    markChatAsRead,
  };
}