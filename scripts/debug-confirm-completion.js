const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function debugConfirmCompletion() {
  console.log('🔍 Debugging confirm_work_completion function...\n');
  
  try {
    // First, let's see if there are any orders in buyer_reviewing status
    console.log('1. Checking for orders in buyer_reviewing status...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'buyer_reviewing')
      .limit(5);
      
    if (ordersError) {
      console.log('❌ Error fetching orders:', ordersError);
      return;
    }
    
    console.log(`✅ Found ${orders?.length || 0} orders in buyer_reviewing status`);
    
    if (orders && orders.length > 0) {
      const order = orders[0];
      console.log('\n2. Testing with order:');
      console.log('   Order ID:', order.id);
      console.log('   Buyer ID:', order.buyer_id);
      console.log('   Service Provider ID:', order.service_provider_id);
      console.log('   Status:', order.status);
      console.log('   Work completed at:', order.work_completed_at);
      
      // Test the function
      console.log('\n3. Testing confirm_work_completion function...');
      const { data, error } = await supabase.rpc('confirm_work_completion', {
        p_order_id: order.id,
        p_buyer_id: order.buyer_id
      });
      
      if (error) {
        console.log('❌ Function error:', error);
        console.log('   Error code:', error.code);
        console.log('   Error message:', error.message);
        console.log('   Error details:', error.details);
        console.log('   Error hint:', error.hint);
      } else {
        console.log('✅ Function result:', data);
        
        // Check if the order was updated
        console.log('\n4. Checking if order was updated...');
        const { data: updatedOrder, error: fetchError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', order.id)
          .single();
          
        if (fetchError) {
          console.log('❌ Error fetching updated order:', fetchError);
        } else {
          console.log('✅ Updated order status:', updatedOrder.status);
          console.log('   Completion confirmed at:', updatedOrder.completion_confirmed_at);
          console.log('   Payment released at:', updatedOrder.payment_released_at);
        }
      }
    } else {
      console.log('\n⚠️  No orders in buyer_reviewing status to test with');
      
      // Let's check all orders
      console.log('\n5. Checking all orders...');
      const { data: allOrders, error: allOrdersError } = await supabase
        .from('orders')
        .select('id, status, buyer_id, service_provider_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (allOrdersError) {
        console.log('❌ Error fetching all orders:', allOrdersError);
      } else {
        console.log(`✅ Found ${allOrders?.length || 0} total orders:`);
        allOrders?.forEach((order, index) => {
          console.log(`   ${index + 1}. ${order.id} - ${order.status} (${new Date(order.created_at).toLocaleDateString()})`);
        });
      }
    }
    
    // Let's also check if the function exists
    console.log('\n6. Checking if confirm_work_completion function exists...');
    const { data: functions, error: functionsError } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'confirm_work_completion');
      
    if (functionsError) {
      console.log('❌ Error checking functions:', functionsError);
    } else {
      console.log(`✅ Function exists: ${functions?.length > 0 ? 'Yes' : 'No'}`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugConfirmCompletion().catch(console.error);