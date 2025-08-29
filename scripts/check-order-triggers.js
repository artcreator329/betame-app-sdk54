const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkOrderTriggers() {
  console.log('🔍 Checking for triggers on orders table that might affect active_jobs...\n');
  
  try {
    // Check if there are any triggers on the orders table
    console.log('1. Checking for database triggers...');
    
    // Since we can't directly query pg_trigger, let's test the actual flow
    // by creating a test order and seeing what happens
    
    // First, let's check if there are any service offers we can use
    console.log('2. Checking for service offers to create test order...');
    const { data: serviceOffers, error: offersError } = await supabase
      .from('service_offers')
      .select('*')
      .eq('status', 'accepted')
      .limit(1);
      
    if (offersError) {
      console.log('❌ Error fetching service offers:', offersError.message);
    } else {
      console.log(`✅ Found ${serviceOffers?.length || 0} accepted service offers`);
      
      if (serviceOffers && serviceOffers.length > 0) {
        const offer = serviceOffers[0];
        console.log(`   Using service offer: ${offer.id}`);
        
        // Check if there's already an active job for this offer
        console.log('\n3. Checking for existing active job...');
        const { data: existingJob, error: jobError } = await supabase
          .from('active_jobs')
          .select('*')
          .eq('service_offer_id', offer.id)
          .single();
          
        if (jobError && jobError.code !== 'PGRST116') {
          console.log('❌ Error checking active job:', jobError.message);
        } else if (existingJob) {
          console.log('✅ Found existing active job:', existingJob.id);
          console.log('   Status:', existingJob.status);
          
          // Test updating the active job status to see what's valid
          console.log('\n4. Testing active job status updates...');
          
          const testStatuses = [
            'buyer_reviewing', // This should fail
            'completed_confirmed', // This should work
            'completed' // This should work
          ];
          
          for (const testStatus of testStatuses) {
            console.log(`\n   Testing status: ${testStatus}`);
            const { data: updateResult, error: updateError } = await supabase
              .from('active_jobs')
              .update({ status: testStatus })
              .eq('id', existingJob.id)
              .select();
              
            if (updateError) {
              console.log(`   ❌ Failed: ${updateError.message}`);
              if (updateError.code === '23514') {
                console.log('   🎯 This is the constraint violation error!');
              }
            } else {
              console.log(`   ✅ Success: Updated to ${testStatus}`);
              
              // Revert back to original status
              await supabase
                .from('active_jobs')
                .update({ status: existingJob.status })
                .eq('id', existingJob.id);
            }
          }
        } else {
          console.log('⚠️  No existing active job found for this service offer');
        }
      }
    }
    
    // Check if there's a relationship between orders and active_jobs
    console.log('\n5. Checking relationship between orders and active_jobs...');
    
    // Look for any orders that might have corresponding active jobs
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(5);
      
    if (ordersError) {
      console.log('❌ Error fetching orders:', ordersError.message);
    } else {
      console.log(`✅ Found ${orders?.length || 0} orders`);
      
      if (orders && orders.length > 0) {
        for (const order of orders) {
          const { data: relatedJob, error: jobError } = await supabase
            .from('active_jobs')
            .select('*')
            .eq('service_offer_id', order.service_offer_id)
            .single();
            
          if (jobError && jobError.code !== 'PGRST116') {
            console.log(`❌ Error checking job for order ${order.id}:`, jobError.message);
          } else if (relatedJob) {
            console.log(`✅ Order ${order.id} has related active job ${relatedJob.id}`);
            console.log(`   Order status: ${order.status}`);
            console.log(`   Job status: ${relatedJob.status}`);
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 ANALYSIS RESULTS:');
    console.log('='.repeat(60));
    
    console.log('\nThe error "active_jobs_status_check" constraint violation suggests:');
    console.log('1. There is a trigger or function that updates active_jobs when orders change');
    console.log('2. This trigger is trying to set an invalid status on active_jobs');
    console.log('3. The status mapping between orders and active_jobs is incorrect');
    
    console.log('\n🛠️  SOLUTION:');
    console.log('We need to either:');
    console.log('1. Fix the status mapping in the trigger/function');
    console.log('2. Update the active_jobs constraint to allow more statuses');
    console.log('3. Modify confirm_work_completion to use correct active_jobs statuses');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkOrderTriggers().catch(console.error);