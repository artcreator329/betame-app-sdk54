const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkServiceOffersOrders() {
  console.log('🔍 Checking service offers and job status for order-like data...\n');
  
  try {
    // Check service offers
    console.log('1. Checking service offers...');
    const { data: serviceOffers, error: offersError } = await supabase
      .from('service_offers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (offersError) {
      console.log('❌ Error fetching service offers:', offersError.message);
    } else {
      console.log(`✅ Found ${serviceOffers?.length || 0} service offers`);
      
      if (serviceOffers && serviceOffers.length > 0) {
        console.log('\n📊 Service offers breakdown by status:');
        const statusCounts = {};
        serviceOffers.forEach(offer => {
          statusCounts[offer.status] = (statusCounts[offer.status] || 0) + 1;
        });
        
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`   ${status}: ${count}`);
        });
        
        // Look for accepted offers that might be "orders"
        const acceptedOffers = serviceOffers.filter(offer => offer.status === 'accepted');
        if (acceptedOffers.length > 0) {
          console.log(`\n🎯 Found ${acceptedOffers.length} accepted service offers (potential orders):`);
          acceptedOffers.forEach((offer, index) => {
            console.log(`   ${index + 1}. ${offer.id}`);
            console.log(`      Service: ${offer.service_title || 'N/A'}`);
            console.log(`      Amount: ${offer.amount || 'N/A'}`);
            console.log(`      Buyer: ${offer.buyer_id}`);
            console.log(`      Service Provider: ${offer.service_provider_id}`);
            console.log(`      Created: ${new Date(offer.created_at).toLocaleString()}`);
            console.log('');
          });
        }
      }
    }
    
    // Check job status
    console.log('\n2. Checking job status...');
    const { data: jobStatuses, error: jobError } = await supabase
      .from('job_status')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (jobError) {
      console.log('❌ Error fetching job statuses:', jobError.message);
    } else {
      console.log(`✅ Found ${jobStatuses?.length || 0} job statuses`);
      
      if (jobStatuses && jobStatuses.length > 0) {
        console.log('\n📊 Job status breakdown:');
        const statusCounts = {};
        jobStatuses.forEach(job => {
          statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
        });
        
        Object.entries(statusCounts).forEach(([status, count]) => {
          console.log(`   ${status}: ${count}`);
        });
        
        // Look for completed jobs that might need confirmation
        const completedJobs = jobStatuses.filter(job => job.status === 'completed');
        if (completedJobs.length > 0) {
          console.log(`\n✅ Found ${completedJobs.length} completed jobs:`);
          completedJobs.forEach((job, index) => {
            console.log(`   ${index + 1}. ${job.id}`);
            console.log(`      Service Offer: ${job.service_offer_id}`);
            console.log(`      Status: ${job.status}`);
            console.log(`      Completed: ${job.completed_at || 'N/A'}`);
            console.log(`      Confirmed: ${job.confirmed_by_buyer || 'N/A'}`);
            console.log('');
          });
        }
        
        // Look for jobs awaiting buyer confirmation
        const awaitingConfirmation = jobStatuses.filter(job => 
          job.status === 'completed' && !job.confirmed_by_buyer
        );
        
        if (awaitingConfirmation.length > 0) {
          console.log(`\n⏳ Found ${awaitingConfirmation.length} jobs awaiting buyer confirmation:`);
          awaitingConfirmation.forEach((job, index) => {
            console.log(`   ${index + 1}. ${job.id}`);
            console.log(`      Service Offer: ${job.service_offer_id}`);
            console.log(`      Completed: ${job.completed_at}`);
            console.log('');
          });
          
          // This might be where the actual confirmation logic should happen
          console.log('\n🎯 POTENTIAL ROOT CAUSE:');
          console.log('   The app might be using job_status table for order management');
          console.log('   instead of the orders table. The confirmation might need to');
          console.log('   update the job_status.confirmed_by_buyer field.');
        }
      }
    }
    
    // Check if there's a relationship between service offers and orders
    console.log('\n3. Checking for service offers that should have orders...');
    if (serviceOffers && serviceOffers.length > 0) {
      const acceptedOffers = serviceOffers.filter(offer => offer.status === 'accepted');
      
      for (const offer of acceptedOffers) {
        const { data: relatedOrder, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('service_offer_id', offer.id)
          .single();
          
        if (orderError && orderError.code !== 'PGRST116') {
          console.log(`❌ Error checking order for offer ${offer.id}:`, orderError.message);
        } else if (relatedOrder) {
          console.log(`✅ Found order ${relatedOrder.id} for offer ${offer.id}`);
        } else {
          console.log(`⚠️  No order found for accepted offer ${offer.id}`);
          console.log('   This suggests orders are not being created for accepted offers');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkServiceOffersOrders().catch(console.error);