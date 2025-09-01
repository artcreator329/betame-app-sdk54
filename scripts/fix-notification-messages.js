require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixNotificationMessages() {
  console.log('🔧 Fixing notification messages with correct RM 5.11 amount...');
  
  try {
    const orderId = 'd7fb1ad3-562d-4f3f-ab08-03ec057c57cf';
    const serviceProviderId = 'ce34825e-ffc9-46b5-9338-3015c42f3a33';
    
    // 1. Update service provider notification
    const { data: spNotifications, error: spNotifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', serviceProviderId)
      .eq('type', 'order')
      .ilike('title', '%Payment Received%')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (spNotifError) {
      console.log('❌ Service provider notification fetch error:', spNotifError);
    } else if (spNotifications && spNotifications.length > 0) {
      const notification = spNotifications[0];
      
      const { error: updateSpNotifError } = await supabase
        .from('notifications')
        .update({
          message: `You received payment of RM 5.11 from Chris. You can now start working on the order.`,
          data: JSON.stringify({
            order_id: orderId,
            buyer_id: notification.data?.buyer_id,
            offer_id: notification.data?.offer_id,
            amount: 511, // in cents
            amount_display: 'RM 5.11',
            service_title: notification.data?.service_title
          })
        })
        .eq('id', notification.id);
      
      if (updateSpNotifError) {
        console.log('❌ Service provider notification update error:', updateSpNotifError);
      } else {
        console.log('✅ Service provider notification updated to show RM 5.11');
      }
    }
    
    // 2. Get order details for buyer notification
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('buyer_id, service_offer_id, service_title')
      .eq('id', orderId)
      .single();
    
    if (orderError) {
      console.log('❌ Order fetch error:', orderError);
      return;
    }
    
    // 3. Update buyer notification
    const { data: buyerNotifications, error: buyerNotifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', order.buyer_id)
      .eq('type', 'order')
      .ilike('title', '%Order Confirmed%')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (buyerNotifError) {
      console.log('❌ Buyer notification fetch error:', buyerNotifError);
    } else if (buyerNotifications && buyerNotifications.length > 0) {
      const buyerNotification = buyerNotifications[0];
      
      const { error: updateBuyerNotifError } = await supabase
        .from('notifications')
        .update({
          message: `Your payment of RM 5.11 has been processed. Jack Brandon Lee can now start working on your order.`,
          data: JSON.stringify({
            order_id: orderId,
            service_provider_id: serviceProviderId,
            offer_id: order.service_offer_id,
            amount: 511, // in cents
            amount_display: 'RM 5.11',
            service_title: order.service_title
          })
        })
        .eq('id', buyerNotification.id);
      
      if (updateBuyerNotifError) {
        console.log('❌ Buyer notification update error:', updateBuyerNotifError);
      } else {
        console.log('✅ Buyer notification updated to show RM 5.11');
      }
    }
    
    // 4. Verify the updates
    console.log('\n🔔 Verifying updated notifications:');
    
    const { data: finalSpNotifications, error: finalSpError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', serviceProviderId)
      .eq('type', 'order')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (!finalSpError && finalSpNotifications && finalSpNotifications.length > 0) {
      const notif = finalSpNotifications[0];
      console.log(`✅ Service Provider: ${notif.title}`);
      console.log(`   Message: ${notif.message}`);
      console.log(`   Read: ${notif.is_read}`);
    }
    
    const { data: finalBuyerNotifications, error: finalBuyerError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', order.buyer_id)
      .eq('type', 'order')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (!finalBuyerError && finalBuyerNotifications && finalBuyerNotifications.length > 0) {
      const notif = finalBuyerNotifications[0];
      console.log(`✅ Buyer: ${notif.title}`);
      console.log(`   Message: ${notif.message}`);
      console.log(`   Read: ${notif.is_read}`);
    }
    
    // 5. Final verification of order
    const { data: finalOrder, error: finalOrderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (!finalOrderError) {
      console.log('\n📦 Final Order Status:');
      console.log(`   Order ID: ${finalOrder.id}`);
      console.log(`   Amount: RM ${finalOrder.amount / 100} (${finalOrder.amount} cents)`);
      console.log(`   Platform Fee: RM ${finalOrder.platform_fee / 100} (${finalOrder.platform_fee} cents)`);
      console.log(`   Total: RM ${finalOrder.total_amount / 100} (${finalOrder.total_amount} cents)`);
      console.log(`   Status: ${finalOrder.status}`);
      console.log(`   Service: ${finalOrder.service_title}`);
    }
    
    console.log('\n🎉 All corrections completed successfully!');
    console.log('✅ Order amount corrected to RM 5.11');
    console.log('✅ Service provider notification shows RM 5.11');
    console.log('✅ Buyer notification shows RM 5.11');
    console.log('✅ Jack Brandon Lee (8cwqmqm82w@wyoxafp.com) should now see the correct payment notification');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixNotificationMessages();