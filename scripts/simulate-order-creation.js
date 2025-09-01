require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function simulateOrderCreation() {
  const serviceProviderId = 'ce34825e-ffc9-46b5-9338-3015c42f3a33'; // Jack Brandon Lee
  const buyerId = 'f1785c17-abc7-40a8-80d8-dd9224f1238f';
  const offerId = 'c17b0862-0112-4a87-b4d4-217fb7c6478b';
  
  console.log('🔍 Simulating order creation process...');
  
  try {
    // 1. First, let's check the buyer details
    const { data: buyer, error: buyerError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', buyerId)
      .single();
    
    if (buyerError) {
      console.log('❌ Buyer error:', buyerError);
    } else {
      console.log('👤 Buyer details:', {
        id: buyer.id,
        email: buyer.email,
        full_name: buyer.full_name
      });
    }
    
    // 2. Accept the offer (simulate what should happen)
    console.log('📝 Accepting the service offer...');
    const { data: updatedOffer, error: updateError } = await supabase
      .from('service_offers')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', offerId)
      .select()
      .single();
    
    if (updateError) {
      console.log('❌ Update offer error:', updateError);
      return;
    }
    
    console.log('✅ Offer accepted:', updatedOffer.status);
    
    // 3. Create an order from the accepted offer
    console.log('📦 Creating order from accepted offer...');
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: buyerId,
        service_provider_id: serviceProviderId,
        service_offer_id: offerId,
        status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (orderError) {
      console.log('❌ Order creation error:', orderError);
    } else {
      console.log('✅ Order created:', {
        id: newOrder.id,
        status: newOrder.status,
        created_at: newOrder.created_at
      });
      
      // 4. Create notifications for both parties
      console.log('🔔 Creating notifications...');
      
      // Notification for service provider
      const { error: spNotifError } = await supabase
        .from('notifications')
        .insert({
          user_id: serviceProviderId,
          type: 'order',
          title: 'New Order Received',
          message: `You have received a new order from ${buyer?.full_name || 'a customer'}`,
          data: JSON.stringify({
            order_id: newOrder.id,
            buyer_id: buyerId,
            offer_id: offerId
          }),
          is_read: false,
          created_at: new Date().toISOString()
        });
      
      if (spNotifError) {
        console.log('❌ Service provider notification error:', spNotifError);
      } else {
        console.log('✅ Service provider notification created');
      }
      
      // Notification for buyer
      const { error: buyerNotifError } = await supabase
        .from('notifications')
        .insert({
          user_id: buyerId,
          type: 'order',
          title: 'Order Confirmed',
          message: 'Your order has been confirmed and is now active',
          data: JSON.stringify({
            order_id: newOrder.id,
            service_provider_id: serviceProviderId,
            offer_id: offerId
          }),
          is_read: false,
          created_at: new Date().toISOString()
        });
      
      if (buyerNotifError) {
        console.log('❌ Buyer notification error:', buyerNotifError);
      } else {
        console.log('✅ Buyer notification created');
      }
    }
    
    // 5. Check if notifications were created successfully
    const { data: spNotifications, error: spNotifCheckError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', serviceProviderId)
      .eq('type', 'order')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (!spNotifCheckError) {
      console.log('🔔 Service provider notifications (last 5 min):', spNotifications?.length || 0);
      spNotifications?.forEach(notif => {
        console.log(`  - ${notif.title}: ${notif.message} (${notif.created_at})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Simulation error:', error);
  }
}

simulateOrderCreation();