/**
 * Migrate existing job offers from chat messages to job_proposals table
 * This script finds chat messages that are job offers and creates corresponding proposal records
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Migrating existing job offers to job proposals...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateJobOffers() {
  try {
    // Step 1: Find all job-related chat messages with offers
    console.log('1️⃣ Finding job-related offer messages...');
    
    const { data: jobOfferMessages, error: messagesError } = await supabase
      .from('chat_messages')
      .select(`
        id,
        sender_id,
        custom_price,
        custom_description,
        custom_delivery_time,
        message,
        created_at,
        chat_id,
        chats!inner (
          participant1_id,
          participant2_id,
          service_title
        )
      `)
      .eq('message_type', 'offer')
      .like('message', '%Job%')
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('❌ Error fetching job offer messages:', messagesError);
      return;
    }

    console.log(`📋 Found ${jobOfferMessages?.length || 0} job offer messages`);

    if (!jobOfferMessages || jobOfferMessages.length === 0) {
      console.log('ℹ️  No job offers found to migrate');
      return;
    }

    // Step 2: Get all job listings to match against
    console.log('\n2️⃣ Fetching job listings...');
    
    const { data: jobListings, error: jobsError } = await supabase
      .from('job_listings')
      .select('id, title, user_id, created_at');

    if (jobsError) {
      console.error('❌ Error fetching job listings:', jobsError);
      return;
    }

    console.log(`📋 Found ${jobListings?.length || 0} job listings`);

    // Step 3: Process each job offer message
    console.log('\n3️⃣ Processing job offers...\n');
    
    let migratedCount = 0;
    let skippedCount = 0;

    for (const offer of jobOfferMessages) {
      try {
        // Determine buyer and seller
        const senderId = offer.sender_id;
        const buyerId = offer.chats.participant1_id === senderId 
          ? offer.chats.participant2_id 
          : offer.chats.participant1_id;
        
        console.log(`💼 Processing offer from ${senderId} to ${buyerId}`);
        console.log(`   Message: "${offer.message}"`);
        console.log(`   Price: $${offer.custom_price}`);
        
        // Try to match with a job listing based on the message content and participants
        let matchedJob = null;
        
        // First, try to find job by exact title match in message
        const messageText = offer.message.toLowerCase();
        for (const job of jobListings || []) {
          const jobTitle = job.title.toLowerCase();
          if (messageText.includes(jobTitle) && job.user_id === buyerId) {
            matchedJob = job;
            break;
          }
        }
        
        // If no exact match, try to find any job owned by the buyer
        if (!matchedJob) {
          const buyerJobs = jobListings?.filter(job => job.user_id === buyerId);
          if (buyerJobs && buyerJobs.length === 1) {
            matchedJob = buyerJobs[0];
            console.log(`   📎 Matched to single job: "${matchedJob.title}"`);
          } else if (buyerJobs && buyerJobs.length > 1) {
            // Try to match by creation date proximity (within 7 days)
            const offerDate = new Date(offer.created_at);
            const closestJob = buyerJobs
              .filter(job => {
                const jobDate = new Date(job.created_at);
                const daysDiff = Math.abs((offerDate.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24));
                return daysDiff <= 7;
              })
              .sort((a, b) => {
                const aDate = new Date(a.created_at);
                const bDate = new Date(b.created_at);
                const aDiff = Math.abs(offerDate.getTime() - aDate.getTime());
                const bDiff = Math.abs(offerDate.getTime() - bDate.getTime());
                return aDiff - bDiff;
              })[0];
            
            if (closestJob) {
              matchedJob = closestJob;
              console.log(`   📎 Matched to closest job: "${matchedJob.title}"`);
            }
          }
        }
        
        if (!matchedJob) {
          console.log(`   ⚠️  Could not match to a job listing - skipping`);
          skippedCount++;
          continue;
        }
        
        console.log(`   ✅ Matched to job: "${matchedJob.title}" (${matchedJob.id})`);
        
        // Check if proposal already exists
        const { data: existingProposal, error: checkError } = await supabase
          .from('job_proposals')
          .select('id')
          .eq('job_listing_id', matchedJob.id)
          .eq('seller_id', senderId)
          .single();
        
        if (existingProposal) {
          console.log(`   ℹ️  Proposal already exists - skipping`);
          skippedCount++;
          continue;
        }
        
        // Create the job proposal
        const proposalData = {
          job_listing_id: matchedJob.id,
          seller_id: senderId,
          buyer_id: buyerId,
          proposed_price: offer.custom_price ? parseFloat(offer.custom_price) : null,
          proposal_description: offer.custom_description || `Proposal for: ${matchedJob.title}`,
          proposed_timeline: offer.custom_delivery_time ? `${offer.custom_delivery_time} days` : null,
          work_type: 'remote', // Default since we don't have this info
          status: 'pending',
          created_at: offer.created_at,
          updated_at: offer.created_at
        };
        
        const { data: newProposal, error: proposalError } = await supabase
          .from('job_proposals')
          .insert(proposalData)
          .select()
          .single();
        
        if (proposalError) {
          console.error(`   ❌ Error creating proposal:`, proposalError);
          skippedCount++;
          continue;
        }
        
        console.log(`   🎉 Created proposal record: ${newProposal.id}`);
        
        // Create activity record
        const activityData = {
          job_proposal_id: newProposal.id,
          job_listing_id: matchedJob.id,
          activity_type: 'proposal_submitted',
          actor_id: senderId,
          target_user_id: buyerId,
          activity_description: `submitted a proposal for "${matchedJob.title}"`,
          metadata: {
            migrated_from_chat: true,
            original_message_id: offer.id,
            proposed_price: offer.custom_price
          },
          created_at: offer.created_at
        };
        
        const { error: activityError } = await supabase
          .from('job_proposal_activities')
          .insert(activityData);
        
        if (activityError) {
          console.error(`   ⚠️  Error creating activity record:`, activityError);
        } else {
          console.log(`   📝 Created activity record`);
        }
        
        migratedCount++;
        console.log('');
        
      } catch (error) {
        console.error(`   ❌ Error processing offer:`, error);
        skippedCount++;
      }
    }
    
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${migratedCount} proposals`);
    console.log(`   ⚠️  Skipped: ${skippedCount} offers`);
    
    // Step 4: Update job listing stats
    if (migratedCount > 0) {
      console.log('\n4️⃣ Updating job listing statistics...');
      
      const uniqueJobIds = [...new Set(jobOfferMessages.map(offer => {
        // We need to determine which job each offer was for
        // This is a simplified approach - in practice, you might want to be more precise
        return null; // We'll update this manually or with a separate query
      }).filter(Boolean))];
      
      // For now, let's update stats for all jobs that have proposals
      const { error: statsError } = await supabase.rpc('exec_sql', {
        sql: `
          INSERT INTO job_listing_stats (job_listing_id, total_proposals, pending_proposals, unique_sellers, last_proposal_date, last_activity_date)
          SELECT 
            jp.job_listing_id,
            COUNT(*) as total_proposals,
            COUNT(*) FILTER (WHERE jp.status = 'pending') as pending_proposals,
            COUNT(DISTINCT jp.seller_id) as unique_sellers,
            MAX(jp.created_at) as last_proposal_date,
            MAX(jp.created_at) as last_activity_date
          FROM job_proposals jp
          GROUP BY jp.job_listing_id
          ON CONFLICT (job_listing_id) DO UPDATE SET
            total_proposals = EXCLUDED.total_proposals,
            pending_proposals = EXCLUDED.pending_proposals,
            unique_sellers = EXCLUDED.unique_sellers,
            last_proposal_date = EXCLUDED.last_proposal_date,
            last_activity_date = EXCLUDED.last_activity_date,
            updated_at = NOW();
        `
      });
      
      if (statsError) {
        console.log('   ⚠️  Could not update stats automatically, but proposals were created successfully');
      } else {
        console.log('   ✅ Job listing statistics updated');
      }
    }
    
    console.log('\n🎉 Migration completed successfully!');
    
    if (migratedCount > 0) {
      console.log('\n💡 Next steps:');
      console.log('   1. Restart your app to see the proposals in the "I\'m Hiring" section');
      console.log('   2. Test the real-time notification system');
      console.log('   3. Verify proposal counts are showing correctly');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateJobOffers();
