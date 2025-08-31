#!/usr/bin/env node

/**
 * Test script to verify that the offer notification fix works
 * This tests that buyers receive notifications when offers are sent
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

async function testOfferNotificationFix() {
  console.log('🧪 Testing Offer Notification Fix');
  console.log('==================================\n');

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
    const buyer = users[1];  // Buyer who should receive notification

    console.log('👤 Seller (Service Provider):', seller.full_name, `(${seller.id})`);
    console.log('👤 Buyer (Should receive notification):', buyer.full_name, `(${buyer.id})`);

    // Get or create a test service
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
          title: 'Test Service for Offer Notification',
          description: 'Test service description',
          price: 100.00,
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

    // Create or get chat
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

    // Ensure chat participants exist
    await supabase
      .from('chat_participants')
      .upsert([
        { chat_id: chatId, user_id: seller.id, joined_at: new Date().toISOString(), is_blocked: false },
        { chat_id: chatId, user_id: buyer.id, joined_at: new Date().toISOString(), is_blocked: false }
      ], { 
        onConflict: 'chat_id,user_id',
        ignoreDuplicates: true 
      });

    // Clear existing notifications for buyer
    console.log('\n🧹 Clearing existing notifications for buyer...');
    await supabase.from('notifications').delete().eq('user_id', buyer.id);

    // Count notifications before
    const { data: beforeNotifications } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', buyer.id);

    const beforeCount = beforeNotifications?.length || 0;
    console.log(`📊 Notifications before: ${beforeCount}`);

    // Create service offer (this simulates what happens when seller sends offer)
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
        custom_description: 'Test offer for notification fix',
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

    // Create the offer message (this triggers the realtime listeners)
    console.log('\n📤 Creating offer message (this should trigger notification)...');
    const { data: messageData, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        sender_id: seller.id,
        sender_name: seller.full_name || 'Test Seller',
        sender_image: seller.avatar_url || 'https://via.placeholder.com/40',
        message: `Shared a service: ${testService.title}`,
        message_type: 'offer', // This is the key - should trigger offer notification
        offer_id: offerData.id,
        offer_status: 'pending',
        offer_expires_at: expiresAt.toISOString(),
        custom_price: testService.price,
        custom_description: 'Test offer for notification fix',
      })
      .select()
      .single();

    if (messageError) {
      console.error('❌ Error creating offer message:', messageError);
      return;
    }

    console.log('✅ Offer message created:', messageData.id);
    console.log('   Message type:', messageData.message_type);
    console.log('   Offer ID:', messageData.offer_id);

    // Wait for realtime processing
    console.log('\n⏳ Waiting for realtime notification processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check notifications after
    const { data: afterNotifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', buyer.id)
      .order('created_at', { ascending: false });

    const afterCount = afterNotifications?.length || 0;
    const newNotifications = afterCount - beforeCount;

    console.log(`📊 Notifications after: ${afterCount}`);
    console.log(`📊 New notifications: ${newNotifications}`);

    // Analyze results
    if (newNotifications >= 1) {
      console.log('\n✅ SUCCESS: Offer notification(s) created!');
      
      const offerNotifications = afterNotifications.filter(n => n.type === 'offer');
      console.log(`📋 Offer notifications: ${offerNotifications.length}`);
      
      offerNotifications.forEach((notif, index) => {
        console.log(`   ${index + 1}. ${notif.title}`);
        console.log(`      Message: ${notif.message}`);
        console.log(`      Created: ${notif.created_at}`);
        console.log(`      Read: ${notif.is_read}`);
        
        if (notif.data) {
          const data = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
          console.log(`      Offer ID: ${data.offerId || 'MISSING'}`);
          console.log(`      Chat ID: ${data.chatId || 'MISSING'}`);
        }
      });

      if (newNotifications > 1) {
        console.log(`\n⚠️ WARNING: ${newNotifications} notifications created (might be duplicates)`);
        console.log('This could indicate both primary and backup notifications are working');
      }
      
    } else {
      console.log('\n❌ ISSUE: No offer notifications were created!');
      console.log('The fix did not work - buyers still won\'t receive offer notifications');
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('notifications').delete().eq('user_id', buyer.id);
    await supabase.from('chat_messages').delete().eq('id', messageData.id);
    await supabase.from('service_offers').delete().eq('id', offerData.id);

    console.log('✅ Cleanup completed');

    // Summary
    console.log('\n📋 Test Summary:');
    if (newNotifications >= 1) {
      console.log('✅ PASS: Buyers will receive notifications when offers are sent');
      if (newNotifications > 1) {
        console.log('⚠️ NOTE: Multiple notifications detected - may need duplicate prevention');
      }
    } else {
      console.log('❌ FAIL: Buyers will NOT receive notifications when offers are sent');
      console.log('💡 The realtime backup notification system is not working');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testOfferNotificationFix().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});