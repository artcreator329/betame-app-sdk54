/**
 * Find additional job offers that might need migration
 * This script helps identify chat messages that could be job proposals
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findJobOffers() {
  console.log('🔍 Looking for additional job offers...\n');

  try {
    // Find all offer messages
    const { data: allOffers, error: offersError } = await supabase
      .from('chat_messages')
      .select(`
        id,
        sender_id,
        custom_price,
        custom_description,
        message,
        created_at,
        chats!inner (
          participant1_id,
          participant2_id,
          service_title
        )
      `)
      .eq('message_type', 'offer')
      .order('created_at', { ascending: false });

    if (offersError) {
      console.error('❌ Error fetching offers:', offersError);
      return;
    }

    console.log(`📋 Found ${allOffers?.length || 0} total offer messages\n`);

    // Check which ones are already migrated
    const { data: existingProposals, error: proposalsError } = await supabase
      .from('job_proposals')
      .select('seller_id, buyer_id, created_at');

    if (proposalsError) {
      console.error('❌ Error fetching proposals:', proposalsError);
      return;
    }

    console.log(`📋 Found ${existingProposals?.length || 0} existing proposals\n`);

    // Categorize offers
    const jobRelatedOffers = [];
    const serviceOffers = [];
    const alreadyMigrated = [];

    for (const offer of allOffers || []) {
      const senderId = offer.sender_id;
      const buyerId = offer.chats.participant1_id === senderId 
        ? offer.chats.participant2_id 
        : offer.chats.participant1_id;

      // Check if already migrated
      const isMigrated = existingProposals?.some(proposal => 
        proposal.seller_id === senderId && 
        proposal.buyer_id === buyerId &&
        Math.abs(new Date(proposal.created_at) - new Date(offer.created_at)) < 1000 // Within 1 second
      );

      if (isMigrated) {
        alreadyMigrated.push(offer);
      } else if (offer.message.toLowerCase().includes('job')) {
        jobRelatedOffers.push(offer);
      } else {
        serviceOffers.push(offer);
      }
    }

    console.log('📊 Categorization Results:');
    console.log(`   ✅ Already migrated: ${alreadyMigrated.length}`);
    console.log(`   💼 Job-related offers: ${jobRelatedOffers.length}`);
    console.log(`   🛠️  Service offers: ${serviceOffers.length}\n`);

    if (jobRelatedOffers.length > 0) {
      console.log('💼 Job-related offers that might need migration:');
      for (const offer of jobRelatedOffers) {
        console.log(`   📝 "${offer.message}" - $${offer.custom_price} (${offer.created_at})`);
      }
      console.log('\n💡 To migrate these, run: node scripts/migrate-existing-job-offers.js\n');
    }

    if (serviceOffers.length > 0) {
      console.log('🛠️  Service offers (not job proposals):');
      serviceOffers.slice(0, 5).forEach(offer => {
        console.log(`   📝 "${offer.message}" - $${offer.custom_price}`);
      });
      if (serviceOffers.length > 5) {
        console.log(`   ... and ${serviceOffers.length - 5} more`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findJobOffers();
