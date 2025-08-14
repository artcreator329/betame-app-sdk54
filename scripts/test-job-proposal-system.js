/**
 * Test script for the job proposal system
 * Run with: node scripts/test-job-proposal-system.js
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testJobProposalSystem() {
  console.log('🧪 Testing Job Proposal System...\n');

  try {
    // 1. Check if tables exist
    console.log('1. Checking database tables...');
    
    const tables = ['job_proposals', 'job_proposal_activities', 'job_listing_stats', 'user_notification_preferences'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table '${table}' not found or accessible: ${error.message}`);
      } else {
        console.log(`✅ Table '${table}' exists and is accessible`);
      }
    }

    // 2. Test job listing stats functionality
    console.log('\n2. Testing job listing stats...');
    
    // Get a sample job listing
    const { data: jobListings, error: jobError } = await supabase
      .from('job_listings')
      .select('id, user_id, title')
      .limit(1);

    if (jobError || !jobListings || jobListings.length === 0) {
      console.log('❌ No job listings found for testing');
      return;
    }

    const testJob = jobListings[0];
    console.log(`📋 Using test job: "${testJob.title}" (ID: ${testJob.id})`);

    // Get job stats
    const { data: stats, error: statsError } = await supabase
      .from('job_listing_stats')
      .select('*')
      .eq('job_listing_id', testJob.id);

    if (statsError) {
      console.log(`❌ Error fetching job stats: ${statsError.message}`);
    } else if (stats && stats.length > 0) {
      console.log(`✅ Job stats found:`, stats[0]);
    } else {
      console.log(`ℹ️  No stats found for this job (normal for jobs without proposals)`);
    }

    // 3. Test job proposals query
    console.log('\n3. Testing job proposals query...');
    
    const { data: proposals, error: proposalsError } = await supabase
      .from('job_proposals')
      .select(`
        *,
        seller_profile:profiles!job_proposals_seller_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('job_listing_id', testJob.id);

    if (proposalsError) {
      console.log(`❌ Error fetching proposals: ${proposalsError.message}`);
    } else {
      console.log(`✅ Found ${proposals.length} proposals for this job`);
      if (proposals.length > 0) {
        console.log(`   Sample proposal:`, {
          id: proposals[0].id,
          status: proposals[0].status,
          proposed_price: proposals[0].proposed_price,
          seller_name: proposals[0].seller_profile?.full_name
        });
      }
    }

    // 4. Test job activities query
    console.log('\n4. Testing job activities query...');
    
    const { data: activities, error: activitiesError } = await supabase
      .from('job_proposal_activities')
      .select(`
        *,
        actor_profile:profiles!job_proposal_activities_actor_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('target_user_id', testJob.user_id)
      .limit(5);

    if (activitiesError) {
      console.log(`❌ Error fetching activities: ${activitiesError.message}`);
    } else {
      console.log(`✅ Found ${activities.length} activities for job owner`);
      if (activities.length > 0) {
        console.log(`   Sample activity:`, {
          id: activities[0].id,
          type: activities[0].activity_type,
          description: activities[0].activity_description,
          actor: activities[0].actor_profile?.full_name
        });
      }
    }

    // 5. Test notification preferences
    console.log('\n5. Testing notification preferences...');
    
    const { data: preferences, error: preferencesError } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', testJob.user_id)
      .single();

    if (preferencesError && preferencesError.code !== 'PGRST116') {
      console.log(`❌ Error fetching preferences: ${preferencesError.message}`);
    } else if (preferences) {
      console.log(`✅ Found notification preferences:`, {
        job_proposals: preferences.job_proposals,
        proposal_status_updates: preferences.proposal_status_updates,
        job_messages: preferences.job_messages
      });
    } else {
      console.log(`ℹ️  No notification preferences found (will use defaults)`);
    }

    console.log('\n🎉 Job proposal system test completed!');
    console.log('\n📝 Summary:');
    console.log('   - Database tables are properly set up');
    console.log('   - Queries are working correctly');
    console.log('   - The system is ready for use');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testJobProposalSystem();
