import { supabase } from './supabase';
import { ChatMessage, LiveChatMessage, ChatParticipant, Chat, UserChat } from '@/types/chat';

export { ChatMessage, LiveChatMessage, ChatParticipant, Chat, UserChat };

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
      // Validate input parameters
      if (!participantId || !currentUserId || participantId.trim() === '' || currentUserId.trim() === '') {
        console.error('Invalid participant or user ID provided');
        return null;
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(participantId) || !uuidRegex.test(currentUserId)) {
        console.error('Invalid UUID format for participant or user ID');
        return null;
      }

      // Check if chat already exists between these users using the chats table structure
      const { data: existingChat, error: existingChatError } = await supabase
        .from('chats')
        .select('*')
        .or(`and(participant1_id.eq.${currentUserId},participant2_id.eq.${participantId}),and(participant1_id.eq.${participantId},participant2_id.eq.${currentUserId})`)
        .single();

      if (existingChat && !existingChatError) {
        return existingChat as Chat;
      }

      // Create new chat with required participant fields
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          participant1_id: currentUserId,
          participant2_id: participantId
        })
        .select()
        .single();

      if (createError || !newChat) {
        throw createError;
      }

      // Add participants to chat_participants table for compatibility
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert([
          { chat_id: newChat.id, user_id: currentUserId, is_blocked: false },
          { chat_id: newChat.id, user_id: participantId, is_blocked: false }
        ]);

      if (participantsError) {
        console.warn('Warning: Could not add to chat_participants table:', participantsError);
        // Don't fail the chat creation if participants table insert fails
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

  async sendServiceMessage(
    chatId: string,
    senderId: string,
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
  ): Promise<LiveChatMessage | null> {
    try {
      const serviceMessage = `🛍️ Service: ${serviceData.title}\n💰 Price: ${serviceData.price} ${serviceData.currency}\n📝 ${serviceData.description}`;
      
      const messageData = {
        chat_id: chatId,
        sender_id: senderId,
        sender_name: senderName,
        sender_image: senderImage,
        message: serviceMessage,
        is_hidden: false,
        is_reported: false,
        service_id: serviceData.id,
        service_data: JSON.stringify(serviceData)
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
      console.error('Error sending service message:', error);
      return null;
    }
  }

  async createServiceOffer(
    chatId: string,
    serviceId: string,
    serviceProviderId: string,
    buyerId: string,
    serviceData: {
      id: string;
      title: string;
      description: string;
      price: number;
      currency: string;
      image_url?: string;
      category_name?: string;
      customPrice?: number;
      customDescription?: string;
      customDeliveryTime?: number;
      startDate?: string;
      endDate?: string;
      preferredStartTime?: string;
      preferredEndTime?: string;
      locationAddress?: string;
      urgencyLevel?: 'low' | 'medium' | 'high' | 'urgent';
      skillsRequired?: string[];
      workType?: 'remote' | 'on_site' | 'hybrid';
      estimatedHours?: number;
      requirements?: string;
    }
  ): Promise<{ offer: any; message: LiveChatMessage | null }> {
    try {
      // Create the service offer
      const { data: offer, error: offerError } = await supabase
        .from('service_offers')
        .insert({
          service_id: serviceId,
          service_provider_id: serviceProviderId,
          buyer_id: buyerId,
          chat_id: chatId,
          original_price: serviceData.price,
          custom_price: serviceData.customPrice || serviceData.price,
          custom_description: serviceData.customDescription,
          custom_delivery_time: serviceData.customDeliveryTime,
          status: 'pending',
          start_date: serviceData.startDate,
          end_date: serviceData.endDate,
          preferred_start_time: serviceData.preferredStartTime,
          preferred_end_time: serviceData.preferredEndTime,
          location_address: serviceData.locationAddress,
          urgency_level: serviceData.urgencyLevel,
          skills_required: serviceData.skillsRequired,
          work_type: serviceData.workType,
          estimated_hours: serviceData.estimatedHours,
          requirements: serviceData.requirements
        })
        .select()
        .single();

      if (offerError) {
        throw offerError;
      }

      // Send a message about the offer
      let offerMessage = `📋 Service Offer\n🛍️ ${serviceData.title}\n💰 Price: ${serviceData.customPrice || serviceData.price} ${serviceData.currency}`;
      
      if (serviceData.customDescription) {
        offerMessage += `\n📝 Custom: ${serviceData.customDescription}`;
      }
      
      if (serviceData.customDeliveryTime) {
        offerMessage += `\n⏰ Delivery: ${serviceData.customDeliveryTime} days`;
      }
      
      // Add hustle job attributes
      if (serviceData.startDate) {
        offerMessage += `\n📅 Start Date: ${serviceData.startDate}`;
      }
      
      if (serviceData.endDate) {
        offerMessage += `\n📅 End Date: ${serviceData.endDate}`;
      }
      
      if (serviceData.preferredStartTime) {
        offerMessage += `\n🕐 Start Time: ${serviceData.preferredStartTime}`;
      }
      
      if (serviceData.preferredEndTime) {
        offerMessage += `\n🕐 End Time: ${serviceData.preferredEndTime}`;
      }
      
      if (serviceData.locationAddress) {
        offerMessage += `\n📍 Location: ${serviceData.locationAddress}`;
      }
      
      if (serviceData.workType) {
        const workTypeDisplay = serviceData.workType === 'on_site' ? 'On-site' : serviceData.workType.charAt(0).toUpperCase() + serviceData.workType.slice(1);
        offerMessage += `\n💼 Work Type: ${workTypeDisplay}`;
      }
      
      if (serviceData.urgencyLevel) {
        offerMessage += `\n⚡ Urgency: ${serviceData.urgencyLevel.charAt(0).toUpperCase() + serviceData.urgencyLevel.slice(1)}`;
      }
      
      if (serviceData.estimatedHours) {
        offerMessage += `\n⏱️ Estimated Hours: ${serviceData.estimatedHours}`;
      }
      
      if (serviceData.skillsRequired && serviceData.skillsRequired.length > 0) {
        offerMessage += `\n🛠️ Skills: ${serviceData.skillsRequired.join(', ')}`;
      }
      
      if (serviceData.requirements) {
        offerMessage += `\n📋 Requirements: ${serviceData.requirements}`;
      }
      
      const messageData = {
        chat_id: chatId,
        sender_id: serviceProviderId,
        sender_name: 'Service Offer',
        sender_image: '',
        message: offerMessage,
        is_hidden: false,
        is_reported: false,
        service_id: serviceId,
        offer_id: offer.id,
        service_data: JSON.stringify(serviceData)
      };

      const { data: messageResult, error: messageError } = await supabase
        .from('chat_messages')
        .insert(messageData)
        .select()
        .single();

      if (messageError) {
        console.warn('Error sending offer message:', messageError);
      }

      // Update chat's last message timestamp
      await supabase
        .from('chats')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', chatId);

      return {
        offer,
        message: messageResult ? this.transformMessage(messageResult) : null
      };
    } catch (error) {
      console.error('Error creating service offer:', error);
      throw error;
    }
  }

  async updateServiceOffer(
    offerId: string,
    updates: {
      customPrice?: number;
      customDescription?: string;
      customDeliveryTime?: number;
    }
  ): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('service_offers')
        .update({
          custom_price: updates.customPrice,
          custom_description: updates.customDescription,
          custom_delivery_time: updates.customDeliveryTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', offerId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating service offer:', error);
      throw error;
    }
  }

  async acceptServiceOffer(offerId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('service_offers')
        .update({
          status: 'in_progress',
          accepted_at: new Date().toISOString()
        })
        .eq('id', offerId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Also update the corresponding chat message
      await supabase
        .from('chat_messages')
        .update({ offer_status: 'in_progress' })
        .eq('offer_id', offerId);

      return data;
    } catch (error) {
      console.error('Error accepting service offer:', error);
      throw error;
    }
  }

  async rejectServiceOffer(offerId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('service_offers')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString()
        })
        .eq('id', offerId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Also update the corresponding chat message
      await supabase
        .from('chat_messages')
        .update({ offer_status: 'rejected' })
        .eq('offer_id', offerId);

      return data;
    } catch (error) {
      console.error('Error rejecting service offer:', error);
      throw error;
    }
  }

  async getUserChats(userId: string): Promise<UserChat[]> {
    try {
      // Validate userId
      if (!userId || userId.trim() === '') {
        console.error('Invalid user ID provided');
        return [];
      }

      // Get chats where user is either participant1 or participant2
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select(`
          id,
          participant1_id,
          participant2_id,
          created_at,
          last_message_at
        `)
        .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      if (chatsError) {
        throw chatsError;
      }

      if (!chatsData || chatsData.length === 0) {
        return [];
      }

      // Get other participants' profile information
      const otherParticipantIds = chatsData.map((chat: any) => 
        chat.participant1_id === userId ? chat.participant2_id : chat.participant1_id
      );

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', otherParticipantIds);

      if (profilesError) {
        console.warn('Error fetching participant profiles:', profilesError);
      }

      // Transform the data to get chat info with other participant details
      const chats = chatsData.map((chat: any) => {
        const otherParticipantId = chat.participant1_id === userId ? chat.participant2_id : chat.participant1_id;
        const otherParticipant = profilesData?.find((p: any) => p.id === otherParticipantId);
        
        return {
          id: chat.id,
          participantId: otherParticipantId,
          participantName: otherParticipant?.full_name || 'Unknown User',
          participantImage: otherParticipant?.avatar_url || '',
          lastMessageAt: chat.last_message_at,
          createdAt: chat.created_at,
        };
      });

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
    let serviceData = null;
    if (dbMessage.service_data) {
      try {
        serviceData = JSON.parse(dbMessage.service_data);
      } catch (error) {
        console.error('Error parsing service data:', error);
      }
    }

    return {
      id: dbMessage.id,
      chatId: dbMessage.chat_id,
      senderId: dbMessage.sender_id,
      senderName: dbMessage.sender_name || 'Unknown',
      senderImage: dbMessage.sender_image || '',
      content: dbMessage.content || dbMessage.message || '',
      timestamp: new Date(dbMessage.created_at),
      isRead: dbMessage.is_read || false,
      messageType: dbMessage.message_type || 'text',
      serviceData,
      offerId: dbMessage.offer_id,
      offerStatus: dbMessage.offer_status,
      offerExpiresAt: dbMessage.offer_expires_at ? new Date(dbMessage.offer_expires_at) : undefined,
    };
  }

  async getChatParticipant(participantId: string): Promise<{ name: string; image: string; isOnline: boolean } | null> {
    try {
      // Validate participantId
      if (!participantId || participantId.trim() === '') {
        console.error('Invalid participant ID provided');
        return null;
      }

      // Fetch participant profile from profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', participantId)
        .single();

      if (error || !profile) {
        console.error('Error fetching participant profile:', error);
        return {
          name: 'Unknown User',
          image: '',
          isOnline: false
        };
      }

      return {
        name: profile.full_name || 'Unknown User',
        image: profile.avatar_url || '',
        isOnline: false // TODO: Implement online status tracking
      };
    } catch (error) {
      console.error('Error fetching chat participant:', error);
      return {
        name: 'Unknown User',
        image: '',
        isOnline: false
      };
    }
  }

  cleanup(): void {
    this.messageSubscriptions.forEach(unsubscribe => unsubscribe());
    this.messageSubscriptions.clear();
  }
}

export const chatService = ChatService.getInstance();