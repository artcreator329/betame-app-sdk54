#!/usr/bin/env node

/**
 * Backfill Notifications from Accepted Service Offers
 * 
 * This script handles the case where orders might not exist yet, but there are
 * accepted service offers that should have generated order notifications.
 * It can also create the missing orders if needed.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function backfillFromAcceptedOffers() {
  console.log('🔄 Backfilling Notifications from Accepted Service Offers...\n');

  try {
    // Step 1: Find all accepted service offers
    console.log('1️⃣ Finding accepted service offers...');
    
    const { data: acceptedOffers, error: offersError } = await supabase
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

    if (offersError) throw offersError;

    console.log(`📊 Found ${acceptedOffers.length} accepted service offers`);

    if (acceptedOffers.length === 0) {
      console.log('✅ No accepted offers found');
      return;
    }

    // Step 2: Check which offers already have corresponding orders
    console.log('\n2️⃣ Checking for existing orders...');
    
    const offerIds = acceptedOffers.map(offer => offer.id);
    const { data: existingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('service_offer_id, id')
      .in('service_offer_id', offerIds);

    if (ordersError && ordersError.code !== 'PGRST116') { // PGRST116 = table doesn't exist
      throw ordersError;
    }

    const existingOrderOfferIds = new Set((existingOrders || []).map(order => order.service_offer_id));
    const offersWithoutOrders = acceptedOffers.filter(offer => !existingOrderOfferIds.has(offer.id));

    console.log(`📊 ${existingOrderOfferIds.size} offers already have orders`);
    console.log(`📊 ${offersWithoutOrders.length} offers need orders and notifications`);

    // Step 3: Check for existing notifications
    console.log('\n3️⃣ Checking for existing order notifications...');
    
    const { data: existingNotifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('data')
      .eq('type', 'order');

    if (notificationsError) throw notificationsError;

    const existingNotificationOfferIds = new Set();
    existingNotifications.forEach(notification => {
      if (notification.data && notification.data.offerId) {
        existingNotificationOfferIds.add(notification.data.offerId);
      }
    });

    // Step 4: Get buyer profiles
    console.log('\n4️⃣ Fetching buyer profiles...');
    
    const buyerIds = [...new Set(acceptedOffers.map(offer => offer.buyer_id))];
    const { data: buyerProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', buyerIds);

    if (profilesError) throw profilesError;

    const buyerProfileMap = new Map();
    buyerProfiles.forEach(profile => {
      buyerProfileMap.set(profile.id, profile);
    });

    // Step 5: Process offers that need notifications
    console.log('\n5️⃣ Processing accepted offers...');
    
    let notificationsCreated = 0;
    let ordersCreated = 0;
    let errors = 0;

    for (const offer of acceptedOffers) {
      try {
        const serviceProviderId = offer.service_provider_id || offer.seller_id;
        const buyerProfile = buyerProfileMap.get(offer.buyer_id);
        const buyerName = buyerProfile?.full_name || 'Customer';
        const buyerImage = buyerProfile?.avatar_url || '';
        const amount = offer.custom_price || offer.original_price || 0;
        const serviceTitle = offer.custom_description || 'Service Order';

        // Check if notification already exists for this offer
        const hasNotification = existingNotificationOfferIds.has(offer.id);
        
        if (!hasNotification) {
          // Create notification for this accepted offer
          const notificationData = {
            user_id: serviceProviderId,
            type: 'order',
            title: `New Order from ${buyerName}`,
            message: `Payment received for "${serviceTitle}" - $${amount}`,
            data: {
              offerId: offer.id, // Use offer ID since we might not have order ID
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
              source: 'accepted_offer' // Mark the source
            },
            created_at: offer.accepted_at || offer.created_at,
            is_read: false
          };

          const { error: notificationError } = await supabase
            .from('notifications')
            .insert(notificationData);

          if (notificationError) {
            console.error(`❌ Error creating notification for offer ${offer.id}:`, notificationError);
            errors++;
          } else {
            notificationsCreated++;
            console.log(`✅ Created notification for offer ${offer.id}`);
          }
        }

        // If orders table exists and this offer doesn't have an order, create one
        if (existingOrders !== null && !existingOrderOfferIds.has(offer.id)) {
          const orderData = {
            service_offer_id: offer.id,
            buyer_id: offer.buyer_id,
            seller_id: offer.seller_id || serviceProviderId,
            service_provider_id: serviceProviderId,
            amount: amount,
            platform_fee: Math.round(amount * 0.1), // 10% platform fee
            total_amount: Math.round(amount * 1.1),
            service_title: serviceTitle,
            service_description: offer.custom_description,
            status: 'payment_received'
          };

          const { error: orderError } = await supabase
            .from('orders')
            .insert(orderData);

          if (orderError) {
            console.error(`❌ Error creating order for offer ${offer.id}:`, orderError);
            errors++;
          } else {
            ordersCreated++;
            console.log(`✅ Created order for offer ${offer.id}`);
          }
        }

      } catch (error) {
        console.error(`❌ Error processing offer ${offer.id}:`, error);
        errors++;
      }

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Step 6: Summary
    console.log('\n6️⃣ Backfill Summary:');
    console.log(`   📊 Accepted offers processed: ${acceptedOffers.length}`);
    console.log(`   ✅ Notifications created: ${notificationsCreated}`);
    console.log(`   ✅ Orders created: ${ordersCreated}`);
    console.log(`   ❌ Errors: ${errors}`);

    if (notificationsCreated > 0) {
      console.log('\n🎉 Backfill from accepted offers completed successfully!');
      console.log('📱 Service providers should now see notifications for their accepted offers.');
    }

    // Step 7: Show notification counts by service provider
    console.log('\n7️⃣ Notification summary by service provider...');
    
    const { data: allOrderNotifications } = await supabase
      .from('notifications')
      .select('user_id, data')
      .eq('type', 'order');

    if (allOrderNotifications) {
      const providerCounts = new Map();
      allOrderNotifications.forEach(notification => {
        const count = providerCounts.get(notification.user_id) || 0;
        providerCounts.set(notification.user_id, count + 1);
      });

      console.log(`📊 Total order notifications by service provider:`);
      for (const [providerId, count] of providerCounts.entries()) {
        console.log(`   ${providerId}: ${count} notifications`);
      }
    }

  } catch (error) {
    console.error('❌ Backfill from accepted offers failed:', error);
    process.exit(1);
  }
}

// Add dry run option
const isDryRun = process.argv.includes('--dry-run');

if (isDryRun) {
  console.log('🔍 Running in DRY RUN mode - no data will be created\n');
  
  async function dryRunFromOffers() {
    try {
      const { data: acceptedOffers } = await supabase
        .from('service_offers')
        .select('id, status, buyer_id, service_provider_id, seller_id, custom_price, original_price, custom_description')
        .in('status', ['accepted', 'in_progress']);

      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('data')
        .eq('type', 'order');

      const existingNotificationOfferIds = new Set();
      (existingNotifications || []).forEach(notification => {
        if (notification.data && notification.data.offerId) {
          existingNotificationOfferIds.add(notification.data.offerId);
        }
      });

      const offersNeedingNotifications = (acceptedOffers || []).filter(offer => 
        !existingNotificationOfferIds.has(offer.id)
      );

      console.log('📊 DRY RUN RESULTS:');
      console.log(`   Total accepted offers: ${acceptedOffers?.length || 0}`);
      console.log(`   Offers with existing notifications: ${existingNotificationOfferIds.size}`);
      console.log(`   Offers needing notifications: ${offersNeedingNotifications.length}`);

      if (offersNeedingNotifications.length > 0) {
        console.log('\n📋 Offers that would get notifications:');
        offersNeedingNotifications.slice(0, 10).forEach(offer => {
          const amount = offer.custom_price || offer.original_price || 0;
          const title = offer.custom_description || 'Service Order';
          console.log(`   - ${offer.id}: "${title}" ($${amount}) - ${offer.status}`);
        });
        
        if (offersNeedingNotifications.length > 10) {
          console.log(`   ... and ${offersNeedingNotifications.length - 10} more`);
        }
      }

      console.log('\n💡 To run the actual backfill, remove the --dry-run flag');
    } catch (error) {
      console.error('❌ Dry run failed:', error);
    }
  }
  
  dryRunFromOffers();
} else {
  backfillFromAcceptedOffers();
}