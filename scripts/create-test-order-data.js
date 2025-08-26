#!/usr/bin/env node

/**
 * Create Test Order Data
 * 
 * This script creates realistic test data to simulate the order notification flow:
 * 1. Creates test service offers
 * 2. Marks them as accepted
 * 3. Creates corresponding orders
 * 4. Tests notification creation
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function createTestOrderData() {
  console.log('🧪 Creating Test Order Data...\n');

  try {
    // Step 1: Get existing users from profiles
    console.log('1️⃣ Getting existing users...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .limit(5);

    if (profilesError || !profiles || profiles.length < 2) {
      console.log('❌ Need at least 2 users in profiles table');
      return;
    }

    const buyer = profiles[0];
    const serviceProvider = profiles[1];
    
    console.log(`✅ Using buyer: ${buyer.full_name} (${buyer.id})`);
    console.log(`✅ Using service provider: ${serviceProvider.full_name} (${serviceProvider.id})`);

    // Step 2: Create a test chat
    console.log('\n2️⃣ Creating test chat...');
    
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        participant1_id: buyer.id,
        participant2_id: serviceProvider.id,
        service_id: null,
        service_title: null
      })
      .select()
      .single();

    if (chatError) {
      console.log('❌ Failed to create chat:', chatError.message);
      return;
    }

    console.log(`✅ Created chat: ${chat.id}`);

    // Step 3: Create test service offers
    console.log('\n3️⃣ Creating test service offers...');
    
    const testOffers = [
      {
        chat_id: chat.id,
        service_id: 'test-service-web-design',
        service_provider_id: serviceProvider.id,
        seller_id: serviceProvider.id,
        buyer_id: buyer.id,
        original_price: 500,
        custom_price: 450,
        custom_description: 'Professional Website Design',
        custom_delivery_time: 7,
        status: 'accepted',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        chat_id: chat.id,
        service_id: 'test-service-logo-design',
        service_provider_id: serviceProvider.id,
        seller_id: serviceProvider.id,
        buyer_id: buyer.id,
        original_price: 200,
        custom_price: 180,
        custom_description: 'Custom Logo Design',
        custom_delivery_time: 3,
        status: 'accepted',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        chat_id: chat.id,
        service_id: 'test-service-mobile-app',
        service_provider_id: serviceProvider.id,
        seller_id: serviceProvider.id,
        buyer_id: buyer.id,
        original_price: 1000,
        custom_price: 900,
        custom_description: 'Mobile App Development',
        custom_delivery_time: 14,
        status: 'accepted',
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const { data: createdOffers, error: offersError } = await supabase
      .from('service_offers')
      .insert(testOffers)
      .select();

    if (offersError) {
      console.log('❌ Failed to create service offers:', offersError.message);
      return;
    }

    console.log(`✅ Created ${createdOffers.length} test service offers`);

    // Step 4: Create corresponding orders
    console.log('\n4️⃣ Creating test orders...');
    
    const testOrders = createdOffers.map(offer => ({
      service_offer_id: offer.id,
      buyer_id: offer.buyer_id,
      seller_id: offer.seller_id,
      service_provider_id: offer.service_provider_id,
      amount: offer.custom_price,
      platform_fee: Math.round(offer.custom_price * 0.1),
      total_amount: Math.round(offer.custom_price * 1.1),
      service_title: offer.custom_description,
      service_description: offer.custom_description,
      status: 'payment_received',
      created_at: offer.created_at
    }));

    const { data: createdOrders, error: ordersError } = await supabase
      .from('orders')
      .insert(testOrders)
      .select();

    if (ordersError) {
      console.log('❌ Failed to create orders:', ordersError.message);
      return;
    }

    console.log(`✅ Created ${createdOrders.length} test orders`);

    // Step 5: Test notification creation for these orders
    console.log('\n5️⃣ Testing notification creation...');
    
    for (const order of createdOrders) {
      try {
        const notification = {
          user_id: order.service_provider_id,
          type: 'order',
          title: `New Order from ${buyer.full_name}`,
          message: `Payment received for "${order.service_title}" - $${order.amount}`,
          data: {
            orderId: order.id,
            chatId: chat.id,
            participantId: order.buyer_id,
            participantName: buyer.full_name,
            participantImage: '',
            serviceTitle: order.service_title,
            amount: order.amount,
            currency: 'USD',
            orderStatus: order.status,
            isTest: true
          },
          created_at: order.created_at,
          is_read: false
        };

        const { data: notifResult, error: notifError } = await supabase
          .from('notifications')
          .insert(notification)
          .select()
          .single();

        if (notifError) {
          console.log(`❌ Failed to create notification for order ${order.id}:`, notifError.message);
          
          // Try using RPC instead
          const { data: rpcResult, error: rpcError } = await supabase.rpc('create_notification', {
            p_user_id: order.service_provider_id,
            p_type: 'order',
            p_title: `New Order from ${buyer.full_name}`,
            p_message: `Payment received for "${order.service_title}" - $${order.amount}`,
            p_data: notification.data,
            p_id: `order-${order.id}-${Date.now()}`
          });

          if (rpcError) {
            console.log(`❌ RPC also failed for order ${order.id}:`, rpcError.message);
          } else {
            console.log(`✅ Created notification via RPC for order ${order.id}`);
          }
        } else {
          console.log(`✅ Created notification for order ${order.id}: ${notifResult.id}`);
        }
      } catch (error) {
        console.log(`❌ Exception creating notification for order ${order.id}:`, error.message);
      }
    }

    // Step 6: Verify the results
    console.log('\n6️⃣ Verifying test data creation...');
    
    const { data: finalOffers } = await supabase
      .from('service_offers')
      .select('*')
      .eq('chat_id', chat.id);

    const { data: finalOrders } = await supabase
      .from('orders')
      .select('*')
      .in('service_offer_id', createdOffers.map(o => o.id));

    const { data: finalNotifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'order')
      .eq('user_id', serviceProvider.id);

    console.log(`📊 Final counts:`);
    console.log(`   Service offers: ${finalOffers?.length || 0}`);
    console.log(`   Orders: ${finalOrders?.length || 0}`);
    console.log(`   Order notifications: ${finalNotifications?.length || 0}`);

    if (finalNotifications && finalNotifications.length > 0) {
      console.log('\n📱 Sample notifications created:');
      finalNotifications.forEach((notif, index) => {
        console.log(`   ${index + 1}. ${notif.title} - ${notif.message}`);
      });
    }

    console.log('\n🎉 Test data creation completed!');
    console.log(`💡 Chat ID for testing: ${chat.id}`);
    console.log(`💡 Service Provider ID: ${serviceProvider.id}`);
    console.log(`💡 Buyer ID: ${buyer.id}`);

    // Step 7: Test the notification service
    console.log('\n7️⃣ Testing notification service integration...');
    
    try {
      // Import and test the notification service
      const { notificationService } = await import('../lib/notification-service.js');
      
      await notificationService.addOrderNotification({
        serviceProviderId: serviceProvider.id,
        buyerName: buyer.full_name,
        buyerImage: '',
        orderId: createdOrders[0].id,
        serviceTitle: createdOrders[0].service_title,
        amount: createdOrders[0].amount,
        currency: 'USD',
        chatId: chat.id
      });

      console.log('✅ Notification service integration test passed!');
    } catch (error) {
      console.log('❌ Notification service integration test failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Test data creation failed:', error);
    process.exit(1);
  }
}

// Add cleanup option
const shouldCleanup = process.argv.includes('--cleanup');

if (shouldCleanup) {
  async function cleanupTestData() {
    console.log('🧹 Cleaning up test data...\n');
    
    try {
      // Delete test notifications
      await supabase
        .from('notifications')
        .delete()
        .eq('type', 'order')
        .like('data->isTest', 'true');

      // Delete test orders
      await supabase
        .from('orders')
        .delete()
        .like('service_title', '%Test%');

      // Delete test service offers
      await supabase
        .from('service_offers')
        .delete()
        .like('service_id', 'test-service-%');

      // Delete test chats
      await supabase
        .from('chats')
        .delete()
        .is('service_id', null);

      console.log('✅ Test data cleaned up!');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
  
  cleanupTestData();
} else {
  createTestOrderData();
}