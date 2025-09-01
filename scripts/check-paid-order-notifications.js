require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPaidOrderNotifications() {
  const serviceProviderId = 'ce34825e-ffc9-46b5-9338-3015c42f3a33'; // Jack Brandon Lee
  
  console.log('🔍 Checking for paid orders and notifications...');
  
  try {
    // 1. Check for orders with payment status or amount RM 5.11
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .or(`buyer_id.eq.${serviceProviderId},service_provider_id.eq.${serviceProviderId}`)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      console.log('❌ Orders error:', ordersError);
    } else {
      console.log('📦 Orders found (last 24h):', orders?.length || 0);
      orders?.forEach(order => {
        console.log(`  - Order ${order.id}: ${order.status} (${order.created_at})`);
        console.log(`    Buyer: ${order.buyer_id}, SP: ${order.service_provider_id}`);
      });
    }
    
    // 2. Check service offers that might have been converted to orders
    const { data: offers, error: offersError } = await supabase
      .from('service_offers')
      .select(`
        *,
        services (
          title,
          price
        )
      `)
      .eq('service_provider_id', serviceProviderId)
      .eq('status', 'accepted')
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('updated_at', { ascending: false });
    
    if (offersError) {
      console.log('❌ Offers error:', offersError);
    } else {
      console.log('💼 Accepted offers (last 24h):', offers?.length || 0);
      offers?.forEach(offer => {
        console.log(`  - Offer ${offer.id}: ${offer.status} (${offer.updated_at})`);
        console.log(`    Price: ${offer.price || offer.services?.price}, Service: ${offer.services?.title}`);
        
        // Check if there's an order for this offer
        supabase
          .from('orders')
          .select('*')
          .eq('service_offer_id', offer.id)
          .then(({ data: relatedOrders }) => {
            if (relatedOrders && relatedOrders.length > 0) {
              console.log(`    ✅ Has order: ${relatedOrders[0].id} (${relatedOrders[0].status})`);
            } else {
              console.log(`    ❌ No order found for this accepted offer`);
            }
          });
      });
    }
    
    // 3. Check for any orders with specific amount (5.11)
    const { data: specificOrders, error: specificError } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (!specificError && specificOrders) {
      const rm511Orders = specificOrders.filter(order => {
        // Check if any field contains 5.11 or similar
        const orderStr = JSON.stringify(order).toLowerCase();
        return orderStr.includes('5.11') || orderStr.includes('511');
      });
      
      if (rm511Orders.length > 0) {
        console.log('💰 Orders with RM 5.11:');
        rm511Orders.forEach(order => {
          console.log(`  - Order ${order.id}: ${order.status} (${order.created_at})`);
          console.log(`    Buyer: ${order.buyer_id}, SP: ${order.service_provider_id}`);
        });
      }
    }
    
    // 4. Check recent notifications for the service provider
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', serviceProviderId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (notifError) {
      console.log('❌ Notifications error:', notifError);
    } else {
      console.log('🔔 Recent notifications for service provider:', notifications?.length || 0);
      
      const orderNotifications = notifications?.filter(n => n.type === 'order' || n.title?.toLowerCase().includes('order') || n.title?.toLowerCase().includes('payment'));
      console.log('📦 Order/Payment notifications:', orderNotifications?.length || 0);
      
      orderNotifications?.forEach(notif => {
        console.log(`  - ${notif.title}: ${notif.message} (${notif.created_at})`);
      });
    }
    
    // 5. Check if there are any database triggers for order notifications
    const { data: triggers, error: triggersError } = await supabase
      .rpc('get_triggers_info')
      .catch(() => null);
    
    // 6. Look for any webhook or payment processing logs
    console.log('\n🔍 Checking for payment processing patterns...');
    
    // Check if there are any recent database changes that might indicate payment processing
    const { data: recentActivity, error: activityError } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
      .order('created_at', { ascending: false });
    
    if (!activityError && recentActivity && recentActivity.length > 0) {
      console.log('🆕 Very recent orders (last 2h):');
      recentActivity.forEach(order => {
        console.log(`  - Order ${order.id}: ${order.status} (${order.created_at})`);
        if (order.service_provider_id === serviceProviderId) {
          console.log(`    ⭐ This is for our service provider!`);
        }
      });
    } else {
      console.log('❌ No recent orders found in last 2 hours');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkPaidOrderNotifications();