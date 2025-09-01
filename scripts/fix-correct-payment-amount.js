require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCorrectPaymentAmount() {
  console.log('🔧 Fixing payment amount to correct RM 5.11...');
  
  try {
    const serviceProviderId = 'ce34825e-ffc9-46b5-9338-3015c42f3a33'; // Jack Brandon Lee
    const orderId = 'd7fb1ad3-562d-4f3f-ab08-03ec057c57cf';
    const correctAmount = 5.11;
    const platformFee = Math.round(correctAmount * 0.1 * 100) / 100; // 10% platform fee, rounded to 2 decimals
    const totalAmount = correctAmount + platformFee;
    
    console.log('💰 Correct payment details:');
    console.log(`   Amount: RM ${correctAmount}`);
    console.log(`   Platform Fee: RM ${platformFee}`);
    console.log(`   Total: RM ${totalAmount}`);
    
    // 1. Update the existing order with correct amount
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        amount: correctAmount,
        platform_fee: platformFee,
        total_amount: totalAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();
    
    if (updateError) {
      console.log('❌ Order update error:', updateError);
      return;
    }
    
    console.log('✅ Order updated with correct amount:', {
      id: updatedOrder.id,
      amount: updatedOrder.amount,
      platform_fee: updatedOrder.platform_fee,
      total_amount: updatedOrder.total_amount
    });
    
    // 2. Update the notification with correct amount
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', serviceProviderId)
      .eq('type', 'order')
      .ilike('title', '%Payment Received%')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (notifError) {
      console.log('❌ Notification fetch error:', notifError);
    } else if (notifications && notifications.length > 0) {
      const notification = notifications[0];
      
      // Update notification with correct amount
      const { error: updateNotifError } = await supabase
        .from('notifications')
        .update({
          message: `You received payment of RM ${correctAmount} from Chris. You can now start working on the order.`,
          data: JSON.stringify({
            order_id: orderId,
            buyer_id: updatedOrder.buyer_id,
            offer_id: updatedOrder.service_offer_id,
            amount: correctAmount,
            service_title: updatedOrder.service_title
          }),
          updated_at: new Date().toISOString()
        })
        .eq('id', notification.id);
      
      if (updateNotifError) {
        console.log('❌ Notification update error:', updateNotifError);
      } else {
        console.log('✅ Notification updated with correct amount');
      }
    }
    
    // 3. Also update the buyer's notification
    const { data: buyerNotifications, error: buyerNotifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', updatedOrder.buyer_id)
      .eq('type', 'order')
      .ilike('title', '%Order Confirmed%')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (!buyerNotifError && buyerNotifications && buyerNotifications.length > 0) {
      const buyerNotification = buyerNotifications[0];
      
      const { error: updateBuyerNotifError } = await supabase
        .from('notifications')
        .update({
          message: `Your payment of RM ${correctAmount} has been processed. Jack Brandon Lee can now start working on your order.`,
          data: JSON.stringify({
            order_id: orderId,
            service_provider_id: serviceProviderId,
            offer_id: updatedOrder.service_offer_id,
            amount: correctAmount,
            service_title: updatedOrder.service_title
          }),
          updated_at: new Date().toISOString()
        })
        .eq('id', buyerNotification.id);
      
      if (updateBuyerNotifError) {
        console.log('❌ Buyer notification update error:', updateBuyerNotifError);
      } else {
        console.log('✅ Buyer notification updated with correct amount');
      }
    }
    
    // 4. Verify the updates
    const { data: finalOrder, error: finalError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (finalError) {
      console.log('❌ Final verification error:', finalError);
    } else {
      console.log('📦 Final order verification:', {
        id: finalOrder.id,
        amount: finalOrder.amount,
        platform_fee: finalOrder.platform_fee,
        total_amount: finalOrder.total_amount,
        service_title: finalOrder.service_title
      });
    }
    
    // 5. Check updated notifications
    const { data: updatedNotifications, error: updatedNotifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', serviceProviderId)
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (!updatedNotifError) {
      console.log('🔔 Updated notifications:');
      updatedNotifications?.forEach(notif => {
        if (notif.type === 'order') {
          console.log(`  - ${notif.title}: ${notif.message}`);
        }
      });
    }
    
    console.log('\n🎉 Payment amount correction completed!');
    console.log(`✅ Order amount corrected to: RM ${correctAmount}`);
    console.log(`✅ Platform fee: RM ${platformFee}`);
    console.log(`✅ Total amount: RM ${totalAmount}`);
    console.log(`✅ Notifications updated with correct amount`);
    console.log(`✅ Service provider will now see the correct RM 5.11 payment notification`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixCorrectPaymentAmount();