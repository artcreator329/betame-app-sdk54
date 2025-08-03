import Ably from 'ably';
import { ChatMessage, LiveChatMessage, ChatParticipant, Chat, UserChat } from '@/types/chat';
import { supabase } from './supabase';

export class AblyChatService {
  private static instance: AblyChatService;
  private ably: Ably.Realtime;
  private channels = new Map<string, Ably.RealtimeChannel>();
  private messageSubscriptions = new Map<string, () => void>();

  private constructor() {
    // Initialize Ably with the provided API key
    this.ably = new Ably.Realtime({
      key: 'OWwkcg.VYKhLw:Tb_vK_Iorkjce_NmYoTWYa2ebVZW10UXttuNxznt0DA',
      clientId: 'betame-app-client',
    });

    // Handle connection state changes
    this.ably.connection.on('connected', () => {
      console.log('Ably connected successfully');
    });

    this.ably.connection.on('failed', (error) => {
      console.error('Ably connection failed:', error);
    });

    this.ably.connection.on('disconnected', () => {
      console.log('Ably disconnected');
    });
  }

  static getInstance(): AblyChatService {
    if (!AblyChatService.instance) {
      AblyChatService.instance = new AblyChatService();
    }
    return AblyChatService.instance;
  }

  // Content moderation patterns (same as original)
  private contactPatterns = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
    /\b(?:whatsapp|telegram|wechat|line|instagram|facebook|twitter|snapchat)\b/gi, // Social media platforms
    /\b(?:call me|text me|dm me|contact me at)\b/gi, // Contact requests
    /\b(?:my number is|my phone is|my email is)\b/gi, // Personal info sharing
    /\b(?:meet me at|let's meet|come to my place)\b/gi, // Meeting requests
  ];

  private moderateMessage(messageText: string): { isHidden: boolean; moderationReason?: string } {
    for (const pattern of this.contactPatterns) {
      if (pattern.test(messageText)) {
        return {
          isHidden: true,
          moderationReason: 'Message contains personal contact information and has been hidden for safety.'
        };
      }
    }
    return { isHidden: false };
  }

  private getChannel(chatId: string): Ably.RealtimeChannel {
    if (!this.channels.has(chatId)) {
      const channel = this.ably.channels.get(`chat:${chatId}`);
      this.channels.set(chatId, channel);
    }
    return this.channels.get(chatId)!;
  }

  async createOrGetChat(participantId: string, currentUserId: string): Promise<Chat | null> {
    try {
      // Check if chat already exists between these users
      const { data: userChats, error: userChatsError } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', currentUserId);

      if (userChatsError || !userChats) {
        console.error('Error fetching user chats:', userChatsError);
      } else {
        // Check if any of these chats also include the other participant
        const chatIds = userChats.map(c => c.chat_id);
        if (chatIds.length > 0) {
          const { data: existingChat, error: existingChatError } = await supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('user_id', participantId)
            .in('chat_id', chatIds)
            .single();

          if (existingChat && !existingChatError) {
            // Found existing chat, return it with full details
            const { data: chatData, error: chatError } = await supabase
              .from('chats')
              .select(`
                *,
                chat_participants(
                  id,
                  user_id,
                  chat_id,
                  joined_at,
                  is_blocked
                )
              `)
              .eq('id', existingChat.chat_id)
              .single();

            if (chatData && !chatError) {
              return chatData as Chat;
            }
          }
        }
      }

      // Create new chat
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({})
        .select()
        .single();

      if (createError || !newChat) {
        throw createError;
      }

      // Add participants
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert([
          { chat_id: newChat.id, user_id: currentUserId, is_blocked: false },
          { chat_id: newChat.id, user_id: participantId, is_blocked: false }
        ]);

      if (participantsError) {
        throw participantsError;
      }

      return newChat as Chat;
    } catch (error) {
      console.error('Error creating/getting chat:', error);
      return null;
    }
  }

  async sendMessage(
    chatId: string,
    senderId: string,
    senderName: string,
    senderImage: string,
    message: string
  ): Promise<LiveChatMessage | null> {
    try {
      const moderation = this.moderateMessage(message);
      
      const messageData = {
        chat_id: chatId,
        sender_id: senderId,
        sender_name: senderName,
        sender_image: senderImage,
        message: message,
        is_hidden: moderation.isHidden,
        moderation_reason: moderation.moderationReason,
        is_reported: false,
      };

      // Save to Supabase
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update chat's last message timestamp
      await supabase
        .from('chats')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', chatId);

      const transformedMessage = this.transformMessage(data);

      // Publish to Ably channel for real-time delivery
      const channel = this.getChannel(chatId);
      await channel.publish('message', {
        type: 'new_message',
        data: transformedMessage
      });

      return transformedMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  async getUserChats(userId: string): Promise<UserChat[]> {
    try {
      // First get all chats for the user
      const { data: userChats, error: userChatsError } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', userId);

      if (userChatsError || !userChats) {
        throw userChatsError;
      }

      const chatIds = userChats.map(c => c.chat_id);
      if (chatIds.length === 0) {
        return [];
      }

      // Get chat details with participants
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select(`
          id,
          created_at,
          updated_at,
          last_message_at,
          chat_participants!inner (
            user_id,
            profiles!inner (
              id,
              full_name,
              avatar_url
            )
          )
        `)
        .in('id', chatIds)
        .order('last_message_at', { ascending: false });

      if (chatsError) {
        throw chatsError;
      }

      // Transform the data to get chat info with other participant details
      const chats = chatsData?.map((chat: any) => {
        const otherParticipant = chat.chat_participants.find(
          (p: any) => p.user_id !== userId
        );
        
        return {
          id: chat.id,
          participantId: otherParticipant?.user_id,
          participantName: otherParticipant?.profiles?.full_name || 'Unknown User',
          participantImage: otherParticipant?.profiles?.avatar_url || 'https://via.placeholder.com/50',
          lastMessageAt: chat.last_message_at,
          createdAt: chat.created_at,
        };
      }) || [];

      return chats;
    } catch (error) {
      console.error('Error fetching user chats:', error);
      return [];
    }
  }

  async getLastMessage(chatId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('message, is_hidden')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return 'No messages yet';
      }

      return data.is_hidden ? 'Message was moderated' : data.message;
    } catch (error) {
      return 'No messages yet';
    }
  }

  async getMessages(chatId: string, currentUserId: string): Promise<LiveChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      // Filter out messages from blocked users
      const { data: blockedUsers } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', chatId)
        .eq('is_blocked', true);

      const blockedUserIds = new Set(blockedUsers?.map(u => u.user_id) || []);

      return data
        .filter(msg => !blockedUserIds.has(msg.sender_id) || msg.sender_id === currentUserId)
        .map(this.transformMessage);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  subscribeToMessages(
    chatId: string,
    currentUserId: string,
    onMessage: (message: LiveChatMessage) => void,
    onDelete: (messageId: string) => void
  ): () => void {
    const channel = this.getChannel(chatId);

    // Subscribe to Ably channel for real-time messages
    const messageHandler = (message: Ably.Message) => {
      if (message.name === 'message' && message.data?.type === 'new_message') {
        onMessage(message.data.data);
      } else if (message.name === 'message' && message.data?.type === 'delete_message') {
        onDelete(message.data.messageId);
      }
    };

    channel.subscribe('message', messageHandler);

    // Also subscribe to presence events for typing indicators
    channel.presence.subscribe('enter', (member) => {
      console.log(`${member.clientId} entered the chat`);
    });

    channel.presence.subscribe('leave', (member) => {
      console.log(`${member.clientId} left the chat`);
    });

    const unsubscribe = () => {
      channel.unsubscribe('message', messageHandler);
      channel.presence.unsubscribe();
      this.channels.delete(chatId);
      this.messageSubscriptions.delete(chatId);
    };

    this.messageSubscriptions.set(chatId, unsubscribe);
    return unsubscribe;
  }

  // Typing indicators using Ably presence
  async startTyping(chatId: string, userId: string, userName: string): Promise<void> {
    try {
      const channel = this.getChannel(chatId);
      await channel.presence.enter({
        userId,
        userName,
        isTyping: true,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error starting typing indicator:', error);
    }
  }

  async stopTyping(chatId: string): Promise<void> {
    try {
      const channel = this.getChannel(chatId);
      await channel.presence.leave();
    } catch (error) {
      console.error('Error stopping typing indicator:', error);
    }
  }

  subscribeToTyping(
    chatId: string,
    currentUserId: string,
    onTypingChange: (typingUsers: { userId: string; userName: string }[]) => void
  ): () => void {
    const channel = this.getChannel(chatId);

    const updateTypingUsers = () => {
      channel.presence.get()
        .then((members: Ably.PresenceMessage[]) => {
          const typingUsers = members
            ?.filter((member: Ably.PresenceMessage) => 
              member.data?.isTyping && 
              member.data?.userId !== currentUserId &&
              Date.now() - member.data?.timestamp < 5000 // 5 second timeout
            )
            .map((member: Ably.PresenceMessage) => ({
              userId: member.data.userId,
              userName: member.data.userName
            })) || [];

          onTypingChange(typingUsers);
        })
        .catch((err: any) => {
          console.error('Error getting presence members:', err);
        });
    };

    channel.presence.subscribe('enter', updateTypingUsers);
    channel.presence.subscribe('update', updateTypingUsers);
    channel.presence.subscribe('leave', updateTypingUsers);

    const unsubscribe = () => {
      channel.presence.unsubscribe();
    };

    return unsubscribe;
  }

  async blockUser(chatId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_participants')
        .update({ is_blocked: true })
        .eq('chat_id', chatId)
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Error blocking user:', error);
      return false;
    }
  }

  async reportMessage(messageId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_reported: true })
        .eq('id', messageId);

      return !error;
    } catch (error) {
      console.error('Error reporting message:', error);
      return false;
    }
  }

  async reportUser(chatId: string, reportedUserId: string, reporterId: string, reason: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_reports')
        .insert({
          reported_user_id: reportedUserId,
          reporter_user_id: reporterId,
          chat_id: chatId,
          reason: reason,
          status: 'pending'
        });

      return !error;
    } catch (error) {
      console.error('Error reporting user:', error);
      return false;
    }
  }

  private transformMessage(dbMessage: any): LiveChatMessage {
    return {
      id: dbMessage.id,
      senderId: dbMessage.sender_id,
      senderName: dbMessage.sender_name,
      senderImage: dbMessage.sender_image,
      message: dbMessage.message,
      timestamp: dbMessage.created_at,
      isHidden: dbMessage.is_hidden,
      moderationReason: dbMessage.moderation_reason,
      isReported: dbMessage.is_reported,
      chatId: dbMessage.chat_id,
      createdAt: dbMessage.created_at,
      updatedAt: dbMessage.updated_at,
    };
  }

  // Connection status
  getConnectionStatus(): string {
    return this.ably.connection.state;
  }

  onConnectionStateChange(callback: (state: string) => void): () => void {
    const handler = (stateChange: Ably.ConnectionStateChange) => {
      callback(stateChange.current);
    };

    this.ably.connection.on(handler);

    return () => {
      this.ably.connection.off(handler);
    };
  }

  cleanup(): void {
    this.messageSubscriptions.forEach(unsubscribe => unsubscribe());
    this.messageSubscriptions.clear();
    this.channels.clear();
    this.ably.close();
  }
}

export const ablyChatService = AblyChatService.getInstance();