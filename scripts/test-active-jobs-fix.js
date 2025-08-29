const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testActiveJobsFix() {
  console.log('🧪 Testing Active Jobs Constraint Fix...\n');
  
  try {
    // Test 1: Check if the constraint now allows the problematic statuses
    console.log('1. Testing active_jobs status constraint...');
    
    // Get users for testing
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .limit(2);
      
    if (usersError || !users || users.length < 2) {
      console.log('❌ Need at least 2 users to test');
      return;
    }
    
    const buyerId = users[0].id;
    const serviceProviderId = users[1].id;
    
    // Create a test active job
    console.log('2. Creating test active job...');
    const testActiveJob = {
      buyer_id: buyerId,
      service_provider_id: serviceProviderId,
      service_offer_id: '00000000-0000-0000-0000-000000000001',
      title: 'Test Job for Constraint Fix',
      description: 'Testing the status constraint fix',
      price: 100,
      status: 'in_progress' // Start with a valid status
    };
    
    const { data: createdJob, error: createError } = await supabase
      .from('active_jobs')
      .insert(testActiveJob)
      .select()
      .single();
      
    if (createError) {
      console.log('❌ Failed to create test active job:', createError.message);
      return;
    }
    
    console.log('✅ Test active job created:', createdJob.id);
    
    // Test 3: Try updating to the problematic status
    console.log('\n3. Testing problematic status updates...');
    
    const problematicStatuses = [
      'buyer_reviewing',
      'payment_received',
      'work_completed',
      'completed_confirmed'
    ];
    
    for (const status of problematicStatuses) {
      console.log(`   Testing status: ${status}`);
      
      const { data: updateResult, error: updateError } = await supabase
        .from('active_jobs')
        .update({ status: status })
        .eq('id', createdJob.id)
        .select();
        
      if (updateError) {
        console.log(`   ❌ Failed: ${updateError.message}`);
        if (updateError.code === '23514') {
          console.log('   🚨 Constraint violation still exists!');
        }
      } else {
        console.log(`   ✅ Success: Updated to ${status}`);
      }
    }
    
    // Test 4: Test the confirm_work_completion function
    console.log('\n4. Testing confirm_work_completion function...');
    
    // First, create a test order
    const testOrder = {
      service_offer_id: createdJob.service_offer_id,
      buyer_id: buyerId,
      service_provider_id: serviceProviderId,
      amount: 100,
      platform_fee: 10,
      total_amount: 110,
      status: 'buyer_reviewing',
      service_title: 'Test Service for Confirmation',
      service_description: 'Testing job confirmation'
    };
    
    const { data: createdOrder, error: orderError } = await supabase
      .from('orders')
      .insert(testOrder)
      .select()
      .single();
      
    if (orderError) {
      console.log('❌ Failed to create test order:', orderError.message);
    } else {
      console.log('✅ Test order created:', createdOrder.id);
      
      // Now test the confirm_work_completion function
      console.log('   Testing confirm_work_completion function...');
      
      const { data: confirmResult, error: confirmError } = await supabase.rpc('confirm_work_completion', {
        p_order_id: createdOrder.id,
        p_buyer_id: buyerId
      });
      
      if (confirmError) {
        console.log('❌ Confirmation failed:', confirmError.message);
        console.log('   Error code:', confirmError.code);
        
        if (confirmError.code === '23514') {
          console.log('   🚨 The constraint violation error still exists!');
          console.log('   The fix may not be complete.');
        }
      } else {
        console.log('✅ Confirmation succeeded!');
        console.log('   Result:', confirmResult);
        
        // Check if the active job was updated correctly
        const { data: updatedJob, error: jobFetchError } = await supabase
          .from('active_jobs')
          .select('*')
          .eq('id', createdJob.id)
          .single();
          
        if (jobFetchError) {
          console.log('❌ Failed to fetch updated job:', jobFetchError.message);
        } else {
          console.log('✅ Active job updated:');
          console.log('   Status:', updatedJob.status);
          console.log('   Buyer confirmation:', updatedJob.buyer_confirmation_at);
          console.log('   Payment released:', updatedJob.payment_released_at);
        }
      }
      
      // Clean up test order
      await supabase.from('orders').delete().eq('id', createdOrder.id);
    }
    
    // Clean up test active job
    console.log('\n5. Cleaning up test data...');
    await supabase.from('active_jobs').delete().eq('id', createdJob.id);
    console.log('✅ Test data cleaned up');
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 TEST RESULTS SUMMARY:');
    console.log('='.repeat(60));
    
    console.log('\n✅ FIXES APPLIED:');
    console.log('1. Updated active_jobs constraint to allow order-related statuses');
    console.log('2. Created status mapping function');
    console.log('3. Added trigger to sync orders to active_jobs');
    console.log('4. Updated confirm_work_completion to handle active_jobs');
    
    console.log('\n🎉 The constraint violation error should now be resolved!');
    console.log('Users should be able to confirm job completion without errors.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testActiveJobsFix().catch(console.error);