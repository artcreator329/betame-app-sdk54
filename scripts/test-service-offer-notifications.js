#!/usr/bin/env node

/**
 * Test script to verify that service offer notifications are still working
 * after the duplicate chat notification fix
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testServiceOfferNotifications() {
  console.log('🧪 Testing Service Offer Notifications');
  console.log('=====================================\n');

  try {
    // Get two test users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .limit(2);

    if (usersError || !users || users.length < 2) {
      console.error('❌ Need at least 2 users in the database to test');
      return;
    }

    const seller = users[0]; // Service provider
    const buyer = users[1];  // Buyer who will receive the offer

    console.log('👤 Seller (Service Provider):', seller.full_name, `(${seller.id})`);
    console.log('👤 Buyer (Will receive offer):', buyer.full_name, `(${buyer.id})`);

    // Get a test service from the seller
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('user_id', seller.id)
      .limit(1);

    if (servicesError || !services || services.length === 0) {
      console.log('⚠️ No services found for seller, creating a test service...');
      
      const { data: newService, error: createServiceError } = await supabase
        .from('services')
        .insert({
          user_id: seller.id,
          title: 'Test Service for Offer Notification',
          description: 'This is a test service for notification testing',
          price: 50.00,
          currency: 'USD',
          category_id: '1', // Assuming category 1 exists
        })
        .select()
        .single();

      if (createServiceError) {
        console.error('❌ Error creating test service:', createServiceError);
        return;
      }

      services.push(newService);
      console.log('✅ Created test service:', newService.title);
    }

    const testService = services[0];
    console.log('🛍️ Using service:', testService.title, `($${testService.price})`);

    // Create or get a chat between these users
    console.log('\n📱 Creating/getting chat...');
    const { data: existingChats } = await supabase
      .from('chats')
      .select('*')
      .or(`and(participant1_id.eq.${seller.id},participant2_id.eq.${buyer.id}),and(participant1_id.eq.${buyer.id},participant2_id.eq.${seller.id})`);

    let chatId;
    if (existingChats && existingChats.length > 0) {
      chatId = existingChats[0].id;
      console.log('✅ Using existing chat:', chatId);
    } else {
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({
          participant1_id: seller.id,
          participant2_id: buyer.id
        })
        .select()
        .single();

      if (chatError) {
        console.error('❌ Error creating chat:', chatError);
        return;
      }

      chatId = newChat.id;
      console.log('✅ Created new chat:', chatId);
    }

    // Clear existing notifications for buyer to get clean test
    console.log('\n🧹 Clearing existing notifications for buyer...');
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', buyer.id);

    // Count notifications before sending offer
    const { data: beforeNotifications } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', buyer.id);

    const beforeCount = beforeNotifications?.length || 0;
    console.log(`📊 Notifications before: ${beforeCount}`);

    // Create a service offer
    console.log('\n📤 Creating service offer...');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data: offerData, error: offerError } = await supabase
      .from('service_offers')
      .insert({
        chat_id: chatId,
        service_id: testService.id,
        service_provider_id: seller.id,
        seller_id: seller.id,
        buyer_id: buyer.id,
        original_price: testService.price,
        custom_price: testService.price,
        custom_description: 'Test offer for notification testing',
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (offerError) {
      console.error('❌ Error creating service offer:', offerError);
      return;
    }

    console.log('✅ Service offer created:', offerData.id);

    // Create the chat message for the offer
    console.log('\n📤 Creating offer message...');
    const { data: messageData, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        sender_id: seller.id,
        sender_name: seller.full_name || 'Test Seller',
        sender_image: seller.avatar_url || 'https://via.placeholder.com/40',
        message: `Shared a service: ${testService.title}`,
        message_type: 'offer',
        offer_id: offerData.id,
        offer_status: 'pending',
        offer_expires_at: expiresAt.toISOString(),
        custom_price: testService.price,
        custom_description: 'Test offer for notification testing',
      })
      .select()
      .single();

    if (messageError) {
      console.error('❌ Error creating offer message:', messageError);
      return;
    }

    console.log('✅ Offer message created:', messageData.id);

    // Wait a moment for notifications to be processed
    console.log('\n⏳ Waiting for notifications to be processed...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Count notifications after sending offer
    const { data: afterNotifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', buyer.id)
      .order('created_at', { ascending: false });

    const afterCount = afterNotifications?.length || 0;
    const newNotifications = afterCount - beforeCount;

    console.log(`📊 Notifications after: ${afterCount}`);
    console.log(`📊 New notifications: ${newNotifications}`);

    // Check results
    if (newNotifications === 1) {
      console.log('\n✅ SUCCESS: Service offer notification created!');
      
      const notification = afterNotifications[0];
      console.log('📋 Notification details:');
      console.log('  - Type:', notification.type);
      console.log('  - Title:', notification.title);
      console.log('  - Message:', notification.message);
      console.log('  - Data:', JSON.stringify(notification.data, null, 2));
      
      if (notification.type === 'offer') {
        console.log('✅ Notification type is correct (offer)');
      } else {
        console.log('❌ Notification type is incorrect, expected "offer", got:', notification.type);
      }
      
    } else if (newNotifications === 0) {
      console.log('\n❌ ISSUE: No service offer notification was created!');
      console.log('This indicates the service offer notification system is broken');
      
      // Check if the offer was created in the database
      const { data: checkOffer } = await supabase
        .from('service_offers')
        .select('*')
        .eq('id', offerData.id)
        .single();
        
      console.log('🔍 Offer in database:', checkOffer ? 'EXISTS' : 'MISSING');
      
      // Check if the message was created
      const { data: checkMessage } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('id', messageData.id)
        .single();
        
      console.log('🔍 Message in database:', checkMessage ? 'EXISTS' : 'MISSING');
      
    } else if (newNotifications > 1) {
      console.log(`\n⚠️ WARNING: ${newNotifications} notifications created (might be duplicates)`);
      
      console.log('\n📋 All notifications:');
      afterNotifications.slice(0, newNotifications).forEach((notif, index) => {
        console.log(`  ${index + 1}. [${notif.type}] ${notif.title} - ${notif.message}`);
      });
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', buyer.id);

    await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageData.id);

    await supabase
      .from('service_offers')
      .delete()
      .eq('id', offerData.id);

    console.log('✅ Cleanup completed');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testServiceOfferNotifications().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});