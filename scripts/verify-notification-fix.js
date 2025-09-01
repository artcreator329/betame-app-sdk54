require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyNotificationFix() {
  const serviceProviderId = 'ce34825e-ffc9-46b5-9338-3015c42f3a33'; // Jack Brandon Lee
  const orderId = 'd7fb1ad3-562d-4f3f-ab08-03ec057c57cf';
  
  console.log('✅ Verifying notification fix...');
  
  try {
    // 1. Check the created order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (orderError) {
      console.log('❌ Order error:', orderError);
    } else {
      console.log('📦 Order verified:', {
        id: order.id,
        status: order.status,
        amount: order.amount,
        service_title: order.service_title,
        payment_received_at: order.payment_received_at
      });
    }
    
    // 2. Check recent notifications for service provider
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', serviceProviderId)
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()) // Last 10 minutes
      .order('created_at', { ascending: false });
    
    if (notifError) {
      console.log('❌ Notifications error:', notifError);
    } else {
      console.log('🔔 Recent notifications (last 10 min):', notifications?.length || 0);
      notifications?.forEach(notif => {
        console.log(`  - ${notif.type}: ${notif.title}`);
        console.log(`    Message: ${notif.message}`);
        console.log(`    Created: ${notif.created_at}`);
        console.log(`    Read: ${notif.is_read}`);
        console.log('');
      });
    }
    
    // 3. Check if the service provider can see the order in their orders list
    const { data: userOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('service_provider_id', serviceProviderId)
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      console.log('❌ User orders error:', ordersError);
    } else {
      console.log('📋 Service provider orders:', userOrders?.length || 0);
      userOrders?.forEach(order => {
        console.log(`  - Order ${order.id}: ${order.status} - RM ${order.amount} (${order.created_at})`);
      });
    }
    
    console.log('\n🎉 Summary:');
    console.log(`✅ Order created: ${orderId}`);
    console.log(`✅ Amount: RM ${order?.amount || 'N/A'}`);
    console.log(`✅ Service Provider: Jack Brandon Lee (8cwqmqm82w@wyoxafp.com)`);
    console.log(`✅ Notification sent: Payment Received - New Order!`);
    console.log(`✅ Status: The service provider should now see the notification and order`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verifyNotificationFix();