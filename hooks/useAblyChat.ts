import { useState, useEffect, useCallback, useRef } from 'react';
import { ablyChatService } from '@/lib/ably-chat-service';
import { LiveChatMessage } from '@/types/chat';

interface UseAblyChatProps {
  chatId: string;
  currentUserId: string;
  currentUserName: string;
}

interface TypingUser {
  userId: string;
  userName: string;
}

export function useAblyChat({ chatId, currentUserId, currentUserName }: UseAblyChatProps) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null);
  const unsubscribeTypingRef = useRef<(() => void) | null>(null);
  const unsubscribeConnectionRef = useRef<(() => void) | null>(null);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const initialMessages = await ablyChatService.getMessages(chatId, currentUserId);
        setMessages(initialMessages);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [chatId, currentUserId]);

  // Subscribe to real-time messages
  useEffect(() => {
    const handleNewMessage = (message: LiveChatMessage) => {
      setMessages(prev => {
        // Avoid duplicates
        const exists = prev.some(msg => msg.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });
    };

    const handleDeleteMessage = (messageId: string) => {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    };

    unsubscribeMessagesRef.current = ablyChatService.subscribeToMessages(
      chatId,
      currentUserId,
      handleNewMessage,
      handleDeleteMessage
    );

    return () => {
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current();
      }
    };
  }, [chatId, currentUserId]);

  // Subscribe to typing indicators
  useEffect(() => {
    unsubscribeTypingRef.current = ablyChatService.subscribeToTyping(
      chatId,
      currentUserId,
      setTypingUsers
    );

    return () => {
      if (unsubscribeTypingRef.current) {
        unsubscribeTypingRef.current();
      }
    };
  }, [chatId, currentUserId]);

  // Subscribe to connection status
  useEffect(() => {
    setConnectionStatus(ablyChatService.getConnectionStatus());
    
    unsubscribeConnectionRef.current = ablyChatService.onConnectionStateChange(
      setConnectionStatus
    );

    return () => {
      if (unsubscribeConnectionRef.current) {
        unsubscribeConnectionRef.current();
      }
    };
  }, []);

  // Send message function
  const sendMessage = useCallback(async (
    message: string,
    senderName: string,
    senderImage: string
  ): Promise<boolean> => {
    try {
      const sentMessage = await ablyChatService.sendMessage(
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

  // Start typing indicator
  const startTyping = useCallback(async () => {
    if (!isTyping) {
      setIsTyping(true);
      await ablyChatService.startTyping(chatId, currentUserId, currentUserName);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [chatId, currentUserId, currentUserName, isTyping]);

  // Stop typing indicator
  const stopTyping = useCallback(async () => {
    if (isTyping) {
      setIsTyping(false);
      await ablyChatService.stopTyping(chatId);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [chatId, isTyping]);

  // Block user function
  const blockUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      return await ablyChatService.blockUser(chatId, userId);
    } catch (error) {
      console.error('Error blocking user:', error);
      return false;
    }
  }, [chatId]);

  // Report message function
  const reportMessage = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      return await ablyChatService.reportMessage(messageId);
    } catch (error) {
      console.error('Error reporting message:', error);
      return false;
    }
  }, []);

  // Report user function
  const reportUser = useCallback(async (
    reportedUserId: string,
    reason: string
  ): Promise<boolean> => {
    try {
      return await ablyChatService.reportUser(chatId, reportedUserId, currentUserId, reason);
    } catch (error) {
      console.error('Error reporting user:', error);
      return false;
    }
  }, [chatId, currentUserId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping();
    };
  }, [stopTyping]);

  return {
    messages,
    isLoading,
    connectionStatus,
    typingUsers,
    isTyping,
    sendMessage,
    startTyping,
    stopTyping,
    blockUser,
    reportMessage,
    reportUser,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    isDisconnected: connectionStatus === 'disconnected' || connectionStatus === 'failed',
  };
}

// Hook for managing user chats list
export function useUserChats(userId: string) {
  const [chats, setChats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userChats = await ablyChatService.getUserChats(userId);
      setChats(userChats);
    } catch (err) {
      console.error('Error loading chats:', err);
      setError('Failed to load chats');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const createOrGetChat = useCallback(async (participantId: string) => {
    try {
      const chat = await ablyChatService.createOrGetChat(participantId, userId);
      if (chat) {
        // Refresh the chats list
        await loadChats();
      }
      return chat;
    } catch (error) {
      console.error('Error creating/getting chat:', error);
      return null;
    }
  }, [userId, loadChats]);

  return {
    chats,
    isLoading,
    error,
    loadChats,
    createOrGetChat,
  };
}