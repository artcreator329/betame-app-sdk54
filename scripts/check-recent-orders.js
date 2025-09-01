require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRecentOrders() {
  const userEmail = '8cwqmqm82w@wyoxafp.com';
  const userId = 'ce34825e-ffc9-46b5-9338-3015c42f3a33';
  
  console.log('🔍 Checking recent orders for user:', userEmail);
  
  try {
    // Check orders table
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .or(`buyer_id.eq.${userId},service_provider_id.eq.${userId}`)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      console.log('❌ Orders error:', ordersError);
      
      // Try legacy_orders table as suggested by the hint
      const { data: legacyOrders, error: legacyError } = await supabase
        .from('legacy_orders')
        .select('*')
        .or(`buyer_id.eq.${userId},service_provider_id.eq.${userId}`)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
      
      if (legacyError) {
        console.log('❌ Legacy orders error:', legacyError);
      } else {
        console.log('📦 Legacy orders found:', legacyOrders?.length || 0);
        legacyOrders?.forEach(order => {
          console.log(`  - Order ${order.id}: ${order.status} (${order.created_at})`);
        });
      }
    } else {
      console.log('📦 Orders found:', orders?.length || 0);
      orders?.forEach(order => {
        console.log(`  - Order ${order.id}: ${order.status} (${order.created_at})`);
      });
    }
    
    // Check service_offers table for recent activity
    const { data: offers, error: offersError } = await supabase
      .from('service_offers')
      .select(`
        id,
        buyer_id,
        service_provider_id,
        status,
        created_at,
        updated_at,
        services (
          title
        )
      `)
      .or(`buyer_id.eq.${userId},service_provider_id.eq.${userId}`)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (offersError) {
      console.log('❌ Service offers error:', offersError);
    } else {
      console.log('💼 Service offers found:', offers?.length || 0);
      offers?.forEach(offer => {
        console.log(`  - Offer ${offer.id}: ${offer.status} (${offer.created_at})`);
        if (offer.services) {
          console.log(`    Service: ${offer.services.title}`);
        }
      });
    }
    
    // Check for very recent orders (last 2 hours)
    const { data: veryRecentOrders, error: veryRecentError } = await supabase
      .from('orders')
      .select('*')
      .or(`buyer_id.eq.${userId},service_provider_id.eq.${userId}`)
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (!veryRecentError && veryRecentOrders && veryRecentOrders.length > 0) {
      console.log('🆕 Very recent orders (last 2h):');
      veryRecentOrders.forEach(order => {
        console.log(`  - Order ${order.id}: ${order.status} (${order.created_at})`);
      });
    }
    
    // Check notifications related to orders
    const { data: orderNotifications, error: orderNotifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'order')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (orderNotifError) {
      console.log('❌ Order notifications error:', orderNotifError);
    } else {
      console.log('🔔 Order notifications found:', orderNotifications?.length || 0);
      orderNotifications?.forEach(notif => {
        console.log(`  - ${notif.title} (${notif.created_at}) - Read: ${notif.is_read}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkRecentOrders();