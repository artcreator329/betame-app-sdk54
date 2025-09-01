require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOrderCreationFlow() {
  const userEmail = '8cwqmqm82w@wyoxafp.com';
  const userId = 'ce34825e-ffc9-46b5-9338-3015c42f3a33';
  
  console.log('🔍 Investigating order creation flow for user:', userEmail);
  
  try {
    // 1. Check all orders created in the last hour
    const { data: allRecentOrders, error: allOrdersError } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (allOrdersError) {
      console.log('❌ All orders error:', allOrdersError);
    } else {
      console.log('📦 All orders in last hour:', allRecentOrders?.length || 0);
      allRecentOrders?.forEach(order => {
        console.log(`  - Order ${order.id}: Buyer: ${order.buyer_id}, SP: ${order.service_provider_id}, Status: ${order.status} (${order.created_at})`);
      });
    }
    
    // 2. Check the specific service offer that's pending
    const { data: pendingOffer, error: offerError } = await supabase
      .from('service_offers')
      .select(`
        *,
        services (
          title,
          description,
          price
        )
      `)
      .eq('id', 'c17b0862-0112-4a87-b4d4-217fb7c6478b')
      .single();
    
    if (offerError) {
      console.log('❌ Pending offer error:', offerError);
    } else {
      console.log('💼 Pending offer details:', {
        id: pendingOffer.id,
        buyer_id: pendingOffer.buyer_id,
        service_provider_id: pendingOffer.service_provider_id,
        status: pendingOffer.status,
        price: pendingOffer.price,
        created_at: pendingOffer.created_at,
        updated_at: pendingOffer.updated_at,
        service_title: pendingOffer.services?.title
      });
    }
    
    // 3. Check if there are any orders related to this service offer
    const { data: relatedOrders, error: relatedError } = await supabase
      .from('orders')
      .select('*')
      .eq('service_offer_id', 'c17b0862-0112-4a87-b4d4-217fb7c6478b');
    
    if (relatedError) {
      console.log('❌ Related orders error:', relatedError);
    } else {
      console.log('🔗 Orders related to pending offer:', relatedOrders?.length || 0);
      relatedOrders?.forEach(order => {
        console.log(`  - Order ${order.id}: ${order.status} (${order.created_at})`);
      });
    }
    
    // 4. Check payment records
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (paymentsError) {
      console.log('❌ Payments error:', paymentsError);
    } else {
      console.log('💳 Recent payments:', payments?.length || 0);
      payments?.forEach(payment => {
        console.log(`  - Payment ${payment.id}: ${payment.status} - ${payment.amount} (${payment.created_at})`);
      });
    }
    
    // 5. Check wallet transactions
    const { data: walletTxns, error: walletError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (walletError) {
      console.log('❌ Wallet transactions error:', walletError);
    } else {
      console.log('💰 Recent wallet transactions:', walletTxns?.length || 0);
      walletTxns?.forEach(txn => {
        console.log(`  - ${txn.type}: ${txn.amount} - ${txn.description} (${txn.created_at})`);
      });
    }
    
    // 6. Check if there are any database triggers or functions that should create orders
    const { data: functions, error: functionsError } = await supabase
      .rpc('get_function_list');
    
    if (!functionsError && functions) {
      console.log('🔧 Available database functions:', functions.length);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkOrderCreationFlow();