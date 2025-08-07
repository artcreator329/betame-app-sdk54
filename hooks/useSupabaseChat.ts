import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseChatService } from '@/lib/supabase-chat-service';
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
    if (!chatId || !currentUserId) {
      return;
    }

    const handleNewMessage = (message: LiveChatMessage) => {
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const exists = prev.some(msg => msg.id === message.id);
        if (exists) {
          return prev;
        }
        return [...prev, message];
      });
    };

    const handleDeleteMessage = (messageId: string) => {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    };

    const handleUpdateMessage = (updatedMessage: LiveChatMessage) => {
      console.log('🔄 useSupabaseChat: Handling message update:', updatedMessage);
      setMessages(prev => {
        const updated = prev.map(msg => {
          if (msg.id === updatedMessage.id) {
            console.log('🔄 useSupabaseChat: Updating message:', {
              oldStatus: msg.offerStatus,
              newStatus: updatedMessage.offerStatus,
              messageId: msg.id
            });
            return updatedMessage;
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

    return () => {
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current();
      }
    };
  }, [chatId, currentUserId]);

  // Send message function
  const sendMessage = useCallback(async (
    message: string,
    senderName: string,
    senderImage: string
  ): Promise<boolean> => {
    try {
      const sentMessage = await supabaseChatService.sendMessage(
        chatId,
        currentUserId,
        senderName,
        senderImage,
        message
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
      
      setChats(chatsWithLastMessage);
      return chatsWithLastMessage;
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
          const [lastMessage, unreadCount] = await Promise.all([
            supabaseChatService.getLastMessage(updatedChat.id),
            supabaseChatService.getUnreadMessageCount(updatedChat.id, userId)
          ]);
          
          const chatWithDetails = {
            ...updatedChat,
            lastMessage,
            unreadCount
          };

          setChats(prev => {
            const existingIndex = prev.findIndex(chat => chat.id === chatId);
            if (existingIndex >= 0) {
              const newChats = [...prev];
              newChats[existingIndex] = chatWithDetails;
              return newChats.sort((a, b) => 
                new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
              );
            } else {
              return [chatWithDetails, ...prev].sort((a, b) => 
                new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
              );
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