#!/usr/bin/env node

/**
 * Debug script to check recent service offers and their notifications
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

async function debugRecentServiceOffers() {
  console.log('🔍 Debugging Recent Service Offers and Notifications');
  console.log('==================================================\n');

  try {
    // Get recent service offers
    const { data: offers, error: offersError } = await supabase
      .from('service_offers')
      .select(`
        *,
        chat_messages!inner(*)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (offersError) {
      console.error('❌ Error fetching service offers:', offersError);
      return;
    }

    console.log(`📊 Found ${offers?.length || 0} recent service offers with messages\n`);

    if (!offers || offers.length === 0) {
      console.log('ℹ️ No recent service offers found');
      return;
    }

    for (const offer of offers) {
      console.log(`🛍️ Offer ID: ${offer.id}`);
      console.log(`   Service Provider: ${offer.service_provider_id}`);
      console.log(`   Buyer: ${offer.buyer_id}`);
      console.log(`   Status: ${offer.status}`);
      console.log(`   Created: ${offer.created_at}`);
      console.log(`   Chat Messages: ${offer.chat_messages?.length || 0}`);

      // Check if notifications were created for this offer
      const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', offer.buyer_id)
        .ilike('message', `%${offer.id}%`)
        .order('created_at', { ascending: false });

      if (notifError) {
        console.error('   ❌ Error fetching notifications:', notifError);
      } else {
        console.log(`   📱 Notifications for buyer: ${notifications?.length || 0}`);
        
        if (notifications && notifications.length > 0) {
          notifications.forEach((notif, index) => {
            console.log(`      ${index + 1}. [${notif.type}] ${notif.title}`);
            console.log(`         Message: ${notif.message}`);
            console.log(`         Created: ${notif.created_at}`);
            console.log(`         Read: ${notif.is_read}`);
          });
        }
      }

      // Also check for any notifications with the offer data
      const { data: offerNotifications, error: offerNotifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', offer.buyer_id)
        .eq('type', 'offer')
        .gte('created_at', offer.created_at)
        .order('created_at', { ascending: false });

      if (!offerNotifError && offerNotifications && offerNotifications.length > 0) {
        console.log(`   🎯 Offer-type notifications: ${offerNotifications.length}`);
        offerNotifications.forEach((notif, index) => {
          console.log(`      ${index + 1}. ${notif.title} - ${notif.message}`);
          if (notif.data) {
            const data = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
            console.log(`         Offer ID in data: ${data.offerId || 'MISSING'}`);
          }
        });
      }

      console.log(''); // Empty line for readability
    }

    // Check for any recent offer notifications regardless of offer
    console.log('📱 Recent offer notifications (last 10):');
    const { data: recentOfferNotifs, error: recentError } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'offer')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('❌ Error fetching recent offer notifications:', recentError);
    } else if (recentOfferNotifs && recentOfferNotifs.length > 0) {
      recentOfferNotifs.forEach((notif, index) => {
        console.log(`   ${index + 1}. ${notif.title} - ${notif.message}`);
        console.log(`      User: ${notif.user_id}`);
        console.log(`      Created: ${notif.created_at}`);
        console.log(`      Read: ${notif.is_read}`);
      });
    } else {
      console.log('   ℹ️ No recent offer notifications found');
    }

  } catch (error) {
    console.error('❌ Debug failed with error:', error);
  }
}

// Run the debug
debugRecentServiceOffers().then(() => {
  console.log('\n🏁 Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});