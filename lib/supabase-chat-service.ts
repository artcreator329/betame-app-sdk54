import { ChatMessage, LiveChatMessage, ChatParticipant, Chat, UserChat } from '@/types/chat';
import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { notificationService } from './notification-service';

export class SupabaseChatService {
  private static instance: SupabaseChatService;
  private channels = new Map<string, RealtimeChannel>();
  private messageSubscriptions = new Map<string, () => void>();

  private constructor() {
    console.log('✅ Supabase Chat Service initialized');
  }

  static getInstance(): SupabaseChatService {
    if (!SupabaseChatService.instance) {
      SupabaseChatService.instance = new SupabaseChatService();
    }
    return SupabaseChatService.instance;
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

  private spamPatterns = [
    /\b(?:buy now|click here|limited time|act now|urgent|free money|make money fast)\b/gi,
    /\b(?:viagra|cialis|pharmacy|pills)\b/gi,
    /\$\d+.*(?:guaranteed|easy|fast|quick)/gi,
  ];

  private offensivePatterns = [
    // Add your offensive word patterns here
    /\b(?:spam|scam|fake)\b/gi,
  ];

  private moderateMessage(message: string): { isHidden: boolean; moderationReason: string | null } {
    const lowerMessage = message.toLowerCase();
    
    // Check for contact information
    for (const pattern of this.contactPatterns) {
      if (pattern.test(message)) {
        return {
          isHidden: true,
          moderationReason: 'Contains contact information. Please use the platform for communication.'
        };
      }
    }

    // Check for spam
    for (const pattern of this.spamPatterns) {
      if (pattern.test(message)) {
        return {
          isHidden: true,
          moderationReason: 'Message flagged as potential spam.'
        };
      }
    }

    // Check for offensive content
    for (const pattern of this.offensivePatterns) {
      if (pattern.test(message)) {
        return {
          isHidden: true,
          moderationReason: 'Message contains inappropriate content.'
        };
      }
    }

    return { isHidden: false, moderationReason: null };
  }

  private async transformMessage(dbMessage: any, currentUserId: string): Promise<LiveChatMessage> {
    // Build serviceData from individual columns if it's a service/offer message
    let serviceData = undefined;
    // Track latest offer status from the canonical table
    let latestOfferStatus: string | undefined = undefined;
    if (dbMessage.message_type === 'service' || dbMessage.message_type === 'offer') {
      // Try to get the actual service data from service_offers table
      if (dbMessage.offer_id) {
        try {
          console.log('🔍 SupabaseChatService: Looking up service offer with ID:', dbMessage.offer_id);
          
          // Debug: Check what's actually in the service_offers table
          await this.debugServiceOffer(dbMessage.offer_id);
          
          const { data: offerData, error: offerError } = await supabase
            .from('service_offers')
            .select('*')
            .eq('id', dbMessage.offer_id)
            .maybeSingle();
          
          console.log('🔍 SupabaseChatService: Offer lookup query for ID:', dbMessage.offer_id);
          console.log('🔍 SupabaseChatService: Offer lookup result:', { offerData, offerError });
          
            if (offerData) {
              // Capture latest status from the canonical offers table
              latestOfferStatus = offerData.status;
              console.log('🔍 SupabaseChatService: Found offer data with hustle fields:', {
                start_date: offerData.start_date,
                end_date: offerData.end_date,
                preferred_start_time: offerData.preferred_start_time,
                preferred_end_time: offerData.preferred_end_time,
                location_address: offerData.location_address,
                urgency_level: offerData.urgency_level,
                work_type: offerData.work_type,
                estimated_hours: offerData.estimated_hours,
                requirements: offerData.requirements,
              });
              // Check if this offer references an existing service
              if (offerData.service_id) {
              // This is an offer for an existing service (with or without customizations)
              serviceData = {
                id: offerData.service_id,
                title: offerData.custom_description || 'Service Offer',
                description: offerData.custom_description || '',
                price: offerData.custom_price || offerData.original_price || 0,
                currency: 'USD',
                image_url: undefined,
                category_name: 'Service Offer',
                customPrice: offerData.custom_price,
                customDescription: offerData.custom_description,
                customDeliveryTime: offerData.custom_delivery_time,
                isCustomOffer: true, // Flag if any customizations exist
                // Hustle job attributes
                startDate: offerData.start_date,
                endDate: offerData.end_date,
                preferredStartTime: offerData.preferred_start_time,
                preferredEndTime: offerData.preferred_end_time,
                locationAddress: offerData.location_address,
                urgencyLevel: offerData.urgency_level,
                skillsRequired: offerData.skills_required,
                workType: offerData.work_type,
                estimatedHours: offerData.estimated_hours,
                requirements: offerData.requirements,
              };
              console.log('🔍 SupabaseChatService: Service data constructed from existing service:', serviceData);
              console.log('🔍 SupabaseChatService: Hustle job fields from offerData:', {
                start_date: offerData.start_date,
                end_date: offerData.end_date,
                preferred_start_time: offerData.preferred_start_time,
                preferred_end_time: offerData.preferred_end_time,
                location_address: offerData.location_address,
                urgency_level: offerData.urgency_level,
                work_type: offerData.work_type,
                estimated_hours: offerData.estimated_hours,
                requirements: offerData.requirements,
              });
            } else {
              // This is a custom offer with no service reference (shouldn't happen in normal flow)
              serviceData = {
                id: `custom-offer-${offerData.id}`, // Use a custom ID for custom offers
                title: offerData.custom_description || 'Custom Service Offer',
                description: offerData.custom_description || 'Custom service offer',
                price: offerData.custom_price || offerData.original_price || 0,
                currency: 'USD',
                image_url: undefined, // No image for custom offers
                category_name: 'Custom Offer',
                customPrice: offerData.custom_price,
                customDescription: offerData.custom_description,
                customDeliveryTime: offerData.custom_delivery_time,
                isCustomOffer: true, // Flag to indicate this is a custom offer
                // Hustle job attributes
                startDate: offerData.start_date,
                endDate: offerData.end_date,
                preferredStartTime: offerData.preferred_start_time,
                preferredEndTime: offerData.preferred_end_time,
                locationAddress: offerData.location_address,
                urgencyLevel: offerData.urgency_level,
                skillsRequired: offerData.skills_required,
                workType: offerData.work_type,
                estimatedHours: offerData.estimated_hours,
                requirements: offerData.requirements,
              };
              console.log('🔍 SupabaseChatService: Custom offer data constructed:', serviceData);
            }
          }
        } catch (error) {
          console.error('Error fetching service data:', error);
        }
      }
      
      // Fallback to constructing from message data if service lookup fails
      if (!serviceData) {
        console.log('🔍 SupabaseChatService: Using fallback service data construction');
        console.log('🔍 SupabaseChatService: Message data for fallback:', {
          id: dbMessage.id,
          custom_description: dbMessage.custom_description,
          custom_price: dbMessage.custom_price,
          custom_delivery_time: dbMessage.custom_delivery_time,
          offer_id: dbMessage.offer_id
        });
        serviceData = {
          id: `fallback-${dbMessage.id}`, // Use a fallback ID
          title: dbMessage.custom_description || 'Service Offer',
          description: dbMessage.custom_description || '',
          price: dbMessage.custom_price || 0,
          currency: 'USD',
          customPrice: dbMessage.custom_price,
          customDescription: dbMessage.custom_description,
          customDeliveryTime: dbMessage.custom_delivery_time,
          isCustomOffer: true, // Flag to indicate this is a custom offer
          // Hustle job attributes (fallback to undefined)
          startDate: undefined,
          endDate: undefined,
          preferredStartTime: undefined,
          preferredEndTime: undefined,
          locationAddress: undefined,
          urgencyLevel: undefined,
          skillsRequired: undefined,
          workType: undefined,
          estimatedHours: undefined,
          requirements: undefined,
        };
        console.log('🔍 SupabaseChatService: Fallback service data constructed:', serviceData);
      }
    }

    return {
      id: dbMessage.id,
      chatId: dbMessage.chat_id,
      senderId: dbMessage.sender_id,
      senderName: dbMessage.sender_name,
      senderImage: dbMessage.sender_image,
      content: dbMessage.message,
      timestamp: new Date(dbMessage.created_at),
      isRead: true, // Assume read for now
      messageType: dbMessage.message_type || 'text',
      serviceData: serviceData,
      offerId: dbMessage.offer_id,
      offerStatus: (latestOfferStatus as any) || dbMessage.offer_status,
      offerExpiresAt: dbMessage.offer_expires_at ? new Date(dbMessage.offer_expires_at) : undefined,
    };
  }

  async createOrGetChat(participantId: string, currentUserId: string): Promise<Chat | null> {
    try {
      // Check if chat already exists between these users
      console.log('🔍 Looking for existing chat between:', currentUserId, 'and', participantId);
      const { data: existingChats, error: searchError } = await supabase
        .from('chats')
        .select('*')
        .or(`and(participant1_id.eq.${currentUserId},participant2_id.eq.${participantId}),and(participant1_id.eq.${participantId},participant2_id.eq.${currentUserId})`);

      const existingChat = existingChats && existingChats.length > 0 ? existingChats[0] : null;
      console.log('🔍 Found existing chat:', existingChat);

      if (existingChat) {
        console.log('✅ Using existing chat:', existingChat.id);
        // Ensure participants exist in chat_participants table for existing chat
        const { data: existingParticipants } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('chat_id', existingChat.id);

        const participantIds = existingParticipants?.map(p => p.user_id) || [];
        const missingParticipants = [];

        if (!participantIds.includes(currentUserId)) {
          missingParticipants.push({
            chat_id: existingChat.id,
            user_id: currentUserId,
            joined_at: new Date().toISOString(),
            is_blocked: false
          });
        }

        if (!participantIds.includes(participantId)) {
          missingParticipants.push({
            chat_id: existingChat.id,
            user_id: participantId,
            joined_at: new Date().toISOString(),
            is_blocked: false
          });
        }

        if (missingParticipants.length > 0) {
          try {
            await supabase
              .from('chat_participants')
              .upsert(missingParticipants, { 
                onConflict: 'chat_id,user_id',
                ignoreDuplicates: true 
              });
          } catch (insertError) {
            console.error('Error upserting missing chat participants:', insertError);
          }
        }

        return existingChat;
      }

      // Create new chat
      console.log('🆕 Creating new chat between:', currentUserId, 'and', participantId);
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          participant1_id: currentUserId,
          participant2_id: participantId,
          service_id: null,
          service_title: null
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Insert both participants into chat_participants table
      const participantsData = [
        {
          chat_id: newChat.id,
          user_id: currentUserId,
          joined_at: new Date().toISOString(),
          is_blocked: false
        },
        {
          chat_id: newChat.id,
          user_id: participantId,
          joined_at: new Date().toISOString(),
          is_blocked: false
        }
      ];

      try {
        await supabase
          .from('chat_participants')
          .upsert(participantsData, { 
            onConflict: 'chat_id,user_id',
            ignoreDuplicates: true 
          });
      } catch (participantsError) {
        console.error('Error upserting chat participants:', participantsError);
        // Don't throw here as the chat was created successfully
      }

      return newChat;
    } catch (error) {
      console.error('Error creating/getting chat:', error);
      return null;
    }
  }

  async getChatMessages(chatId: string, currentUserId: string, limit: number = 50): Promise<LiveChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      const transformedMessages = await Promise.all(
        data.map(msg => this.transformMessage(msg, currentUserId))
      );
      return transformedMessages.reverse();
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      return [];
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

      const transformedMessage = await this.transformMessage(data, senderId);

      // Add notification for the other participant (only if message is not hidden)
      if (!moderation.isHidden) {
        try {
          // Get the other participant in the chat
          const { data: participants } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_id', chatId)
            .neq('user_id', senderId);

          if (participants && participants.length > 0) {
            const otherParticipantId = participants[0].user_id;
            
            // Add notification for incoming message (to the recipient)
            await notificationService.addChatNotification({
              participantId: otherParticipantId, // Send notification TO the other participant
              participantName: senderName, // FROM the sender
              participantImage: senderImage,
              message: message,
              chatId: chatId,
              senderId: senderId, // Add sender ID for navigation
            });
          }
        } catch (notificationError) {
          console.error('Error adding chat notification:', notificationError);
          // Don't fail the message sending if notification fails
        }
      }

      console.log('✅ Message sent successfully:', transformedMessage.id);
      return transformedMessage;
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
      customPrice?: number;
      customDescription?: string;
      customDeliveryTime?: number;
      // Hustle job attributes
      startDate?: string;
      endDate?: string;
      preferredStartTime?: string;
      preferredEndTime?: string;
      locationAddress?: string;
      urgencyLevel?: 'low' | 'medium' | 'high' | 'urgent';
      workType?: 'remote' | 'on_site' | 'hybrid';
      estimatedHours?: number;
      requirements?: string;
    }
  ): Promise<LiveChatMessage | null> {
    try {
      // Validate service ID
      if (!serviceData.id || serviceData.id.trim() === '') {
        console.error('Error: Service ID is empty or invalid');
        throw new Error('Service ID is required');
      }

      // Validate required UUID fields
      if (!chatId || chatId.trim() === '') {
        console.error('Error: Chat ID is empty or invalid');
        throw new Error('Chat ID is required');
      }

      if (!senderId || senderId.trim() === '') {
        console.error('Error: Sender ID is empty or invalid');
        throw new Error('Sender ID is required');
      }

      // Get the other participant in the chat (the buyer)
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('participant1_id, participant2_id')
        .eq('id', chatId)
        .single();

      if (chatError) {
        console.error('Error fetching chat data:', chatError);
        throw chatError;
      }

      // Determine buyer_id (the other participant, not the sender)
      const buyerId = chatData.participant1_id === senderId 
        ? chatData.participant2_id 
        : chatData.participant1_id;

      console.log('🔍 SupabaseChatService: Chat participants:', { 
        participant1: chatData.participant1_id, 
        participant2: chatData.participant2_id,
        sender: senderId,
        buyer: buyerId 
      });

      // Create a service offer first
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

      const offerInsertData = {
        chat_id: chatId,
        service_id: serviceData.id, // Now we know this is not empty
        seller_id: senderId,
        buyer_id: buyerId, // Use the determined buyer ID
        original_price: serviceData.price,
        custom_price: serviceData.customPrice || serviceData.price,
        custom_description: serviceData.customDescription,
        custom_delivery_time: serviceData.customDeliveryTime,
        // Hustle job attributes
        start_date: serviceData.startDate,
        end_date: serviceData.endDate,
        preferred_start_time: serviceData.preferredStartTime,
        preferred_end_time: serviceData.preferredEndTime,
        location_address: serviceData.locationAddress,
        urgency_level: serviceData.urgencyLevel,
        work_type: serviceData.workType,
        estimated_hours: serviceData.estimatedHours,
        requirements: serviceData.requirements,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      };

      console.log('🔍 SupabaseChatService: Inserting service offer with data:', offerInsertData);
      console.log('🔍 SupabaseChatService: Hustle job fields being stored:', {
        start_date: serviceData.startDate,
        end_date: serviceData.endDate,
        preferred_start_time: serviceData.preferredStartTime,
        preferred_end_time: serviceData.preferredEndTime,
        location_address: serviceData.locationAddress,
        urgency_level: serviceData.urgencyLevel,
        work_type: serviceData.workType,
        estimated_hours: serviceData.estimatedHours,
        requirements: serviceData.requirements,
      });

      const { data: offerData, error: offerError } = await supabase
        .from('service_offers')
        .insert(offerInsertData)
        .select()
        .single();

      if (offerError) {
        console.error('Error creating service offer:', offerError);
        throw offerError;
      }

      console.log('🔍 SupabaseChatService: Service offer created with service_id:', serviceData.id);
      console.log('🔍 SupabaseChatService: Offer data:', offerData);
      console.log('🔍 SupabaseChatService: Stored hustle job fields:', {
        start_date: offerData.start_date,
        end_date: offerData.end_date,
        preferred_start_time: offerData.preferred_start_time,
        preferred_end_time: offerData.preferred_end_time,
        location_address: offerData.location_address,
        urgency_level: offerData.urgency_level,
        work_type: offerData.work_type,
        estimated_hours: offerData.estimated_hours,
        requirements: offerData.requirements,
      });

      const messageText = `Shared a service: ${serviceData.title}`;
      
      const messageData = {
        chat_id: chatId,
        sender_id: senderId,
        sender_name: senderName,
        sender_image: senderImage,
        message: messageText,
        message_type: 'offer',
        offer_id: offerData.id,
        offer_status: 'pending',
        offer_expires_at: expiresAt.toISOString(),
        custom_price: serviceData.customPrice || serviceData.price,
        custom_description: serviceData.customDescription,
        custom_delivery_time: serviceData.customDeliveryTime,
        is_hidden: false,
        moderation_reason: null,
        is_reported: false,
      };

      // Save to Supabase
      console.log('🚀 SERVICE OFFER: About to insert message to database:', messageData);
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(messageData)
        .select()
        .single();
      
      console.log('🚀 SERVICE OFFER: Database insert result:', { data, error });

      if (error) {
        // Clean up the offer if message creation fails
        await supabase.from('service_offers').delete().eq('id', offerData.id);
        throw error;
      }

      // Update chat's last message timestamp
      await supabase
        .from('chats')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', chatId);

      // Add notification for the buyer about the new offer
      try {
        console.log('🔔 Creating offer notification for buyer:', buyerId, 'from seller:', senderId);
        
        await notificationService.addOfferNotification({
          participantId: buyerId, // This is the buyer who will receive the notification
          participantName: senderName, // This is the seller who made the offer
          participantImage: senderImage,
          chatId: chatId,
          offerId: offerData.id,
          serviceTitle: serviceData.title,
          price: serviceData.customPrice || serviceData.price,
          currency: serviceData.currency,
          senderId: senderId, // Add seller ID for navigation
          isIncoming: true,
        });
        console.log('✅ Offer notification sent successfully to buyer:', buyerId);
      } catch (notificationError) {
        console.error('❌ Error adding offer notification:', notificationError);
        // Don't fail the offer creation if notification fails
      }

      const transformedMessage = await this.transformMessage(data, senderId);

      console.log('✅ Service message sent successfully:', transformedMessage.id);
      return transformedMessage;
    } catch (error) {
      console.error('Error sending service message:', error);
      return null;
    }
  }

  async createServiceOffer(
    chatId: string,
    serviceId: string,
    sellerId: string,
    buyerId: string,
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
      customPrice?: number;
      customDescription?: string;
      customDeliveryTime?: number;
      // Hustle job attributes
      startDate?: string;
      endDate?: string;
      preferredStartTime?: string;
      preferredEndTime?: string;
      locationAddress?: string;
      urgencyLevel?: 'low' | 'medium' | 'high' | 'urgent';
      workType?: 'remote' | 'on_site' | 'hybrid';
      estimatedHours?: number;
      requirements?: string;
    }
  ): Promise<{ offer: any; message: LiveChatMessage | null }> {
    try {
      // Validate required UUID fields
      if (!chatId || chatId.trim() === '') {
        console.error('Error: Chat ID is empty or invalid');
        throw new Error('Chat ID is required');
      }

      if (!serviceId || serviceId.trim() === '') {
        console.error('Error: Service ID is empty or invalid');
        throw new Error('Service ID is required');
      }

      if (!sellerId || sellerId.trim() === '') {
        console.error('Error: Seller ID is empty or invalid');
        throw new Error('Seller ID is required');
      }

      // Create the service offer
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

      const offerInsertData = {
        chat_id: chatId,
        service_id: serviceId,
        seller_id: sellerId,
        buyer_id: buyerId, // Use the provided buyerId
        original_price: serviceData.price,
        custom_price: serviceData.customPrice || serviceData.price,
        custom_description: serviceData.customDescription,
        custom_delivery_time: serviceData.customDeliveryTime,
        // Hustle job attributes
        start_date: serviceData.startDate,
        end_date: serviceData.endDate,
        preferred_start_time: serviceData.preferredStartTime,
        preferred_end_time: serviceData.preferredEndTime,
        location_address: serviceData.locationAddress,
        urgency_level: serviceData.urgencyLevel,
        work_type: serviceData.workType,
        estimated_hours: serviceData.estimatedHours,
        requirements: serviceData.requirements,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      };

      console.log('🔍 SupabaseChatService: Creating service offer with data:', offerInsertData);
      console.log('🔍 SupabaseChatService: Hustle job fields for createServiceOffer:', {
        start_date: serviceData.startDate,
        end_date: serviceData.endDate,
        preferred_start_time: serviceData.preferredStartTime,
        preferred_end_time: serviceData.preferredEndTime,
        location_address: serviceData.locationAddress,
        urgency_level: serviceData.urgencyLevel,
        work_type: serviceData.workType,
        estimated_hours: serviceData.estimatedHours,
        requirements: serviceData.requirements,
      });

      const { data: offerData, error: offerError } = await supabase
        .from('service_offers')
        .insert(offerInsertData)
        .select()
        .single();

      if (offerError) {
        console.error('Error creating service offer:', offerError);
        throw offerError;
      }

      // Create the offer message
      const messageText = `Made an offer for: ${serviceData.title}`;
      
      const messageData = {
        chat_id: chatId,
        sender_id: sellerId,
        sender_name: senderName,
        sender_image: senderImage,
        message: messageText,
        message_type: 'offer',
        offer_id: offerData.id,
        offer_status: 'pending',
        offer_expires_at: expiresAt.toISOString(),
        custom_price: serviceData.customPrice,
        custom_description: serviceData.customDescription,
        custom_delivery_time: serviceData.customDeliveryTime,
        is_hidden: false,
        moderation_reason: null,
        is_reported: false,
      };

      const { data: messageDataResult, error: messageError } = await supabase
        .from('chat_messages')
        .insert(messageData)
        .select()
        .single();

      if (messageError) {
        console.error('Error creating offer message:', messageError);
        // Clean up the offer if message creation fails
        await supabase.from('service_offers').delete().eq('id', offerData.id);
        throw messageError;
      }

      // Update chat's last message timestamp
      await supabase
        .from('chats')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', chatId);

      // Add notification for the buyer about the new offer
      try {
        console.log('🔔 Creating offer notification for chat:', chatId, 'seller:', sellerId);
        
        // Get the buyer ID (the other participant in the chat)
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('chat_id', chatId)
          .neq('user_id', sellerId);

        console.log('🔔 Found participants:', participants);

        if (participants && participants.length > 0) {
          const buyerId = participants[0].user_id;
          console.log('🔔 Sending offer notification to buyer:', buyerId);
          
          await notificationService.addOfferNotification({
            participantId: buyerId, // This is the buyer who will receive the notification
            participantName: senderName, // This is the seller who made the offer
            participantImage: senderImage,
            chatId: chatId,
            offerId: offerData.id,
            serviceTitle: serviceData.title,
            price: serviceData.customPrice || serviceData.price,
            currency: serviceData.currency,
            senderId: sellerId, // Add seller ID for navigation
            isIncoming: true,
          });
          console.log('✅ Offer notification sent successfully');
        } else {
          console.log('❌ No participants found for offer notification');
        }
      } catch (notificationError) {
        console.error('❌ Error adding offer notification:', notificationError);
        // Don't fail the offer creation if notification fails
      }

      return {
        offer: offerData,
        message: await this.transformMessage(messageDataResult, sellerId)
      };
    } catch (error) {
      console.error('Error creating service offer:', error);
      throw error;
    }
  }

  // Debug function to check what's in the service_offers table
  async debugServiceOffer(offerId: string) {
    try {
      const { data, error } = await supabase
        .from('service_offers')
        .select('*')
        .eq('id', offerId)
        .single();
      
      console.log('🔍 DEBUG: Service offer data for ID', offerId, ':', { data, error });
      return { data, error };
    } catch (error) {
      console.error('🔍 DEBUG: Error querying service offer:', error);
      return { data: null, error };
    }
  }

  async updateServiceOffer(
    offerId: string,
    updates: {
      customPrice?: number;
      customDescription?: string;
      customDeliveryTime?: number;
      // Hustle job details
      startDate?: string;
      endDate?: string;
      preferredStartTime?: string;
      preferredEndTime?: string;
      locationAddress?: string;
      urgencyLevel?: 'low' | 'medium' | 'high' | 'urgent';
      workType?: 'remote' | 'on_site' | 'hybrid';
      estimatedHours?: number;
      requirements?: string;
    }
  ): Promise<any> {
    try {
      // Build update object dynamically to only include provided fields
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Basic fields
      if (updates.customPrice !== undefined) updateData.custom_price = updates.customPrice;
      if (updates.customDescription !== undefined) updateData.custom_description = updates.customDescription;
      if (updates.customDeliveryTime !== undefined) updateData.custom_delivery_time = updates.customDeliveryTime;

      // Hustle details
      if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
      if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
      if (updates.preferredStartTime !== undefined) updateData.preferred_start_time = updates.preferredStartTime;
      if (updates.preferredEndTime !== undefined) updateData.preferred_end_time = updates.preferredEndTime;
      if (updates.locationAddress !== undefined) updateData.location_address = updates.locationAddress;
      if (updates.urgencyLevel !== undefined) updateData.urgency_level = updates.urgencyLevel;
      if (updates.workType !== undefined) updateData.work_type = updates.workType;
      if (updates.estimatedHours !== undefined) updateData.estimated_hours = updates.estimatedHours;
      if (updates.requirements !== undefined) updateData.requirements = updates.requirements;

      const { data, error } = await supabase
        .from('service_offers')
        .update(updateData)
        .eq('id', offerId)
        .select()
        .single();

      if (error) {
        console.error('Error updating service offer:', error);
        throw error;
      }

      // Also update the corresponding chat message to trigger real-time updates
      const messageUpdateData: any = {};
      if (updates.customPrice !== undefined) messageUpdateData.custom_price = updates.customPrice;
      if (updates.customDescription !== undefined) messageUpdateData.custom_description = updates.customDescription;
      if (updates.customDeliveryTime !== undefined) messageUpdateData.custom_delivery_time = updates.customDeliveryTime;

      const { error: messageError } = await supabase
        .from('chat_messages')
        .update(messageUpdateData)
        .eq('offer_id', offerId);

      if (messageError) {
        console.error('Error updating chat message:', messageError);
        // Don't throw here as the main offer update succeeded
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', offerId)
        .select()
        .single();

      if (error) {
        console.error('Error accepting service offer:', error);
        throw error;
      }

      // Update the corresponding message
      console.log('🔄 SupabaseChatService: Updating chat message status for accepted offer:', offerId);
      const { data: messageUpdateData, error: messageError } = await supabase
        .from('chat_messages')
        .update({ offer_status: 'in_progress' })
        .eq('offer_id', offerId)
        .select();

      if (messageError) {
        console.error('❌ SupabaseChatService: Error updating chat message status:', messageError);
        // Don't throw here as the main offer update succeeded
      } else {
        console.log('✅ SupabaseChatService: Chat message status updated successfully');
        console.log('✅ SupabaseChatService: Updated messages:', messageUpdateData);
      }

      return data;
    } catch (error) {
      console.error('Error accepting service offer:', error);
      throw error;
    }
  }

  async rejectServiceOffer(offerId: string, reason?: string): Promise<any> {
    try {
      const updateData: any = {
        status: 'rejected',
        updated_at: new Date().toISOString(),
      };

      // Add rejection reason if provided
      if (reason) {
        updateData.rejection_reason = reason;
      }

      const { data, error } = await supabase
        .from('service_offers')
        .update(updateData)
        .eq('id', offerId)
        .select()
        .single();

      if (error) {
        console.error('Error rejecting service offer:', error);
        throw error;
      }

      // Update the corresponding message
      console.log('🔄 SupabaseChatService: Updating chat message status for offer:', offerId);
      const { data: messageUpdateData, error: messageError } = await supabase
        .from('chat_messages')
        .update({ offer_status: 'rejected' })
        .eq('offer_id', offerId)
        .select();

      if (messageError) {
        console.error('❌ SupabaseChatService: Error updating chat message status:', messageError);
        // Don't throw here as the main offer update succeeded
      } else {
        console.log('✅ SupabaseChatService: Chat message status updated successfully');
        console.log('✅ SupabaseChatService: Updated messages:', messageUpdateData);
      }

      return data;
    } catch (error) {
      console.error('Error rejecting service offer:', error);
      throw error;
    }
  }

  async cancelServiceOffer(offerId: string, reason?: string): Promise<any> {
    try {
      const updateData: any = {
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      };

      // Add cancellation reason if provided
      if (reason) {
        updateData.rejection_reason = reason;
      }

      const { data, error } = await supabase
        .from('service_offers')
        .update(updateData)
        .eq('id', offerId)
        .select()
        .single();

      if (error) {
        console.error('Error cancelling service offer:', error);
        throw error;
      }

      // Update the corresponding message
      console.log('🔄 SupabaseChatService: Updating chat message status for cancelled offer:', offerId);
      const { data: messageUpdateData, error: messageError } = await supabase
        .from('chat_messages')
        .update({ offer_status: 'cancelled' })
        .eq('offer_id', offerId)
        .select();

      if (messageError) {
        console.error('❌ SupabaseChatService: Error updating chat message status:', messageError);
        // Don't throw here as the main offer update succeeded
      } else {
        console.log('✅ SupabaseChatService: Chat message status updated successfully');
        console.log('✅ SupabaseChatService: Updated messages:', messageUpdateData);
      }

      return data;
    } catch (error) {
      console.error('Error cancelling service offer:', error);
      throw error;
    }
  }

  async getUserChats(userId: string): Promise<UserChat[]> {
    try {
      const { data: chats, error } = await supabase
        .from('chats')
        .select(`
          id,
          participant1_id,
          participant2_id,
          last_message_at,
          created_at
        `)
        .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error loading user chats:', error);
        return [];
      }

      const userChats: UserChat[] = [];
      
      for (const chat of chats) {
        const participantId = chat.participant1_id === userId ? chat.participant2_id : chat.participant1_id;
        const participant = await this.getParticipantById(participantId);
        
        if (!participant) continue;

        // Get the latest message
        const { data: latestMessages } = await supabase
          .from('chat_messages')
          .select('message, created_at')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        const latestMessage = latestMessages?.[0];
        
        // Count unread messages (messages that don't have is_read field set to true)
        const { count: unreadCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .neq('sender_id', userId);

        userChats.push({
           id: chat.id,
           participantId: participantId,
           participantName: participant.name,
           participantImage: participant.image,
           lastMessage: latestMessage?.message || null,
           lastMessageAt: latestMessage?.created_at || chat.last_message_at || chat.created_at,
           unreadCount: unreadCount || 0,
           createdAt: chat.created_at
         });
      }

      return userChats;
    } catch (error) {
      console.error('Error in getUserChats:', error);
      return [];
    }
  }

  async getLastMessage(chatId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('message, is_hidden')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return data.is_hidden ? '[Message hidden by moderation]' : data.message;
    } catch (error) {
      console.error('Error fetching last message:', error);
      return null;
    }
  }

  async getUnreadMessageCount(chatId: string, userId: string): Promise<number> {
    try {
      // Get messages that are not from the current user and haven't been read
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('chat_id', chatId)
        .neq('sender_id', userId);

      if (!messages || messages.length === 0) return 0;

      // Get read status for these messages
      const messageIds = messages.map(m => m.id);
      const { data: readStatuses } = await supabase
        .from('message_read_status')
        .select('message_id')
        .in('message_id', messageIds)
        .eq('user_id', userId);

      const readMessageIds = new Set(readStatuses?.map(rs => rs.message_id) || []);
      const unreadCount = messages.filter(m => !readMessageIds.has(m.id)).length;

      return unreadCount;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    try {
      // Get all unread messages in this chat that are not from the current user
      const { data: unreadMessages } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('chat_id', chatId)
        .neq('sender_id', userId);

      if (!unreadMessages || unreadMessages.length === 0) return;

      // Insert read status for each unread message
      const readStatusEntries = unreadMessages.map(message => ({
        message_id: message.id,
        user_id: userId
      }));

      await supabase
        .from('message_read_status')
        .upsert(readStatusEntries, {
          onConflict: 'message_id,user_id',
          ignoreDuplicates: true
        });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  subscribeToMessages(
    chatId: string,
    currentUserId: string,
    onMessage: (message: LiveChatMessage) => void,
    onDelete: (messageId: string) => void,
    onUpdate?: (message: LiveChatMessage) => void
  ): () => void {
    console.log('📡 SupabaseChatService: Subscribing to messages for chat:', chatId);
    
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          console.log('📡 SupabaseChatService: INSERT event received:', payload);
          const transformedMessage = await this.transformMessage(payload.new, currentUserId);
          console.log('📡 SupabaseChatService: Transformed message:', transformedMessage);
          
          // Trigger notification if message is from another user
          if (payload.new.sender_id !== currentUserId) {
            const participant = await this.getParticipantById(payload.new.sender_id);
            if (participant) {
              try {
                await notificationService.addChatNotification({
                  participantId: currentUserId, // Send notification TO the current user (recipient)
                  participantName: participant.name, // FROM the sender
                  participantImage: participant.image,
                  message: payload.new.message,
                  chatId: chatId,
                  senderId: payload.new.sender_id, // Add sender ID for navigation
                });
              } catch (error) {
                console.error('Error adding notification:', error);
              }
            }
          }
          
          onMessage(transformedMessage);
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
        async (payload) => {
          console.log('📡 SupabaseChatService: UPDATE event received:', payload);
          console.log('📡 SupabaseChatService: Updated fields:', payload.new);
          console.log('📡 SupabaseChatService: Old fields:', payload.old);
          
          if (onUpdate) {
            const transformedMessage = await this.transformMessage(payload.new, currentUserId);
            console.log('📡 SupabaseChatService: Transformed updated message:', transformedMessage);
            console.log('📡 SupabaseChatService: Message offer status:', transformedMessage.offerStatus);
            onUpdate(transformedMessage);
          } else {
            console.log('📡 SupabaseChatService: No onUpdate callback provided');
          }
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_offers',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          console.log('📡 SupabaseChatService: Service offer UPDATE event received:', payload);
          
          // Find the corresponding chat message and trigger an update
          const { data: messageData } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('offer_id', payload.new.id)
            .single();
          
          if (messageData && onUpdate) {
            const transformedMessage = await this.transformMessage(messageData, currentUserId);
            console.log('📡 SupabaseChatService: Transformed updated service offer message:', transformedMessage);
            onUpdate(transformedMessage);
          }
        }
      )
      .subscribe();

    this.channels.set(chatId, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(chatId);
    };
  }

  subscribeToUserChats(
    userId: string,
    onChatUpdate: (chatId: string) => void
  ): () => void {
    console.log('📡 Subscribing to user chats for user:', userId);
    
    const channel = supabase
      .channel(`user_chats:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `or(participant1_id.eq.${userId},participant2_id.eq.${userId})`,
        },
        (payload: any) => {
          const chatId = payload.new?.id || payload.old?.id;
          if (chatId) {
            onChatUpdate(chatId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          // Check if this message belongs to a chat involving this user
          const { data: chat } = await supabase
            .from('chats')
            .select('id')
            .eq('id', payload.new.chat_id)
            .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
            .single();
          
          if (chat) {
            // Trigger notification if message is from another user
            console.log('🔔 UserChats: Message received from:', payload.new.sender_id, 'Current user:', userId);
             if (payload.new.sender_id !== userId) {
               console.log('🔔 UserChats: Message is from another user, creating notification...');
               const participant = await this.getParticipantById(payload.new.sender_id);
               if (participant) {
                 console.log('🔔 UserChats: Participant found:', participant.name, 'Adding notification...');
                 await notificationService.addChatNotification({
                   participantId: userId, // Send notification TO the current user
                   participantName: participant.name,
                   participantImage: participant.image,
                   message: payload.new.message,
                   chatId: payload.new.chat_id,
                   senderId: payload.new.sender_id, // Add senderId for navigation
                 });
                 console.log('✅ UserChats: Notification added successfully');
               } else {
                 console.log('❌ UserChats: Participant not found for notification');
               }
             } else {
               console.log('ℹ️ UserChats: Message is from current user, no notification needed');
             }
            
            onChatUpdate(chat.id);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }

  async blockUser(chatId: string, blockedUserId: string, blockingUserId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: blockingUserId,
          blocked_id: blockedUserId,
          chat_id: chatId,
          created_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      console.log('✅ User blocked successfully');
      return true;
    } catch (error) {
      console.error('Error blocking user:', error);
      return false;
    }
  }

  async reportMessage(messageId: string, reporterId: string, reason: string): Promise<boolean> {
    try {
      // Mark message as reported
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ is_reported: true })
        .eq('id', messageId);

      if (updateError) {
        throw updateError;
      }

      // Create report record
      const { error: reportError } = await supabase
        .from('message_reports')
        .insert({
          message_id: messageId,
          reporter_id: reporterId,
          reason: reason,
          created_at: new Date().toISOString(),
        });

      if (reportError) {
        throw reportError;
      }

      console.log('✅ Message reported successfully');
      return true;
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
          reporter_id: reporterId,
          chat_id: chatId,
          reason: reason,
          created_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      console.log('✅ User reported successfully');
      return true;
    } catch (error) {
      console.error('Error reporting user:', error);
      return false;
    }
  }

  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      // First, verify that the user owns this message
      const { data: message, error: fetchError } = await supabase
        .from('chat_messages')
        .select('sender_id, chat_id')
        .eq('id', messageId)
        .single();

      if (fetchError || !message) {
        console.error('Error fetching message for deletion:', fetchError);
        return false;
      }

      // Only allow users to delete their own messages
      if (message.sender_id !== userId) {
        console.error('User not authorized to delete this message');
        return false;
      }

      // Delete the message from the database
      const { error: deleteError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);

      if (deleteError) {
        console.error('Error deleting message from database:', deleteError);
        return false;
      }

      console.log('✅ Message deleted successfully:', messageId);
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  async getChatParticipant(chatId: string, currentUserId: string): Promise<{ id: string; name: string; image: string } | null> {
    try {
      const { data: chat, error } = await supabase
        .from('chats')
        .select(`
          *,
          participant1:profiles!chats_participant1_id_fkey(id, full_name, avatar_url),
          participant2:profiles!chats_participant2_id_fkey(id, full_name, avatar_url)
        `)
        .eq('id', chatId)
        .single();

      if (error || !chat) {
        throw error;
      }

      const otherParticipant = chat.participant1_id === currentUserId ? chat.participant2 : chat.participant1;
      
      return {
        id: otherParticipant.id,
        name: otherParticipant.full_name,
        image: otherParticipant.avatar_url,
      };
    } catch (error) {
      console.error('Error fetching chat participant:', error);
      return null;
    }
  }

  async getParticipantById(participantId: string): Promise<{ id: string; name: string; image: string } | null> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', participantId)
        .single();

      if (error || !profile) {
        console.error('Error fetching participant profile:', error);
        return null;
      }
      
      return {
        id: profile.id,
        name: profile.full_name || 'Unknown User',
        image: profile.avatar_url || '',
      };
    } catch (error) {
      console.error('Error fetching participant by ID:', error);
      return null;
    }
  }

  // Subscribe to ALL messages for a user (for notifications)
  subscribeToAllUserMessages(
    userId: string
  ): () => void {
    console.log('🔔 Setting up global message subscription for user:', userId);
    
    // First, get all chats for this user
    this.getUserChats(userId).then(userChats => {
      console.log('🔔 User chats:', userChats.map(chat => chat.id));
      
      const channel = supabase
        .channel(`all_user_messages:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
          },
          async (payload) => {
            console.log('🔔 Global subscription received message:', payload.new);
            console.log('🔔 Message sender:', payload.new.sender_id, 'Current user:', userId);
            console.log('🔔 Message chat_id:', payload.new.chat_id);
            console.log('🔔 MESSAGE TYPE:', payload.new.message_type);
            console.log('🔔 MESSAGE TEXT:', payload.new.message);
            
            // Skip if this is the user's own message
            if (payload.new.sender_id === userId) {
              console.log('ℹ️ Skipping own message');
              return;
            }
            
            // Check if this message belongs to a chat involving this user
            const { data: chat } = await supabase
              .from('chats')
              .select('id')
              .eq('id', payload.new.chat_id)
              .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
              .single();

            console.log('🔔 Chat check result:', chat);

            if (chat) {
              console.log('🔔 Message is for this user, getting participant...');
              const participant = await this.getParticipantById(payload.new.sender_id);
              console.log('🔔 Participant result:', participant);
              
              if (participant) {
                console.log('🔔 Creating notification for:', participant.name);
                console.log('🔔 NOTIFICATION DATA:', {
                  participantId: payload.new.sender_id,
                  participantName: participant.name,
                  message: payload.new.message,
                  messageType: payload.new.message_type,
                  chatId: payload.new.chat_id
                });
                try {
                  await notificationService.addChatNotification({
                    participantId: userId, // Send notification TO the current user (recipient)
                    participantName: participant.name,
                    participantImage: participant.image,
                    message: payload.new.message,
                    chatId: payload.new.chat_id,
                    senderId: payload.new.sender_id, // Add senderId for navigation
                  });
                  console.log('✅ Global notification created successfully for message type:', payload.new.message_type);
                } catch (error) {
                  console.error('❌ Error adding global notification:', error);
                }
              } else {
                console.log('❌ Participant not found for notification');
              }
            } else {
              console.log('ℹ️ Message not for this user');
            }
          }
        )
        .subscribe();

      console.log('🔔 Global subscription set up successfully');
      this.channels.set(`all_user_messages:${userId}`, channel);
    });

    return () => {
      console.log('🔔 Cleaning up global subscription');
      const channel = this.channels.get(`all_user_messages:${userId}`);
      if (channel) {
        channel.unsubscribe();
        this.channels.delete(`all_user_messages:${userId}`);
      }
    };
  }

  // Connection status (always connected for Supabase)
  getConnectionStatus(): string {
    return 'connected';
  }

  onConnectionStateChange(callback: (state: string) => void): () => void {
    // Supabase is always connected, so we just call the callback immediately
    callback('connected');
    return () => {}; // No-op cleanup
  }

  cleanup(): void {
    this.messageSubscriptions.forEach(unsubscribe => unsubscribe());
    this.messageSubscriptions.clear();
    this.channels.forEach(channel => channel.unsubscribe());
    this.channels.clear();
  }
}

export const supabaseChatService = SupabaseChatService.getInstance();