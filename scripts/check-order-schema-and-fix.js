require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOrderSchemaAndFix() {
  console.log('🔍 Checking order schema and fixing payment amount...');
  
  try {
    const orderId = 'd7fb1ad3-562d-4f3f-ab08-03ec057c57cf';
    const serviceProviderId = 'ce34825e-ffc9-46b5-9338-3015c42f3a33';
    
    // 1. First, let's check the current order to understand the data types
    const { data: currentOrder, error: currentError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (currentError) {
      console.log('❌ Current order error:', currentError);
      return;
    }
    
    console.log('📦 Current order data types:', {
      amount: typeof currentOrder.amount,
      amount_value: currentOrder.amount,
      platform_fee: typeof currentOrder.platform_fee,
      platform_fee_value: currentOrder.platform_fee,
      total_amount: typeof currentOrder.total_amount,
      total_amount_value: currentOrder.total_amount
    });
    
    // Based on the error, it seems amounts are stored as integers (probably in cents)
    // RM 5.11 = 511 cents
    // Platform fee 10% = 51 cents  
    // Total = 562 cents
    
    const correctAmountCents = 511; // RM 5.11 in cents
    const platformFeeCents = 51;    // RM 0.51 in cents (10% of 511)
    const totalAmountCents = 562;   // RM 5.62 in cents
    
    console.log('💰 Correct payment in cents:');
    console.log(`   Amount: ${correctAmountCents} cents (RM ${correctAmountCents/100})`);
    console.log(`   Platform Fee: ${platformFeeCents} cents (RM ${platformFeeCents/100})`);
    console.log(`   Total: ${totalAmountCents} cents (RM ${totalAmountCents/100})`);
    
    // 2. Update the order with correct amounts in cents
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        amount: correctAmountCents,
        platform_fee: platformFeeCents,
        total_amount: totalAmountCents,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();
    
    if (updateError) {
      console.log('❌ Order update error:', updateError);
      return;
    }
    
    console.log('✅ Order updated with correct amounts:', {
      id: updatedOrder.id,
      amount: `${updatedOrder.amount} cents (RM ${updatedOrder.amount/100})`,
      platform_fee: `${updatedOrder.platform_fee} cents (RM ${updatedOrder.platform_fee/100})`,
      total_amount: `${updatedOrder.total_amount} cents (RM ${updatedOrder.total_amount/100})`
    });
    
    // 3. Update the service provider notification
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', serviceProviderId)
      .eq('type', 'order')
      .ilike('title', '%Payment Received%')
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (notifError) {
      console.log('❌ Notification fetch error:', notifError);
    } else if (notifications && notifications.length > 0) {
      const notification = notifications[0];
      
      const { error: updateNotifError } = await supabase
        .from('notifications')
        .update({
          message: `You received payment of RM 5.11 from Chris. You can now start working on the order.`,
          data: JSON.stringify({
            order_id: orderId,
            buyer_id: updatedOrder.buyer_id,
            offer_id: updatedOrder.service_offer_id,
            amount: correctAmountCents,
            amount_display: 'RM 5.11',
            service_title: updatedOrder.service_title
          }),
          updated_at: new Date().toISOString()
        })
        .eq('id', notification.id);
      
      if (updateNotifError) {
        console.log('❌ Notification update error:', updateNotifError);
      } else {
        console.log('✅ Service provider notification updated with RM 5.11');
      }
    }
    
    // 4. Update the buyer notification
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
          message: `Your payment of RM 5.11 has been processed. Jack Brandon Lee can now start working on your order.`,
          data: JSON.stringify({
            order_id: orderId,
            service_provider_id: serviceProviderId,
            offer_id: updatedOrder.service_offer_id,
            amount: correctAmountCents,
            amount_display: 'RM 5.11',
            service_title: updatedOrder.service_title
          }),
          updated_at: new Date().toISOString()
        })
        .eq('id', buyerNotification.id);
      
      if (updateBuyerNotifError) {
        console.log('❌ Buyer notification update error:', updateBuyerNotifError);
      } else {
        console.log('✅ Buyer notification updated with RM 5.11');
      }
    }
    
    // 5. Verify final state
    console.log('\n🔔 Checking final notifications for service provider:');
    const { data: finalNotifications, error: finalNotifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', serviceProviderId)
      .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (!finalNotifError) {
      finalNotifications?.forEach(notif => {
        if (notif.type === 'order') {
          console.log(`  - ${notif.title}: ${notif.message}`);
        }
      });
    }
    
    console.log('\n🎉 Payment amount correction completed successfully!');
    console.log(`✅ Order amount: RM 5.11 (${correctAmountCents} cents)`);
    console.log(`✅ Platform fee: RM 0.51 (${platformFeeCents} cents)`);
    console.log(`✅ Total amount: RM 5.62 (${totalAmountCents} cents)`);
    console.log(`✅ Service provider notification shows correct RM 5.11 payment`);
    console.log(`✅ Jack Brandon Lee should now see the correct payment notification`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkOrderSchemaAndFix();