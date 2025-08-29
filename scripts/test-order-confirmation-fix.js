const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testOrderConfirmationFix() {
  console.log('🧪 Testing Order Confirmation Fix...\n');
  
  try {
    // Get real users for testing
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .limit(2);
      
    if (usersError || !users || users.length < 2) {
      console.log('❌ Need at least 2 users to test. Error:', usersError?.message);
      return;
    }
    
    const buyerId = users[0].id;
    const sellerId = users[1].id;
    
    console.log('👤 Using test users:');
    console.log('   Buyer:', users[0].full_name || 'Unknown', '(' + buyerId + ')');
    console.log('   Seller:', users[1].full_name || 'Unknown', '(' + sellerId + ')');
    
    // Step 1: Create a test order
    console.log('\n📝 Step 1: Creating test order...');
    
    const testOrder = {
      service_offer_id: '00000000-0000-0000-0000-000000000001',
      buyer_id: buyerId,
      service_provider_id: sellerId,
      amount: 100,
      platform_fee: 10,
      total_amount: 110,
      service_title: 'Test Service for Confirmation',
      service_description: 'Testing order confirmation flow'
    };
    
    // Authenticate as buyer to create order
    const { data: buyerAuth, error: buyerAuthError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com', // This won't work, but let's try direct insert
      password: 'password'
    });
    
    // Try direct insert (should work now with the INSERT policy)
    const { data: createdOrder, error: createError } = await supabase
      .from('orders')
      .insert(testOrder)
      .select()
      .single();
      
    if (createError) {
      console.log('❌ Order creation failed:', createError.message);
      console.log('   Error code:', createError.code);
      
      if (createError.code === '42501') {
        console.log('   This is still an RLS policy issue.');
        console.log('   The INSERT policy might not be working correctly.');
      }
      return;
    }
    
    console.log('✅ Order created successfully!');
    console.log('   Order ID:', createdOrder.id);
    console.log('   Status:', createdOrder.status);
    
    // Step 2: Mark work as completed (simulate seller action)
    console.log('\n🔨 Step 2: Marking work as completed...');
    
    const { data: markResult, error: markError } = await supabase.rpc('mark_work_completed', {
      p_order_id: createdOrder.id,
      p_service_provider_id: sellerId
    });
    
    if (markError) {
      console.log('❌ Mark work completed failed:', markError.message);
    } else {
      console.log('✅ Work marked as completed!');
      console.log('   Result:', markResult);
    }
    
    // Step 3: Check order status
    console.log('\n📊 Step 3: Checking order status...');
    
    const { data: updatedOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', createdOrder.id)
      .single();
      
    if (fetchError) {
      console.log('❌ Failed to fetch updated order:', fetchError.message);
    } else {
      console.log('✅ Order status updated:');
      console.log('   Status:', updatedOrder.status);
      console.log('   Work completed at:', updatedOrder.work_completed_at);
      console.log('   Auto release at:', updatedOrder.auto_release_at);
    }
    
    // Step 4: Test buyer confirmation
    if (updatedOrder && updatedOrder.status === 'buyer_reviewing') {
      console.log('\n✅ Step 4: Testing buyer confirmation...');
      
      const { data: confirmResult, error: confirmError } = await supabase.rpc('confirm_work_completion', {
        p_order_id: createdOrder.id,
        p_buyer_id: buyerId
      });
      
      if (confirmError) {
        console.log('❌ Confirmation failed:', confirmError.message);
        console.log('   Error code:', confirmError.code);
        console.log('   Error details:', confirmError.details);
        console.log('   Error hint:', confirmError.hint);
        
        // This is likely the root cause of the user's issue
        console.log('\n🎯 ROOT CAUSE IDENTIFIED:');
        console.log('   The confirm_work_completion function is failing.');
        console.log('   This explains why the user sees "Failed to confirm job completion"');
      } else {
        console.log('✅ Confirmation succeeded!');
        console.log('   Result:', confirmResult);
        
        // Check final order status
        const { data: finalOrder, error: finalError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', createdOrder.id)
          .single();
          
        if (finalError) {
          console.log('❌ Failed to fetch final order:', finalError.message);
        } else {
          console.log('✅ Final order status:');
          console.log('   Status:', finalOrder.status);
          console.log('   Completion confirmed at:', finalOrder.completion_confirmed_at);
          console.log('   Payment released at:', finalOrder.payment_released_at);
        }
      }
    }
    
    // Clean up test order
    console.log('\n🧹 Cleaning up test order...');
    await supabase.from('orders').delete().eq('id', createdOrder.id);
    console.log('✅ Test order cleaned up.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testOrderConfirmationFix().catch(console.error);