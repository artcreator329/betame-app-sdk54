import { supabase } from './supabase';
import { ChatMessage } from '@/data/mockChatData';

export interface LiveChatMessage extends ChatMessage {
  isHidden?: boolean;
  moderationReason?: string;
  isReported?: boolean;
  chatId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatParticipant {
  id: string;
  userId: string;
  chatId: string;
  joinedAt: string;
  isBlocked: boolean;
}

export interface Chat {
  id: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  participants: ChatParticipant[];
}

export interface UserChat {
  id: string;
  participantId: string;
  participantName: string;
  participantImage: string;
  lastMessageAt: string | null;
  createdAt: string;
}

export class ChatService {
  private static instance: ChatService;
  private messageSubscriptions = new Map<string, () => void>();

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  // Content moderation patterns
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

  async createOrGetChat(participantId: string, currentUserId: string): Promise<Chat | null> {
    try {
      // Check if chat already exists between these users
      // First, get all chats where current user is a participant
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

      return this.transformMessage(data);
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
    const subscription = supabase
      .channel(`chat_${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const message = this.transformMessage(payload.new);
          onMessage(message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const message = this.transformMessage(payload.new);
          onMessage(message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          onDelete(payload.old.id);
        }
      )
      .subscribe();

    const unsubscribe = () => {
      supabase.removeChannel(subscription);
      this.messageSubscriptions.delete(chatId);
    };

    this.messageSubscriptions.set(chatId, unsubscribe);
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
      timestamp: new Date(dbMessage.created_at),
      isMe: false, // This will be set by the component
      isHidden: dbMessage.is_hidden,
      moderationReason: dbMessage.moderation_reason,
      isReported: dbMessage.is_reported,
      chatId: dbMessage.chat_id,
      createdAt: dbMessage.created_at,
      updatedAt: dbMessage.updated_at,
    };
  }

  cleanup(): void {
    this.messageSubscriptions.forEach(unsubscribe => unsubscribe());
    this.messageSubscriptions.clear();
  }
}

export const chatService = ChatService.getInstance();