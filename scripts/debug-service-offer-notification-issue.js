#!/usr/bin/env node

/**
 * Debug script to specifically test service offer notifications
 * and identify why they might not be working after the chat notification fix
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

async function debugServiceOfferNotificationIssue() {
  console.log('🔍 Debugging Service Offer Notification Issue');
  console.log('==============================================\n');

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

    console.log('👤 Seller (Service Provider):', seller.full_name, `(${seller.id})`);
    console.log('👤 Buyer (Will receive notification):', buyer.full_name, `(${buyer.id})`);

    // Step 2: Check recent offer messages and their notifications
    console.log('\n🔍 Checking recent offer messages...');
    const { data: recentOfferMessages, error: messagesError } = await supabase
      .from('chat_messages')
      .select(`
        id,
        chat_id,
        sender_id,
        sender_name,
        message,
        message_type,
        offer_id,
        offer_status,
        custom_price,
        created_at
      `)
      .eq('message_type', 'offer')
      .order('created_at', { ascending: false })
      .limit(5);

    if (messagesError) {
      console.error('❌ Error fetching offer messages:', messagesError);
      return;
    }

    console.log(`📊 Found ${recentOfferMessages?.length || 0} recent offer messages`);

    if (recentOfferMessages && recentOfferMessages.length > 0) {
      for (const message of recentOfferMessages) {
        console.log(`\n📤 Offer Message: ${message.id}`);
        console.log(`   Sender: ${message.sender_name} (${message.sender_id})`);
        console.log(`   Chat: ${message.chat_id}`);
        console.log(`   Offer ID: ${message.offer_id}`);
        console.log(`   Price: $${message.custom_price}`);
        console.log(`   Created: ${message.created_at}`);

        // Find the recipient (other participant in the chat)
        const { data: chatData } = await supabase
          .from('chats')
          .select('participant1_id, participant2_id')
          .eq('id', message.chat_id)
          .single();

        if (chatData) {
          const recipientId = chatData.participant1_id === message.sender_id 
            ? chatData.participant2_id 
            : chatData.participant1_id;

          console.log(`   Recipient: ${recipientId}`);

          // Check if notifications were created for this offer
          const { data: notifications } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', recipientId)
            .eq('type', 'offer')
            .gte('created_at', message.created_at)
            .order('created_at', { ascending: false });

          console.log(`   📱 Notifications for recipient: ${notifications?.length || 0}`);

          if (notifications && notifications.length > 0) {
            notifications.forEach((notif, index) => {
              console.log(`      ${index + 1}. ${notif.title} - ${notif.message}`);
              console.log(`         Created: ${notif.created_at}`);
              console.log(`         Read: ${notif.is_read}`);
              
              if (notif.data) {
                const data = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
                console.log(`         Offer ID in data: ${data.offerId || 'MISSING'}`);
              }
            });
          } else {
            console.log('      ❌ NO NOTIFICATIONS FOUND FOR THIS OFFER!');
          }
        }
      }
    } else {
      console.log('ℹ️ No recent offer messages found');
    }

    // Step 3: Test the notification creation process manually
    console.log('\n🧪 Testing manual offer notification creation...');

    // Clear existing notifications for buyer
    await supabase.from('notifications').delete().eq('user_id', buyer.id);

    // Test 1: Direct RPC call
    console.log('\n1️⃣ Testing direct RPC call...');
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_notification', {
        p_user_id: buyer.id,
        p_type: 'offer',
        p_title: 'Test Offer Notification',
        p_message: 'Test Service - USD 50',
        p_data: {
          chatId: 'test-chat-id',
          participantId: seller.id,
          participantName: seller.full_name,
          participantImage: seller.avatar_url,
          offerId: 'test-offer-id',
          serviceTitle: 'Test Service',
          price: 50,
          currency: 'USD'
        },
        p_id: `test-offer-${Date.now()}`
      });

      if (rpcError) {
        console.error('❌ RPC Error:', rpcError);
      } else {
        console.log('✅ RPC Success, notification ID:', rpcResult);
        
        // Verify notification was created
        const { data: testNotif } = await supabase
          .from('notifications')
          .select('*')
          .eq('id', rpcResult)
          .single();

        if (testNotif) {
          console.log('✅ Test notification found in database');
          console.log('   Title:', testNotif.title);
          console.log('   Message:', testNotif.message);
          console.log('   Type:', testNotif.type);
        } else {
          console.log('❌ Test notification NOT found in database');
        }
      }
    } catch (rpcError) {
      console.error('❌ RPC Exception:', rpcError);
    }

    // Test 2: Using notification service method (simulate)
    console.log('\n2️⃣ Testing notification service method simulation...');
    try {
      const { data: serviceResult, error: serviceError } = await supabase.rpc('create_notification', {
        p_user_id: buyer.id,
        p_type: 'offer',
        p_title: `New offer from ${seller.full_name}`,
        p_message: `Test Service - USD 75`,
        p_data: {
          chatId: 'test-chat-id-2',
          participantId: seller.id,
          participantName: seller.full_name,
          participantImage: seller.avatar_url,
          offerId: 'test-offer-id-2',
          offerStatus: 'pending',
          serviceTitle: 'Test Service',
          price: 75,
          currency: 'USD'
        },
        p_id: `offer_test_${Date.now()}`
      });

      if (serviceError) {
        console.error('❌ Service method simulation error:', serviceError);
      } else {
        console.log('✅ Service method simulation success, notification ID:', serviceResult);
      }
    } catch (serviceError) {
      console.error('❌ Service method simulation exception:', serviceError);
    }

    // Step 4: Check final notification count
    console.log('\n📊 Final notification check...');
    const { data: finalNotifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', buyer.id)
      .order('created_at', { ascending: false });

    console.log(`Total notifications for buyer: ${finalNotifications?.length || 0}`);

    if (finalNotifications && finalNotifications.length > 0) {
      finalNotifications.forEach((notif, index) => {
        console.log(`   ${index + 1}. [${notif.type}] ${notif.title} - ${notif.message}`);
      });
    }

    // Step 5: Test realtime subscription (if possible)
    console.log('\n📡 Testing realtime subscription...');
    console.log('Note: This would require a live app connection to test properly');
    console.log('The realtime subscription should pick up new notifications automatically');

    // Clean up test notifications
    console.log('\n🧹 Cleaning up test notifications...');
    await supabase.from('notifications').delete().eq('user_id', buyer.id);

    console.log('\n📋 Summary:');
    console.log('1. Check if recent offer messages have corresponding notifications');
    console.log('2. Verify RPC function works correctly');
    console.log('3. Test notification service method simulation');
    console.log('4. Ensure realtime subscription is working in the app');

  } catch (error) {
    console.error('❌ Debug failed with error:', error);
  }
}

// Run the debug
debugServiceOfferNotificationIssue().then(() => {
  console.log('\n🏁 Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});