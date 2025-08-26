#!/usr/bin/env node

/**
 * Backfill Order Notifications Script
 * 
 * This script finds all existing orders that should have generated notifications
 * but didn't (because the notification system wasn't connected), and creates
 * the missing notifications for service providers.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function backfillOrderNotifications() {
  console.log('🔄 Starting Order Notifications Backfill...\n');

  try {
    // Step 1: Find all existing orders that should have notifications
    console.log('1️⃣ Finding existing orders without notifications...');
    
    const { data: orders, error: ordersError } = await supabase
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

    if (ordersError) throw ordersError;

    console.log(`📊 Found ${orders.length} existing orders to check`);

    if (orders.length === 0) {
      console.log('✅ No orders found to backfill');
      return;
    }

    // Step 2: Check which orders already have notifications
    console.log('\n2️⃣ Checking for existing order notifications...');
    
    const orderIds = orders.map(order => order.id);
    const { data: existingNotifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('data')
      .eq('type', 'order')
      .not('data', 'is', null);

    if (notificationsError) throw notificationsError;

    // Extract order IDs from existing notifications
    const existingOrderIds = new Set();
    existingNotifications.forEach(notification => {
      if (notification.data && notification.data.orderId) {
        existingOrderIds.add(notification.data.orderId);
      }
    });

    console.log(`📊 Found ${existingOrderIds.size} orders that already have notifications`);

    // Step 3: Filter orders that need notifications
    const ordersNeedingNotifications = orders.filter(order => !existingOrderIds.has(order.id));
    
    console.log(`📊 ${ordersNeedingNotifications.length} orders need notifications`);

    if (ordersNeedingNotifications.length === 0) {
      console.log('✅ All orders already have notifications');
      return;
    }

    // Step 4: Get buyer profiles for all orders needing notifications
    console.log('\n3️⃣ Fetching buyer profiles...');
    
    const buyerIds = [...new Set(ordersNeedingNotifications.map(order => order.buyer_id))];
    const { data: buyerProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', buyerIds);

    if (profilesError) throw profilesError;

    const buyerProfileMap = new Map();
    buyerProfiles.forEach(profile => {
      buyerProfileMap.set(profile.id, profile);
    });

    console.log(`📊 Fetched ${buyerProfiles.length} buyer profiles`);

    // Step 5: Get chat IDs for orders (if available)
    console.log('\n4️⃣ Fetching chat information...');
    
    const serviceOfferIds = ordersNeedingNotifications
      .map(order => order.service_offer_id)
      .filter(Boolean);

    let chatMap = new Map();
    if (serviceOfferIds.length > 0) {
      const { data: serviceOffers, error: offersError } = await supabase
        .from('service_offers')
        .select('id, chat_id')
        .in('id', serviceOfferIds);

      if (!offersError && serviceOffers) {
        serviceOffers.forEach(offer => {
          chatMap.set(offer.id, offer.chat_id);
        });
      }
    }

    // Step 6: Create notifications for each order
    console.log('\n5️⃣ Creating missing order notifications...');
    
    let successCount = 0;
    let errorCount = 0;
    const batchSize = 10; // Process in batches to avoid overwhelming the system

    for (let i = 0; i < ordersNeedingNotifications.length; i += batchSize) {
      const batch = ordersNeedingNotifications.slice(i, i + batchSize);
      
      console.log(`   Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(ordersNeedingNotifications.length/batchSize)}...`);

      const notificationsToCreate = batch.map(order => {
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
            isBackfilled: true, // Mark as backfilled for tracking
            backfilledAt: new Date().toISOString()
          },
          created_at: order.created_at, // Use original order creation time
          is_read: false
        };
      });

      // Insert notifications in batch
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToCreate);

      if (insertError) {
        console.error(`❌ Error creating notifications for batch:`, insertError);
        errorCount += batch.length;
      } else {
        console.log(`✅ Created ${batch.length} notifications`);
        successCount += batch.length;
      }

      // Small delay between batches
      if (i + batchSize < ordersNeedingNotifications.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Step 7: Summary
    console.log('\n6️⃣ Backfill Summary:');
    console.log(`   📊 Total orders processed: ${ordersNeedingNotifications.length}`);
    console.log(`   ✅ Notifications created: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (successCount > 0) {
      console.log('\n🎉 Order notifications backfill completed successfully!');
      console.log('\n📱 Service providers should now see notifications for all their past orders.');
      console.log('   These notifications are marked with "isBackfilled: true" in their data.');
    }

    // Step 8: Verification
    console.log('\n7️⃣ Verification - Checking notification counts by service provider...');
    
    const { data: notificationCounts, error: countError } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('type', 'order');

    if (!countError && notificationCounts) {
      const countMap = new Map();
      notificationCounts.forEach(notification => {
        const count = countMap.get(notification.user_id) || 0;
        countMap.set(notification.user_id, count + 1);
      });

      console.log(`📊 Order notifications by service provider:`);
      for (const [userId, count] of countMap.entries()) {
        console.log(`   ${userId}: ${count} notifications`);
      }
    }

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Add option to run in dry-run mode
const isDryRun = process.argv.includes('--dry-run');

if (isDryRun) {
  console.log('🔍 Running in DRY RUN mode - no notifications will be created\n');
  
  async function dryRunBackfill() {
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, buyer_id, seller_id, service_provider_id, amount, service_title, status, created_at')
        .in('status', ['payment_received', 'work_in_progress', 'work_completed', 'buyer_reviewing', 'completed'])
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const { data: existingNotifications, error: notificationsError } = await supabase
        .from('notifications')
        .select('data')
        .eq('type', 'order')
        .not('data', 'is', null);

      if (notificationsError) throw notificationsError;

      const existingOrderIds = new Set();
      existingNotifications.forEach(notification => {
        if (notification.data && notification.data.orderId) {
          existingOrderIds.add(notification.data.orderId);
        }
      });

      const ordersNeedingNotifications = orders.filter(order => !existingOrderIds.has(order.id));

      console.log('📊 DRY RUN RESULTS:');
      console.log(`   Total orders in system: ${orders.length}`);
      console.log(`   Orders with existing notifications: ${existingOrderIds.size}`);
      console.log(`   Orders needing notifications: ${ordersNeedingNotifications.length}`);
      
      if (ordersNeedingNotifications.length > 0) {
        console.log('\n📋 Orders that would get notifications:');
        ordersNeedingNotifications.slice(0, 10).forEach(order => {
          console.log(`   - ${order.id}: "${order.service_title}" ($${order.amount}) - ${order.status}`);
        });
        
        if (ordersNeedingNotifications.length > 10) {
          console.log(`   ... and ${ordersNeedingNotifications.length - 10} more`);
        }
      }

      console.log('\n💡 To run the actual backfill, remove the --dry-run flag');
    } catch (error) {
      console.error('❌ Dry run failed:', error);
    }
  }
  
  dryRunBackfill();
} else {
  backfillOrderNotifications();
}