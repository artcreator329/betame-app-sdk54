#!/usr/bin/env node

/**
 * Diagnostic script to test service offer notification asymmetry
 * Tests why service providers receive notifications but buyers don't
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔍 Diagnosing service offer notification asymmetry...');
  console.log('=======================================================');

  try {
    // 1. Find recent service offers
    console.log('\n📊 1. Checking recent service offers...');
    const { data: offers, error: offersError } = await supabase
      .from('service_offers')
      .select(`
        id,
        chat_id,
        service_provider_id,
        buyer_id,
        status,
        created_at,
        services:service_id (
          title
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (offersError) {
      console.error('❌ Error fetching service offers:', offersError);
      return;
    }

    console.log(`✅ Found ${offers.length} recent service offers`);
    offers.forEach(offer => {
      console.log(`  - ${offer.id}: ${offer.services?.title || 'Unknown Service'} (${offer.status})`);
      console.log(`    Provider: ${offer.service_provider_id}, Buyer: ${offer.buyer_id}`);
      console.log(`    Chat: ${offer.chat_id}, Created: ${offer.created_at}`);
    });

    if (offers.length === 0) {
      console.log('⚠️ No service offers found to test');
      return;
    }

    // 2. Check notifications for each offer
    console.log('\n🔔 2. Checking notifications for each offer...');
    
    for (const offer of offers) {
      console.log(`\\n📋 Checking offer ${offer.id}:`);
      
      // Check notifications for service provider
      const { data: providerNotifications, error: providerError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', offer.service_provider_id)
        .eq('type', 'offer')
        .gte('created_at', offer.created_at);

      if (providerError) {
        console.error('❌ Error fetching provider notifications:', providerError);
      } else {
        console.log(`  📱 Service Provider (${offer.service_provider_id}): ${providerNotifications.length} notifications`);
        providerNotifications.forEach(notif => {
          console.log(`    - ${notif.title}: ${notif.message} (${notif.created_at})`);
        });
      }

      // Check notifications for buyer
      const { data: buyerNotifications, error: buyerError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', offer.buyer_id)
        .eq('type', 'offer')
        .gte('created_at', offer.created_at);

      if (buyerError) {
        console.error('❌ Error fetching buyer notifications:', buyerError);
      } else {
        console.log(`  🛒 Buyer (${offer.buyer_id}): ${buyerNotifications.length} notifications`);
        buyerNotifications.forEach(notif => {
          console.log(`    - ${notif.title}: ${notif.message} (${notif.created_at})`);
        });
      }

      // Check chat messages for this offer
      const { data: chatMessages, error: chatError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('offer_id', offer.id)
        .order('created_at', { ascending: false });

      if (chatError) {
        console.error('❌ Error fetching chat messages:', chatError);
      } else {
        console.log(`  💬 Chat messages for offer: ${chatMessages.length}`);
        chatMessages.forEach(msg => {
          console.log(`    - From ${msg.sender_id}: ${msg.message} (${msg.message_type})`);
        });
      }
    }

    // 3. Test notification creation for both roles
    console.log('\n🧪 3. Testing notification creation...');
    
    // Get test users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .limit(2);

    if (usersError || users.length < 2) {
      console.error('❌ Need at least 2 users for testing');
      return;
    }

    const testProvider = users[0];
    const testBuyer = users[1];

    console.log(`👤 Test Provider: ${testProvider.full_name} (${testProvider.id})`);
    console.log(`👤 Test Buyer: ${testBuyer.full_name} (${testBuyer.id})`);

    // Test notification to provider
    console.log('\\n📤 Testing notification to service provider...');
    const providerTestResult = await supabase.rpc('create_notification', {
      p_user_id: testProvider.id,
      p_type: 'offer',
      p_title: 'Test Offer Notification (Provider)',
      p_message: 'This is a test notification for service provider',
      p_data: {
        test: true,
        role: 'provider'
      },
      p_id: `test_provider_${Date.now()}`
    });

    if (providerTestResult.error) {
      console.error('❌ Provider notification failed:', providerTestResult.error);
    } else {
      console.log('✅ Provider notification created successfully');
    }

    // Test notification to buyer
    console.log('\\n📤 Testing notification to buyer...');
    const buyerTestResult = await supabase.rpc('create_notification', {
      p_user_id: testBuyer.id,
      p_type: 'offer',
      p_title: 'Test Offer Notification (Buyer)',
      p_message: 'This is a test notification for buyer',
      p_data: {
        test: true,
        role: 'buyer'
      },
      p_id: `test_buyer_${Date.now()}`
    });

    if (buyerTestResult.error) {
      console.error('❌ Buyer notification failed:', buyerTestResult.error);
    } else {
      console.log('✅ Buyer notification created successfully');
    }

    // 4. Check RLS policies for notifications
    console.log('\n🔒 4. Checking RLS policies for notifications...');
    
    try {
      const { data: policies, error: policiesError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'notifications');

      if (policiesError) {
        console.error('❌ Error checking RLS policies:', policiesError);
      } else {
        console.log(`✅ Found ${policies.length} RLS policies for notifications table`);
        policies.forEach(policy => {
          console.log(`  - ${policy.policyname}: ${policy.cmd} (${policy.roles})`);
          console.log(`    Expression: ${policy.qual || 'N/A'}`);
        });
      }
    } catch (error) {
      console.log('⚠️ Could not check RLS policies (may not have access)');
    }

    // 5. Check notification service logs
    console.log('\n📝 5. Summary and recommendations...');
    
    console.log('\\n🔍 Analysis:');
    console.log('- Service offers are being created in the database');
    console.log('- Both sendServiceMessage and createServiceOffer have notification logic');
    console.log('- Both functions call notificationService.addOfferNotification()');
    console.log('- Both have fallback RPC notification creation');
    
    console.log('\\n💡 Potential issues to investigate:');
    console.log('1. Check if buyers are properly identified in chat_participants');
    console.log('2. Verify notification service initialization for buyers');
    console.log('3. Check if RLS policies allow buyers to receive notifications');
    console.log('4. Verify realtime subscription setup for buyers');
    console.log('5. Check console logs during offer creation for errors');

    // Cleanup test notifications
    console.log('\\n🧹 Cleaning up test notifications...');
    await supabase
      .from('notifications')
      .delete()
      .like('id', 'test_%');

    console.log('✅ Cleanup completed');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

main().catch(console.error);