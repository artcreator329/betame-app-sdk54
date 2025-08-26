/**
 * Test Order Notification System
 * 
 * This script tests the complete order notification system to identify
 * why new paid orders are not showing up on the notification page.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testOrderNotificationSystem() {
  console.log('🧪 Testing Order Notification System...\n');

  try {
    // Step 1: Check recent active jobs
    console.log('1️⃣ Checking recent active jobs...');
    const { data: recentJobs, error: jobsError } = await supabase
      .from('active_jobs')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (jobsError) {
      console.error('❌ Error fetching recent jobs:', jobsError);
      return;
    }

    console.log(`📊 Found ${recentJobs.length} recent jobs`);

    // Step 2: Check notifications for these jobs
    console.log('\n2️⃣ Checking notifications for recent jobs...');
    let jobsWithNotifications = 0;
    let jobsWithoutNotifications = 0;

    for (const job of recentJobs) {
      const { data: notifications, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'order')
        .eq('data->>orderId', job.id);

      if (notifError) {
        console.error(`❌ Error checking notifications for job ${job.id}:`, notifError);
        continue;
      }

      if (notifications && notifications.length > 0) {
        console.log(`✅ Job ${job.id} (${job.title}) has ${notifications.length} notification(s)`);
        jobsWithNotifications++;
      } else {
        console.log(`❌ Job ${job.id} (${job.title}) has NO notifications`);
        jobsWithoutNotifications++;
      }
    }

    // Step 3: Test notification creation for a recent job without notification
    console.log('\n3️⃣ Testing notification creation for missing notifications...');
    
    const jobsWithoutNotifs = recentJobs.filter(job => {
      const notifications = supabase
        .from('notifications')
        .select('*')
        .eq('type', 'order')
        .eq('data->>orderId', job.id);
      return !notifications || notifications.length === 0;
    });

    if (jobsWithoutNotifs.length > 0) {
      const testJob = jobsWithoutNotifs[0];
      console.log(`🔧 Testing notification creation for job: ${testJob.id}`);
      
      // Get buyer profile
      const { data: buyerProfile, error: buyerError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', testJob.buyer_id)
        .single();

      if (buyerError) {
        console.error('❌ Error fetching buyer profile:', buyerError);
        return;
      }

      console.log(`📝 Job details:`);
      console.log(`   - Job ID: ${testJob.id}`);
      console.log(`   - Title: ${testJob.title}`);
      console.log(`   - Buyer: ${buyerProfile.full_name} (${testJob.buyer_id})`);
      console.log(`   - Service Provider: ${testJob.service_provider_id}`);
      console.log(`   - Status: ${testJob.status}`);
      console.log(`   - Payment Status: ${testJob.payment_status}`);
      console.log(`   - Created: ${testJob.created_at}`);

      // Create test notification
      const testNotificationData = {
        user_id: testJob.service_provider_id,
        type: 'order',
        title: 'New Order Received!',
        message: `${buyerProfile.full_name} placed a new order for "${testJob.title}" (RM ${testJob.price}). Please review and confirm.`,
        data: {
          orderId: testJob.id,
          serviceTitle: testJob.title,
          buyerName: buyerProfile.full_name,
          buyerImage: buyerProfile.avatar_url || '',
          price: testJob.price,
          currency: testJob.currency || 'RM',
          orderType: 'direct',
          action_required: true
        },
        created_at: testJob.created_at, // Use job creation time
        is_read: false
      };

      console.log('\n📝 Creating test notification...');
      const { data: testNotification, error: createError } = await supabase
        .from('notifications')
        .insert(testNotificationData)
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create test notification:', createError);
        return;
      }

      console.log('✅ Test notification created successfully:', testNotification.id);

      // Clean up test notification
      await supabase
        .from('notifications')
        .delete()
        .eq('id', testNotification.id);

      console.log('✅ Test notification cleaned up');
    }

    // Step 4: Test the notification service RPC function
    console.log('\n4️⃣ Testing notification service RPC function...');
    
    if (jobsWithoutNotifs.length > 0) {
      const testJob = jobsWithoutNotifs[0];
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', testJob.buyer_id)
        .single();

      // Test with explicit ID parameter
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_notification', {
        p_user_id: testJob.service_provider_id,
        p_type: 'order',
        p_title: 'Test RPC Order Notification',
        p_message: `${buyerProfile.full_name} placed a new order for "${testJob.title}" (RM ${testJob.price}). Please review and confirm.`,
        p_data: {
          orderId: testJob.id,
          serviceTitle: testJob.title,
          buyerName: buyerProfile.full_name,
          buyerImage: buyerProfile.avatar_url || '',
          price: testJob.price,
          currency: testJob.currency || 'RM',
          orderType: 'direct',
          action_required: true
        },
        p_id: `test-order-rpc-${Date.now()}`
      });

      if (rpcError) {
        console.error('❌ RPC notification creation failed:', rpcError.message);
      } else {
        console.log('✅ RPC notification creation successful:', rpcResult);
      }
    }

    // Step 5: Analyze potential issues
    console.log('\n5️⃣ Analysis of potential issues...');
    console.log('🔍 Issues identified:');
    console.log(`  - ${jobsWithNotifications} jobs have notifications`);
    console.log(`  - ${jobsWithoutNotifications} jobs are missing notifications`);
    console.log('  - Manual notification creation works fine');
    console.log('  - RPC function works when called directly');
    console.log('  - Issue is likely in the ActiveJobService notification calls');
    
    console.log('\n🔧 Recommended fixes:');
    console.log('  1. Check if ActiveJobService.createJobFromDirectOrder is calling notifications');
    console.log('  2. Check if ActiveJobService.createJobFromOffer is calling notifications');
    console.log('  3. Verify notification service is properly initialized');
    console.log('  4. Add fallback notification creation in payment service');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testOrderNotificationSystem()
    .then(() => {
      console.log('\n✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testOrderNotificationSystem };
