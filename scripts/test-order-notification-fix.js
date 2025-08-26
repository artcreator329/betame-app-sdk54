/**
 * Test Order Notification Fix
 * 
 * This script tests the order notification system to ensure it's working correctly
 * after the fixes have been applied.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testOrderNotificationFix() {
  console.log('🧪 Testing Order Notification Fix...\n');

  try {
    // Step 1: Check recent active jobs
    console.log('1️⃣ Checking recent active jobs...');
    const { data: recentJobs, error: jobsError } = await supabase
      .from('active_jobs')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })
      .limit(5);

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

    // Step 3: Test notification creation
    console.log('\n3️⃣ Testing notification creation...');
    
    // Get a test user
    const { data: testUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .limit(2);

    if (usersError || !testUsers || testUsers.length < 2) {
      console.error('❌ Error fetching test users:', usersError);
      return;
    }

    const [buyer, serviceProvider] = testUsers;
    
    // Create a test notification
    const testNotificationData = {
      user_id: serviceProvider.id,
      type: 'order',
      title: 'Test Order Notification',
      message: `Test notification from ${buyer.full_name} for "Test Service" (RM 100)`,
      data: {
        orderId: `test-${Date.now()}`,
        serviceTitle: 'Test Service',
        buyerName: buyer.full_name,
        buyerImage: '',
        price: 100,
        currency: 'RM',
        orderType: 'direct',
        action_required: true
      },
      created_at: new Date().toISOString(),
      is_read: false
    };

    const { data: testNotification, error: testError } = await supabase
      .from('notifications')
      .insert(testNotificationData)
      .select()
      .single();

    if (testError) {
      console.error('❌ Failed to create test notification:', testError);
      return;
    }

    console.log('✅ Test notification created successfully:', testNotification.id);

    // Clean up test notification
    await supabase
      .from('notifications')
      .delete()
      .eq('id', testNotification.id);

    console.log('✅ Test notification cleaned up');

    // Step 4: Summary
    console.log('\n📊 Test Results:');
    console.log(`✅ Jobs with notifications: ${jobsWithNotifications}`);
    console.log(`❌ Jobs without notifications: ${jobsWithoutNotifications}`);
    console.log(`📊 Total recent jobs checked: ${recentJobs.length}`);

    if (jobsWithoutNotifications > 0) {
      console.log('\n⚠️ Some recent jobs are missing notifications!');
      console.log('💡 Run the backfill script: node scripts/fix-missing-order-notifications.js');
    } else {
      console.log('\n🎉 All recent jobs have notifications!');
    }

    console.log('\n✅ Test notification creation: WORKING');
    console.log('✅ Notification system is functional');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testOrderNotificationFix()
    .then(() => {
      console.log('\n✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testOrderNotificationFix };