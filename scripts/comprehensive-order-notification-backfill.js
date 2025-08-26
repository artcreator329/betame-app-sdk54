#!/usr/bin/env node

/**
 * Comprehensive Order Notification Backfill
 * 
 * This script provides multiple strategies to backfill order notifications:
 * 1. From existing orders (if orders table exists)
 * 2. From accepted service offers (creates orders if needed)
 * 3. Quick mode for recent items only
 * 
 * Usage:
 *   node comprehensive-order-notification-backfill.js [options]
 * 
 * Options:
 *   --dry-run          Show what would be done without making changes
 *   --recent           Only process items from last 30 days
 *   --offers-only      Only process service offers, don't create orders
 *   --orders-only      Only process existing orders
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isRecentOnly = args.includes('--recent');
const isOffersOnly = args.includes('--offers-only');
const isOrdersOnly = args.includes('--orders-only');

async function comprehensiveBackfill() {
  console.log('🚀 Comprehensive Order Notification Backfill\n');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  if (isRecentOnly) {
    console.log('⏰ RECENT MODE - Only processing last 30 days\n');
  }

  try {
    let dateFilter = null;
    if (isRecentOnly) {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 30);
    }

    let totalNotificationsCreated = 0;
    let totalOrdersCreated = 0;
    let totalErrors = 0;

    // Strategy 1: Process existing orders (if not offers-only)
    if (!isOffersOnly) {
      console.log('📋 STRATEGY 1: Processing existing orders...\n');
      
      try {
        let ordersQuery = supabase
          .from('orders')
          .select(`
            id,
            buyer_id,
            seller_id,
            service_provider_id,
            amount,
            service_title,
            service_description,
            status,
            created_at,
            service_offer_id
          `)
          .in('status', ['payment_received', 'work_in_progress', 'work_completed', 'buyer_reviewing', 'completed'])
          .order('created_at', { ascending: false });

        if (dateFilter) {
          ordersQuery = ordersQuery.gte('created_at', dateFilter.toISOString());
        }

        const { data: orders, error: ordersError } = await ordersQuery;

        if (ordersError) {
          if (ordersError.code === 'PGRST116') {
            console.log('⚠️ Orders table does not exist, skipping order processing');
          } else {
            throw ordersError;
          }
        } else {
          console.log(`📊 Found ${orders.length} existing orders`);

          if (orders.length > 0) {
            const result = await processOrders(orders, dateFilter);
            totalNotificationsCreated += result.notificationsCreated;
            totalErrors += result.errors;
          }
        }
      } catch (error) {
        console.error('❌ Error processing orders:', error);
        totalErrors++;
      }
    }

    // Strategy 2: Process accepted service offers (if not orders-only)
    if (!isOrdersOnly) {
      console.log('\n📋 STRATEGY 2: Processing accepted service offers...\n');
      
      try {
        let offersQuery = supabase
          .from('service_offers')
          .select(`
            id,
            chat_id,
            service_id,
            service_provider_id,
            seller_id,
            buyer_id,
            original_price,
            custom_price,
            custom_description,
            status,
            accepted_at,
            created_at
          `)
          .in('status', ['accepted', 'in_progress'])
          .order('accepted_at', { ascending: false });

        if (dateFilter) {
          offersQuery = offersQuery.gte('accepted_at', dateFilter.toISOString());
        }

        const { data: offers, error: offersError } = await offersQuery;

        if (offersError) throw offersError;

        console.log(`📊 Found ${offers.length} accepted service offers`);

        if (offers.length > 0) {
          const result = await processServiceOffers(offers);
          totalNotificationsCreated += result.notificationsCreated;
          totalOrdersCreated += result.ordersCreated;
          totalErrors += result.errors;
        }
      } catch (error) {
        console.error('❌ Error processing service offers:', error);
        totalErrors++;
      }
    }

    // Final Summary
    console.log('\n🎯 FINAL SUMMARY:');
    console.log(`   ✅ Total notifications created: ${totalNotificationsCreated}`);
    console.log(`   ✅ Total orders created: ${totalOrdersCreated}`);
    console.log(`   ❌ Total errors: ${totalErrors}`);

    if (totalNotificationsCreated > 0) {
      console.log('\n🎉 Backfill completed successfully!');
      console.log('📱 Service providers should now see notifications for their orders.');
      
      if (!isDryRun) {
        await showNotificationSummary();
      }
    } else {
      console.log('\n✅ No notifications needed to be created.');
    }

  } catch (error) {
    console.error('❌ Comprehensive backfill failed:', error);
    process.exit(1);
  }
}

async function processOrders(orders, dateFilter) {
  console.log('1️⃣ Checking for existing order notifications...');
  
  // Get existing notifications
  let notificationsQuery = supabase
    .from('notifications')
    .select('data')
    .eq('type', 'order')
    .not('data', 'is', null);

  if (dateFilter) {
    notificationsQuery = notificationsQuery.gte('created_at', dateFilter.toISOString());
  }

  const { data: existingNotifications, error: notificationsError } = await notificationsQuery;
  if (notificationsError) throw notificationsError;

  const existingOrderIds = new Set();
  existingNotifications.forEach(notification => {
    if (notification.data && notification.data.orderId) {
      existingOrderIds.add(notification.data.orderId);
    }
  });

  const ordersNeedingNotifications = orders.filter(order => !existingOrderIds.has(order.id));
  
  console.log(`📊 ${existingOrderIds.size} orders already have notifications`);
  console.log(`📊 ${ordersNeedingNotifications.length} orders need notifications`);

  if (ordersNeedingNotifications.length === 0) {
    return { notificationsCreated: 0, errors: 0 };
  }

  if (isDryRun) {
    console.log('\n📋 Orders that would get notifications (showing first 10):');
    ordersNeedingNotifications.slice(0, 10).forEach(order => {
      console.log(`   - ${order.id}: "${order.service_title}" ($${order.amount}) - ${order.status}`);
    });
    return { notificationsCreated: ordersNeedingNotifications.length, errors: 0 };
  }

  // Get buyer profiles and create notifications
  return await createNotificationsForOrders(ordersNeedingNotifications);
}

async function processServiceOffers(offers) {
  console.log('1️⃣ Checking existing data for service offers...');
  
  // Check for existing orders
  const offerIds = offers.map(offer => offer.id);
  const { data: existingOrders } = await supabase
    .from('orders')
    .select('service_offer_id, id')
    .in('service_offer_id', offerIds);

  const existingOrderOfferIds = new Set((existingOrders || []).map(order => order.service_offer_id));

  // Check for existing notifications
  const { data: existingNotifications } = await supabase
    .from('notifications')
    .select('data')
    .eq('type', 'order');

  const existingNotificationOfferIds = new Set();
  (existingNotifications || []).forEach(notification => {
    if (notification.data && (notification.data.offerId || notification.data.orderId)) {
      existingNotificationOfferIds.add(notification.data.offerId || notification.data.orderId);
    }
  });

  const offersNeedingNotifications = offers.filter(offer => 
    !existingNotificationOfferIds.has(offer.id)
  );

  const offersNeedingOrders = offers.filter(offer => 
    !existingOrderOfferIds.has(offer.id)
  );

  console.log(`📊 ${existingOrderOfferIds.size} offers already have orders`);
  console.log(`📊 ${existingNotificationOfferIds.size} offers already have notifications`);
  console.log(`📊 ${offersNeedingNotifications.length} offers need notifications`);
  console.log(`📊 ${offersNeedingOrders.length} offers need orders`);

  if (isDryRun) {
    console.log('\n📋 Offers that would get notifications (showing first 10):');
    offersNeedingNotifications.slice(0, 10).forEach(offer => {
      const amount = offer.custom_price || offer.original_price || 0;
      const title = offer.custom_description || 'Service Order';
      console.log(`   - ${offer.id}: "${title}" ($${amount}) - ${offer.status}`);
    });
    return { 
      notificationsCreated: offersNeedingNotifications.length, 
      ordersCreated: offersNeedingOrders.length,
      errors: 0 
    };
  }

  return await createNotificationsAndOrdersForOffers(
    offersNeedingNotifications, 
    offersNeedingOrders
  );
}

async function createNotificationsForOrders(orders) {
  console.log('2️⃣ Creating notifications for orders...');
  
  // Get buyer profiles
  const buyerIds = [...new Set(orders.map(order => order.buyer_id))];
  const { data: buyerProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', buyerIds);

  const buyerProfileMap = new Map();
  (buyerProfiles || []).forEach(profile => {
    buyerProfileMap.set(profile.id, profile);
  });

  // Get chat IDs
  const serviceOfferIds = orders.map(order => order.service_offer_id).filter(Boolean);
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
  const notifications = orders.map(order => {
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
        backfilledAt: new Date().toISOString(),
        source: 'existing_order'
      },
      created_at: order.created_at,
      is_read: false
    };
  });

  // Insert notifications in batches
  const batchSize = 50;
  let notificationsCreated = 0;
  let errors = 0;

  for (let i = 0; i < notifications.length; i += batchSize) {
    const batch = notifications.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('notifications')
      .insert(batch);

    if (error) {
      console.error(`❌ Error creating notification batch:`, error);
      errors += batch.length;
    } else {
      notificationsCreated += batch.length;
      console.log(`✅ Created ${batch.length} notifications`);
    }
  }

  return { notificationsCreated, errors };
}

async function createNotificationsAndOrdersForOffers(offersNeedingNotifications, offersNeedingOrders) {
  console.log('2️⃣ Processing service offers...');
  
  // Get buyer profiles
  const allOffers = [...new Set([...offersNeedingNotifications, ...offersNeedingOrders])];
  const buyerIds = [...new Set(allOffers.map(offer => offer.buyer_id))];
  
  const { data: buyerProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', buyerIds);

  const buyerProfileMap = new Map();
  (buyerProfiles || []).forEach(profile => {
    buyerProfileMap.set(profile.id, profile);
  });

  let notificationsCreated = 0;
  let ordersCreated = 0;
  let errors = 0;

  // Create notifications for offers
  if (offersNeedingNotifications.length > 0) {
    const notifications = offersNeedingNotifications.map(offer => {
      const buyerProfile = buyerProfileMap.get(offer.buyer_id);
      const buyerName = buyerProfile?.full_name || 'Customer';
      const buyerImage = buyerProfile?.avatar_url || '';
      const serviceProviderId = offer.service_provider_id || offer.seller_id;
      const amount = offer.custom_price || offer.original_price || 0;
      const serviceTitle = offer.custom_description || 'Service Order';

      return {
        user_id: serviceProviderId,
        type: 'order',
        title: `New Order from ${buyerName}`,
        message: `Payment received for "${serviceTitle}" - $${amount}`,
        data: {
          offerId: offer.id,
          chatId: offer.chat_id,
          participantId: offer.buyer_id,
          participantName: buyerName,
          participantImage: buyerImage,
          serviceTitle: serviceTitle,
          amount: amount,
          currency: 'USD',
          orderStatus: 'payment_received',
          isBackfilled: true,
          backfilledAt: new Date().toISOString(),
          source: 'accepted_offer'
        },
        created_at: offer.accepted_at || offer.created_at,
        is_read: false
      };
    });

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notificationError) {
      console.error('❌ Error creating notifications:', notificationError);
      errors += notifications.length;
    } else {
      notificationsCreated = notifications.length;
      console.log(`✅ Created ${notifications.length} notifications from offers`);
    }
  }

  // Create orders for offers that don't have them
  if (offersNeedingOrders.length > 0) {
    const orders = offersNeedingOrders.map(offer => {
      const serviceProviderId = offer.service_provider_id || offer.seller_id;
      const amount = offer.custom_price || offer.original_price || 0;
      const serviceTitle = offer.custom_description || 'Service Order';

      return {
        service_offer_id: offer.id,
        buyer_id: offer.buyer_id,
        seller_id: offer.seller_id || serviceProviderId,
        service_provider_id: serviceProviderId,
        amount: amount,
        platform_fee: Math.round(amount * 0.1),
        total_amount: Math.round(amount * 1.1),
        service_title: serviceTitle,
        service_description: offer.custom_description,
        status: 'payment_received',
        created_at: offer.accepted_at || offer.created_at
      };
    });

    const { error: orderError } = await supabase
      .from('orders')
      .insert(orders);

    if (orderError) {
      console.error('❌ Error creating orders:', orderError);
      errors += orders.length;
    } else {
      ordersCreated = orders.length;
      console.log(`✅ Created ${orders.length} orders from offers`);
    }
  }

  return { notificationsCreated, ordersCreated, errors };
}

async function showNotificationSummary() {
  console.log('\n📊 Final Notification Summary:');
  
  const { data: allOrderNotifications } = await supabase
    .from('notifications')
    .select('user_id, data, created_at')
    .eq('type', 'order')
    .order('created_at', { ascending: false });

  if (allOrderNotifications) {
    const providerCounts = new Map();
    const backfilledCounts = new Map();
    
    allOrderNotifications.forEach(notification => {
      const userId = notification.user_id;
      const count = providerCounts.get(userId) || 0;
      providerCounts.set(userId, count + 1);
      
      if (notification.data && notification.data.isBackfilled) {
        const backfilledCount = backfilledCounts.get(userId) || 0;
        backfilledCounts.set(userId, backfilledCount + 1);
      }
    });

    console.log(`\n📈 Order notifications by service provider:`);
    for (const [providerId, count] of providerCounts.entries()) {
      const backfilled = backfilledCounts.get(providerId) || 0;
      console.log(`   ${providerId}: ${count} total (${backfilled} backfilled)`);
    }
    
    console.log(`\n📊 Total: ${allOrderNotifications.length} order notifications`);
    console.log(`📊 Backfilled: ${Array.from(backfilledCounts.values()).reduce((a, b) => a + b, 0)} notifications`);
  }
}

// Show usage if help requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Comprehensive Order Notification Backfill

Usage: node comprehensive-order-notification-backfill.js [options]

Options:
  --dry-run          Show what would be done without making changes
  --recent           Only process items from last 30 days
  --offers-only      Only process service offers, don't create orders
  --orders-only      Only process existing orders
  --help, -h         Show this help message

Examples:
  node comprehensive-order-notification-backfill.js --dry-run
  node comprehensive-order-notification-backfill.js --recent
  node comprehensive-order-notification-backfill.js --offers-only --dry-run
`);
  process.exit(0);
}

// Run the comprehensive backfill
comprehensiveBackfill();