// Debug script to identify what's blocking service deletion
// Run this with: node scripts/debug-service-deletion.js SERVICE_ID

const { createClient } = require('@supabase/supabase-js');

// You'll need to add your Supabase URL and key here
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugServiceDeletion(serviceId) {
  console.log(`🔍 Debugging deletion for service: ${serviceId}`);
  
  try {
    // Check service offers
    const { data: serviceOffers, error: offersError } = await supabase
      .from('service_offers')
      .select('id, status')
      .eq('service_id', serviceId);

    if (offersError) {
      console.error('❌ Error checking service offers:', offersError);
      return;
    }

    console.log(`📋 Found ${serviceOffers?.length || 0} service offers`);
    
    if (serviceOffers && serviceOffers.length > 0) {
      const serviceOfferIds = serviceOffers.map(offer => offer.id);
      console.log(`🔗 Service offer IDs: ${serviceOfferIds.join(', ')}`);

      // Check active jobs
      const { data: activeJobs, error: activeJobsError } = await supabase
        .from('active_jobs')
        .select('id, title, status')
        .in('service_offer_id', serviceOfferIds);

      if (activeJobsError) {
        console.error('❌ Error checking active jobs:', activeJobsError);
      } else {
        console.log(`💼 Found ${activeJobs?.length || 0} active jobs`);
        if (activeJobs && activeJobs.length > 0) {
          activeJobs.forEach(job => {
            console.log(`  - Job ${job.id}: ${job.title} (${job.status})`);
          });
        }
      }

      // Check job status
      const { data: jobStatuses, error: jobStatusError } = await supabase
        .from('job_status')
        .select('id, current_status')
        .in('service_offer_id', serviceOfferIds);

      if (jobStatusError) {
        console.error('❌ Error checking job status:', jobStatusError);
      } else {
        console.log(`📊 Found ${jobStatuses?.length || 0} job status records`);
        if (jobStatuses && jobStatuses.length > 0) {
          jobStatuses.forEach(js => {
            console.log(`  - Job Status ${js.id}: ${js.current_status}`);
          });
        }
      }

      // Check escrow transactions
      const { data: escrowTxns, error: escrowError } = await supabase
        .from('escrow_transactions')
        .select('id, status, amount')
        .in('service_offer_id', serviceOfferIds);

      if (escrowError) {
        console.error('❌ Error checking escrow transactions:', escrowError);
      } else {
        console.log(`💰 Found ${escrowTxns?.length || 0} escrow transactions`);
        if (escrowTxns && escrowTxns.length > 0) {
          escrowTxns.forEach(txn => {
            console.log(`  - Escrow ${txn.id}: ${txn.status} (${txn.amount})`);
          });
        }
      }
    }

    // Check other dependencies
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('id, service_title')
      .eq('service_id', serviceId);

    if (chatsError) {
      console.error('❌ Error checking chats:', chatsError);
    } else {
      console.log(`💬 Found ${chats?.length || 0} chats`);
    }

    const { data: favorites, error: favoritesError } = await supabase
      .from('favorites')
      .select('id')
      .eq('service_id', serviceId);

    if (favoritesError) {
      console.error('❌ Error checking favorites:', favoritesError);
    } else {
      console.log(`⭐ Found ${favorites?.length || 0} favorites`);
    }

    console.log('✅ Debug complete');

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Get service ID from command line arguments
const serviceId = process.argv[2];
if (!serviceId) {
  console.error('❌ Please provide a service ID as an argument');
  console.log('Usage: node scripts/debug-service-deletion.js SERVICE_ID');
  process.exit(1);
}

debugServiceDeletion(serviceId);