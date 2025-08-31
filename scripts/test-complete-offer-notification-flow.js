#!/usr/bin/env node

/**
 * Complete test of service offer notification flow
 * This simulates the exact flow that happens when a service offer is sent
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCompleteOfferNotificationFlow() {
  console.log('🧪 Testing Complete Service Offer Notification Flow');
  console.log('==================================================\n');

  try {
    // Step 1: Get test users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .limit(2);

    if (usersError || !users || users.length < 2) {
      console.error('❌ Need at least 2 users in the database to test');
      return;
    }

    const seller = users[0];
    const buyer = users[1];

    console.log('👤 Seller:', seller.full_name, `(${seller.id})`);
    console.log('👤 Buyer:', buyer.full_name, `(${buyer.id})`);

    // Step 2: Get or create a test service
    let { data: services } = await supabase
      .from('services')
      .select('*')
      .eq('user_id', seller.id)
      .limit(1);

    if (!services || services.length === 0) {
      console.log('⚠️ Creating test service...');
      const { data: newService, error: createError } = await supabase
        .from('services')
        .insert({
          user_id: seller.id,
          title: 'Test Service for Notification Flow',
          description: 'Test service description',
          price: 75.00,
          currency: 'USD',
          category_id: '1',
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating test service:', createError);
        return;
      }
      services = [newService];
    }

    const testService = services[0];
    console.log('🛍️ Using service:', testService.title, `($${testService.price})`);

    // Step 3: Create or get chat
    let { data: chats } = await supabase
      .from('chats')
      .select('*')
      .or(`and(participant1_id.eq.${seller.id},participant2_id.eq.${buyer.id}),and(participant1_id.eq.${buyer.id},participant2_id.eq.${seller.id})`);

    let chatId;
    if (!chats || chats.length === 0) {
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
    } else {
      chatId = chats[0].id;
    }

    console.log('💬 Chat ID:', chatId);

    // Step 4: Clear existing notifications
    console.log('\n🧹 Clearing existing notifications...');
    await supabase.from('notifications').delete().eq('user_id', buyer.id);

    // Step 5: Test the create_notification RPC directly
    console.log('\n🧪 Testing create_notification RPC directly...');
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_notification', {
        p_user_id: buyer.id,
        p_type: 'offer',
        p_title: 'Test RPC Notification',
        p_message: 'This is a test notification via RPC',
        p_data: { test: true },
        p_id: `test-rpc-${Date.now()}`
      });

      if (rpcError) {
        console.error('❌ RPC Error:', rpcError);
      } else {
        console.log('✅ RPC Success, notification ID:', rpcResult);
        
        // Check if notification was created
        const { data: rpcNotif } = await supabase
          .from('notifications')
          .select('*')
          .eq('id', rpcResult)
          .single();
          
        if (rpcNotif) {
          console.log('✅ RPC notification found in database');
          // Clean up
          await supabase.from('notifications').delete().eq('id', rpcResult);
        } else {
          console.log('❌ RPC notification NOT found in database');
        }
      }
    } catch (rpcTestError) {
      console.error('❌ RPC Test Error:', rpcTestError);
    }

    // Step 6: Simulate the complete service offer flow
    console.log('\n📤 Simulating complete service offer flow...');

    // 6a: Create service offer
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
        custom_description: 'Test offer notification flow',
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

    // 6b: Create offer notification using the same method as SupabaseChatService
    console.log('\n🔔 Creating offer notification...');
    try {
      const { data: notifResult, error: notifError } = await supabase.rpc('create_notification', {
        p_user_id: buyer.id,
        p_type: 'offer',
        p_title: `New offer from ${seller.full_name}`,
        p_message: `${testService.title} - USD ${testService.price}`,
        p_data: {
          chatId: chatId,
          participantId: seller.id,
          participantName: seller.full_name,
          participantImage: seller.avatar_url,
          offerId: offerData.id,
          offerStatus: 'pending',
          serviceTitle: testService.title,
          price: testService.price,
          currency: 'USD',
        },
        p_id: `offer_${offerData.id}_${Date.now()}`
      });

      if (notifError) {
        console.error('❌ Notification creation error:', notifError);
      } else {
        console.log('✅ Notification created with ID:', notifResult);
      }
    } catch (notifCreateError) {
      console.error('❌ Notification creation exception:', notifCreateError);
    }

    // 6c: Create chat message
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
        custom_description: 'Test offer notification flow',
      })
      .select()
      .single();

    if (messageError) {
      console.error('❌ Error creating chat message:', messageError);
    } else {
      console.log('✅ Chat message created:', messageData.id);
    }

    // Step 7: Wait and check results
    console.log('\n⏳ Waiting for notifications to be processed...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: finalNotifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', buyer.id)
      .order('created_at', { ascending: false });

    console.log(`\n📊 Final notification count: ${finalNotifications?.length || 0}`);

    if (finalNotifications && finalNotifications.length > 0) {
      console.log('\n📋 Notifications found:');
      finalNotifications.forEach((notif, index) => {
        console.log(`   ${index + 1}. [${notif.type}] ${notif.title}`);
        console.log(`      Message: ${notif.message}`);
        console.log(`      Created: ${notif.created_at}`);
        console.log(`      Data: ${JSON.stringify(notif.data, null, 8)}`);
      });

      // Check if we have the expected offer notification
      const offerNotifications = finalNotifications.filter(n => n.type === 'offer');
      if (offerNotifications.length > 0) {
        console.log('\n✅ SUCCESS: Service offer notifications are working!');
      } else {
        console.log('\n❌ ISSUE: No offer-type notifications found');
      }
    } else {
      console.log('\n❌ ISSUE: No notifications found at all');
    }

    // Step 8: Clean up
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('notifications').delete().eq('user_id', buyer.id);
    if (messageData) {
      await supabase.from('chat_messages').delete().eq('id', messageData.id);
    }
    await supabase.from('service_offers').delete().eq('id', offerData.id);

    console.log('✅ Cleanup completed');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testCompleteOfferNotificationFlow().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});