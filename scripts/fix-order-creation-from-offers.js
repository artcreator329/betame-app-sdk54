require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixOrderCreationFromOffers() {
  console.log('🔧 Fixing order creation from accepted offers...');
  
  try {
    // 1. Find the accepted offer that should have created an order
    const offerId = 'c17b0862-0112-4a87-b4d4-217fb7c6478b';
    
    const { data: offer, error: offerError } = await supabase
      .from('service_offers')
      .select(`
        *,
        services (
          title,
          description,
          price
        )
      `)
      .eq('id', offerId)
      .single();
    
    if (offerError) {
      console.log('❌ Offer error:', offerError);
      return;
    }
    
    console.log('📋 Offer details:', {
      id: offer.id,
      buyer_id: offer.buyer_id,
      service_provider_id: offer.service_provider_id,
      status: offer.status,
      price: offer.price,
      service_title: offer.services?.title,
      service_price: offer.services?.price
    });
    
    // 2. Check if order already exists for this offer
    const { data: existingOrder, error: orderCheckError } = await supabase
      .from('orders')
      .select('*')
      .eq('service_offer_id', offerId)
      .single();
    
    if (!orderCheckError && existingOrder) {
      console.log('✅ Order already exists:', existingOrder.id);
      return;
    }
    
    // 3. Create the missing order
    console.log('📦 Creating order from accepted offer...');
    
    const orderAmount = offer.price || offer.services?.price || 0;
    const platformFee = Math.round(orderAmount * 0.1); // 10% platform fee
    const totalAmount = orderAmount + platformFee;
    
    const { data: newOrder, error: createError } = await supabase
      .from('orders')
      .insert({
        service_offer_id: offerId,
        buyer_id: offer.buyer_id,
        service_provider_id: offer.service_provider_id,
        seller_id: offer.service_provider_id, // For backward compatibility
        amount: orderAmount,
        platform_fee: platformFee,
        total_amount: totalAmount,
        status: 'payment_received',
        dispute_status: 'none',
        service_title: offer.services?.title || 'Service Order',
        service_description: offer.services?.description,
        payment_received_at: new Date().toISOString(),
        auto_release_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        requires_admin_intervention: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.log('❌ Order creation error:', createError);
      return;
    }
    
    console.log('✅ Order created successfully:', {
      id: newOrder.id,
      status: newOrder.status,
      amount: newOrder.amount,
      total_amount: newOrder.total_amount
    });
    
    // 4. Create notifications for both parties
    console.log('🔔 Creating notifications...');
    
    // Get user details for personalized notifications
    const { data: buyer, error: buyerError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', offer.buyer_id)
      .single();
    
    const { data: serviceProvider, error: spError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', offer.service_provider_id)
      .single();
    
    // Notification for service provider (the one not getting notifications)
    const { error: spNotifError } = await supabase
      .from('notifications')
      .insert({
        user_id: offer.service_provider_id,
        type: 'order',
        title: 'Payment Received - New Order!',
        message: `You received payment of RM ${orderAmount} from ${buyer?.full_name || 'a customer'}. You can now start working on the order.`,
        data: JSON.stringify({
          order_id: newOrder.id,
          buyer_id: offer.buyer_id,
          offer_id: offerId,
          amount: orderAmount,
          service_title: offer.services?.title
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
        user_id: offer.buyer_id,
        type: 'order',
        title: 'Order Confirmed',
        message: `Your payment of RM ${orderAmount} has been processed. ${serviceProvider?.full_name || 'The service provider'} can now start working on your order.`,
        data: JSON.stringify({
          order_id: newOrder.id,
          service_provider_id: offer.service_provider_id,
          offer_id: offerId,
          amount: orderAmount,
          service_title: offer.services?.title
        }),
        is_read: false,
        created_at: new Date().toISOString()
      });
    
    if (buyerNotifError) {
      console.log('❌ Buyer notification error:', buyerNotifError);
    } else {
      console.log('✅ Buyer notification created');
    }
    
    // 5. Add timeline event
    const { error: timelineError } = await supabase
      .from('order_timeline')
      .insert({
        order_id: newOrder.id,
        event_type: 'order_created',
        event_description: 'Order created from accepted service offer and payment received',
        triggered_by: offer.buyer_id,
        metadata: {
          service_offer_id: offerId,
          payment_amount: orderAmount,
          platform_fee: platformFee
        },
        created_at: new Date().toISOString()
      });
    
    if (timelineError) {
      console.log('❌ Timeline error:', timelineError);
    } else {
      console.log('✅ Timeline event created');
    }
    
    console.log('\n🎉 Order creation completed successfully!');
    console.log(`   Order ID: ${newOrder.id}`);
    console.log(`   Amount: RM ${orderAmount}`);
    console.log(`   Service Provider: ${serviceProvider?.full_name} (${serviceProvider?.email})`);
    console.log(`   Buyer: ${buyer?.full_name} (${buyer?.email})`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixOrderCreationFromOffers();