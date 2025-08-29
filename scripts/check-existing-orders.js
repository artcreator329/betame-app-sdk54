const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkExistingOrders() {
  console.log('🔍 Checking existing orders in database...\n');
  
  try {
    // Check all orders
    console.log('1. Checking all orders...');
    const { data: allOrders, error: allOrdersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (allOrdersError) {
      console.log('❌ Error fetching orders:', allOrdersError.message);
      console.log('   Error code:', allOrdersError.code);
      
      if (allOrdersError.code === '42501') {
        console.log('   This is an RLS policy issue - user cannot read orders');
        console.log('   The SELECT policy might not be working correctly');
      }
      return;
    }
    
    console.log(`✅ Found ${allOrders?.length || 0} orders in database`);
    
    if (allOrders && allOrders.length > 0) {
      console.log('\n📊 Order breakdown by status:');
      const statusCounts = {};
      allOrders.forEach(order => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });
      
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
      
      console.log('\n📋 Recent orders:');
      allOrders.slice(0, 5).forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.id}`);
        console.log(`      Status: ${order.status}`);
        console.log(`      Title: ${order.service_title}`);
        console.log(`      Buyer: ${order.buyer_id}`);
        console.log(`      Service Provider: ${order.service_provider_id || order.seller_id}`);
        console.log(`      Created: ${new Date(order.created_at).toLocaleString()}`);
        console.log('');
      });
      
      // Check for orders in buyer_reviewing status specifically
      const reviewingOrders = allOrders.filter(order => order.status === 'buyer_reviewing');
      if (reviewingOrders.length > 0) {
        console.log(`🔍 Found ${reviewingOrders.length} orders in buyer_reviewing status:`);
        reviewingOrders.forEach((order, index) => {
          console.log(`   ${index + 1}. ${order.id}`);
          console.log(`      Work completed at: ${order.work_completed_at}`);
          console.log(`      Auto release at: ${order.auto_release_at}`);
          console.log(`      Buyer: ${order.buyer_id}`);
          console.log('');
        });
        
        // Test confirmation on the first one
        const testOrder = reviewingOrders[0];
        console.log(`🧪 Testing confirmation on order ${testOrder.id}...`);
        
        const { data: confirmResult, error: confirmError } = await supabase.rpc('confirm_work_completion', {
          p_order_id: testOrder.id,
          p_buyer_id: testOrder.buyer_id
        });
        
        if (confirmError) {
          console.log('❌ Confirmation failed:', confirmError.message);
          console.log('   Error code:', confirmError.code);
          console.log('   Error details:', confirmError.details);
          console.log('   Error hint:', confirmError.hint);
          
          console.log('\n🎯 ROOT CAUSE ANALYSIS:');
          if (confirmError.code === '42501') {
            console.log('   RLS policy is blocking the confirmation');
          } else if (confirmError.code === '23503') {
            console.log('   Foreign key constraint violation');
          } else if (confirmError.code === '23505') {
            console.log('   Unique constraint violation');
          } else {
            console.log('   Unknown database error');
          }
        } else {
          console.log('✅ Confirmation succeeded!');
          console.log('   Result:', confirmResult);
        }
      }
    } else {
      console.log('\n⚠️  No orders found in database');
      console.log('   This suggests orders are created through a different mechanism');
      console.log('   or the user in the screenshot has orders that are not visible due to RLS');
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkExistingOrders().catch(console.error);