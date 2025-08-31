#!/usr/bin/env node

/**
 * Test script to simulate the exact UI flow for service offers
 * This will help identify where notifications are failing
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

// Use service key for testing
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Mock notification service
const mockNotificationService = {
  async addOfferNotification(params) {
    console.log('🔔 NotificationService.addOfferNotification called with:', params);
    
    try {
      // Simulate the exact logic from the notification service
      const notification = {
        id: `offer_${params.offerId}_${Date.now()}`,
        user_id: params.participantId,
        type: 'offer',
        title: `New offer from ${params.participantName}`,
        message: `${params.serviceTitle} - ${params.currency} ${params.price}`,
        data: {
          chatId: params.chatId,
          participantId: params.senderId,
          participantName: params.participantName,
          participantImage: params.participantImage,
          offerId: params.offerId,
          offerStatus: 'pending',
          serviceTitle: params.serviceTitle,
          price: params.price,
          currency: params.currency,
          senderId: params.senderId,
          isIncoming: params.isIncoming,
        },
        is_read: false,
        created_at: new Date().toISOString()
      };

      console.log('🔔 Creating notification:', notification);

      // Try to insert the notification
      const { data, error } = await supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();

      if (error) {
        console.error('❌ Notification insert failed:', error);
        throw error;
      }

      console.log('✅ Notification created successfully:', data.id);
      return data;
    } catch (error) {
      console.error('❌ addOfferNotification failed:', error);
      throw error;
    }
  }
};

// Mock the sendServiceMessage function with detailed logging
async function mockSendServiceMessage(
  chatId,
  senderId,
  senderName,
  senderImage,
  serviceData
) {
  console.log('🚀 mockSendServiceMessage called with:');
  console.log('  chatId:', chatId);
  console.log('  senderId:', senderId);
  console.log('  senderName:', senderName);
  console.log('  serviceData:', serviceData);

  try {
    // Step 1: Get chat participants to find buyer
    console.log('\\n📋 Step 1: Finding buyer in chat...');
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select('participant1_id, participant2_id')
      .eq('id', chatId)
      .single();

    if (chatError) {
      console.error('❌ Error fetching chat data:', chatError);
      throw chatError;
    }

    const buyerId = chatData.participant1_id === senderId 
      ? chatData.participant2_id 
      : chatData.participant1_id;

    console.log('✅ Found buyer:', buyerId);

    // Step 2: Create service offer
    console.log('\\n📋 Step 2: Creating service offer...');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const offerInsertData = {
      chat_id: chatId,
      service_id: serviceData.id,
      service_provider_id: senderId,
      seller_id: senderId,
      buyer_id: buyerId,
      original_price: serviceData.price,
      custom_price: serviceData.customPrice || serviceData.price,
      custom_description: serviceData.customDescription,
      custom_delivery_time: serviceData.customDeliveryTime,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    };

    const { data: offerData, error: offerError } = await supabase
      .from('service_offers')
      .insert(offerInsertData)
      .select()
      .single();

    if (offerError) {
      console.error('❌ Error creating service offer:', offerError);
      throw offerError;
    }

    console.log('✅ Service offer created:', offerData.id);

    // Step 3: Create chat message
    console.log('\\n📋 Step 3: Creating chat message...');
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

    const { data: messageResult, error: messageError } = await supabase
      .from('chat_messages')
      .insert(messageData)
      .select()
      .single();
    
    if (messageError) {
      console.error('❌ Error creating chat message:', messageError);
      // Clean up the offer if message creation fails
      await supabase.from('service_offers').delete().eq('id', offerData.id);
      throw messageError;
    }

    console.log('✅ Chat message created:', messageResult.id);

    // Step 4: Update chat timestamp
    console.log('\\n📋 Step 4: Updating chat timestamp...');
    await supabase
      .from('chats')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', chatId);

    // Step 5: Send notification (this is where the issue likely is)
    console.log('\\n📋 Step 5: Sending notification...');
    try {
      console.log('🔔 Creating offer notification for chat:', chatId, 'sender:', senderId);
      
      // Get the buyer ID (the other participant in the chat)
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', chatId)
        .neq('user_id', senderId);

      console.log('🔔 Found participants:', participants);

      if (participants && participants.length > 0) {
        const buyerId = participants[0].user_id;
        console.log('🔔 Sending offer notification to buyer:', buyerId);
        
        await mockNotificationService.addOfferNotification({
          participantId: buyerId,
          participantName: senderName,
          participantImage: senderImage,
          chatId: chatId,
          offerId: offerData.id,
          serviceTitle: serviceData.title,
          price: serviceData.customPrice || serviceData.price,
          currency: serviceData.currency,
          senderId: senderId,
          isIncoming: true,
        });
        console.log('✅ Offer notification sent successfully');
      } else {
        console.log('❌ No participants found for offer notification');
      }
    } catch (notificationError) {
      console.error('❌ Error adding offer notification:', notificationError);
      
      // Fallback: Create notification directly via RPC
      console.log('🔄 Attempting fallback notification creation...');
      
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', chatId)
        .neq('user_id', senderId);

      if (participants && participants.length > 0) {
        const buyerId = participants[0].user_id;
        
        const fallbackResult = await supabase.rpc('create_notification', {
          p_user_id: buyerId,
          p_type: 'offer',
          p_title: `New offer from ${senderName}`,
          p_message: `${serviceData.title} - ${serviceData.currency} ${serviceData.customPrice || serviceData.price}`,
          p_data: {
            chatId,
            participantId: senderId,
            participantName: senderName,
            participantImage: senderImage,
            offerId: offerData.id,
            offerStatus: 'pending',
            serviceTitle: serviceData.title,
            price: serviceData.customPrice || serviceData.price,
            currency: serviceData.currency,
          },
          p_id: `offer_${offerData.id}_${Date.now()}`,
        });

        if (fallbackResult.error) {
          console.error('❌ Fallback notification also failed:', fallbackResult.error);
        } else {
          console.log('✅ Fallback notification created successfully');
        }
      }
    }

    return {
      message: messageResult,
      offer: offerData
    };

  } catch (error) {
    console.error('❌ mockSendServiceMessage failed:', error);
    throw error;
  }
}

async function main() {
  console.log('🧪 Testing UI service offer flow...');
  console.log('=======================================================');

  try {
    // Get test data
    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .limit(2);

    if (!users || users.length < 2) {
      console.error('❌ Need at least 2 users for testing');
      return;
    }

    const serviceProvider = users[0];
    const buyer = users[1];

    console.log(`👤 Service Provider: ${serviceProvider.full_name} (${serviceProvider.id})`);
    console.log(`👤 Buyer: ${buyer.full_name} (${buyer.id})`);

    // Get a test service
    const { data: services } = await supabase
      .from('services')
      .select('*')
      .eq('user_id', serviceProvider.id)
      .limit(1);

    if (!services || services.length === 0) {
      console.error('❌ No services found for service provider');
      return;
    }

    const testService = services[0];
    console.log(`🛠️ Test Service: ${testService.title} (${testService.id})`);

    // Get or create chat
    let chatId;
    const { data: existingChat } = await supabase
      .from('chats')
      .select('id')
      .or(`and(participant1_id.eq.${serviceProvider.id},participant2_id.eq.${buyer.id}),and(participant1_id.eq.${buyer.id},participant2_id.eq.${serviceProvider.id})`)
      .limit(1);

    if (existingChat && existingChat.length > 0) {
      chatId = existingChat[0].id;
      console.log(`✅ Using existing chat: ${chatId}`);
    } else {
      // Create new chat
      console.log('📝 Creating new chat...');
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          participant1_id: serviceProvider.id,
          participant2_id: buyer.id,
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (chatError) {
        console.error('❌ Error creating chat:', chatError);
        return;
      }

      chatId = newChat.id;
      console.log(`✅ Created new chat: ${chatId}`);

      // Create chat participants
      await supabase.from('chat_participants').insert([
        { chat_id: chatId, user_id: serviceProvider.id },
        { chat_id: chatId, user_id: buyer.id }
      ]);
      console.log('✅ Chat participants created');
    }

    // Clear existing notifications
    console.log('\\n🧹 Clearing existing notifications...');
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', buyer.id)
      .eq('type', 'offer');

    // Test the flow
    console.log('\\n🎯 Testing service offer flow...');
    
    const serviceData = {
      id: testService.id,
      title: testService.title,
      description: testService.description,
      price: testService.price,
      currency: testService.currency,
      image_url: testService.image_url,
      category_name: testService.category_name,
      customPrice: testService.price + 10, // Add custom price
      customDescription: 'Custom description for this offer',
      customDeliveryTime: 7,
    };

    const result = await mockSendServiceMessage(
      chatId,
      serviceProvider.id,
      serviceProvider.full_name,
      null,
      serviceData
    );

    console.log('\\n✅ Service offer flow completed successfully!');
    console.log('📋 Results:');
    console.log('  - Message ID:', result.message.id);
    console.log('  - Offer ID:', result.offer.id);

    // Check final notifications
    console.log('\\n📊 Checking final notifications...');
    const { data: finalNotifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', buyer.id)
      .eq('type', 'offer')
      .gte('created_at', new Date(Date.now() - 60000).toISOString());

    console.log(`🛒 Buyer notifications: ${finalNotifications?.length || 0}`);
    finalNotifications?.forEach(notif => {
      console.log(`  - ${notif.id}: ${notif.title}`);
    });

    // Cleanup
    console.log('\\n🧹 Cleaning up...');
    if (result.message) {
      await supabase.from('chat_messages').delete().eq('id', result.message.id);
    }
    if (result.offer) {
      await supabase.from('service_offers').delete().eq('id', result.offer.id);
    }
    if (finalNotifications) {
      for (const notif of finalNotifications) {
        await supabase.from('notifications').delete().eq('id', notif.id);
      }
    }

    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main().catch(console.error);