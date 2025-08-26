#!/usr/bin/env node

/**
 * Quick Backfill for Recent Orders
 * 
 * This script quickly backfills notifications for orders from the last 30 days
 * that service providers never received notifications for.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function quickBackfillRecentOrders() {
  console.log('⚡ Quick Backfill for Recent Orders (Last 30 Days)...\n');

  try {
    // Get orders from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log('1️⃣ Finding recent orders...');
    
    const { data: recentOrders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        buyer_id,
        seller_id,
        service_provider_id,
        amount,
        service_title,
        status,
        created_at,
        service_offer_id
      `)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .in('status', ['payment_received', 'work_in_progress', 'work_completed', 'buyer_reviewing', 'completed'])
      .order('created_at', { ascending: false });

    if (ordersError) throw ordersError;

    console.log(`📊 Found ${recentOrders.length} recent orders`);

    if (recentOrders.length === 0) {
      console.log('✅ No recent orders found');
      return;
    }

    // Check for existing notifications
    console.log('\n2️⃣ Checking existing notifications...');
    
    const { data: existingNotifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('data')
      .eq('type', 'order')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (notificationsError) throw notificationsError;

    const existingOrderIds = new Set();
    existingNotifications.forEach(notification => {
      if (notification.data && notification.data.orderId) {
        existingOrderIds.add(notification.data.orderId);
      }
    });

    const ordersNeedingNotifications = recentOrders.filter(order => !existingOrderIds.has(order.id));
    
    console.log(`📊 ${ordersNeedingNotifications.length} recent orders need notifications`);

    if (ordersNeedingNotifications.length === 0) {
      console.log('✅ All recent orders already have notifications');
      return;
    }

    // Get buyer profiles
    console.log('\n3️⃣ Creating notifications...');
    
    const buyerIds = [...new Set(ordersNeedingNotifications.map(order => order.buyer_id))];
    const { data: buyerProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', buyerIds);

    const buyerProfileMap = new Map();
    (buyerProfiles || []).forEach(profile => {
      buyerProfileMap.set(profile.id, profile);
    });

    // Get chat IDs
    const serviceOfferIds = ordersNeedingNotifications
      .map(order => order.service_offer_id)
      .filter(Boolean);

    let chatMap = new Map();
    if (serviceOfferIds.length > 0) {
      const { data: serviceOffers } = await supabase
        .from('service_offers')
        .select('id, chat_id')
        .in('id', serviceOfferIds);

      (serviceOffers || []).forEach(offer => {
        chatMap.set(offer.id, offer.chat_id);
      });
    }

    // Create notifications
    const notifications = ordersNeedingNotifications.map(order => {
      const buyerProfile = buyerProfileMap.get(order.buyer_id);
      const buyerName = buyerProfile?.full_name || 'Customer';
      const buyerImage = buyerProfile?.avatar_url || '';
      const serviceProviderId = order.service_provider_id || order.seller_id;
      const chatId = chatMap.get(order.service_offer_id);

      return {
        user_id: serviceProviderId,
        type: 'order',
        title: `New Order from ${buyerName}`,
        message: `Payment received for "${order.service_title}" - $${order.amount}`,
        data: {
          orderId: order.id,
          chatId: chatId,
          participantId: order.buyer_id,
          participantName: buyerName,
          participantImage: buyerImage,
          serviceTitle: order.service_title,
          amount: order.amount,
          currency: 'USD',
          orderStatus: order.status,
          isBackfilled: true,
          backfilledAt: new Date().toISOString()
        },
        created_at: order.created_at,
        is_read: false
      };
    });

    // Insert all notifications
    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('❌ Error creating notifications:', insertError);
      throw insertError;
    }

    console.log(`✅ Successfully created ${notifications.length} order notifications!`);

    // Show summary by service provider
    const providerCounts = new Map();
    notifications.forEach(notification => {
      const count = providerCounts.get(notification.user_id) || 0;
      providerCounts.set(notification.user_id, count + 1);
    });

    console.log('\n📊 Notifications created by service provider:');
    for (const [providerId, count] of providerCounts.entries()) {
      console.log(`   ${providerId}: ${count} notifications`);
    }

    console.log('\n🎉 Quick backfill completed successfully!');
    console.log('📱 Service providers should now see notifications for their recent orders.');

  } catch (error) {
    console.error('❌ Quick backfill failed:', error);
    process.exit(1);
  }
}

// Run the quick backfill
quickBackfillRecentOrders();