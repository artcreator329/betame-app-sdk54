/**
 * Fix Missing Order Notifications (Recent)
 * 
 * This script fixes missing order notifications for recent active jobs
 * that should have generated notifications but didn't.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixMissingOrderNotificationsRecent() {
  console.log('🔧 Fixing Missing Order Notifications (Recent)...\n');

  try {
    // Step 1: Get recent active jobs
    console.log('1️⃣ Getting recent active jobs...');
    const { data: recentJobs, error: jobsError } = await supabase
      .from('active_jobs')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('❌ Error fetching recent jobs:', jobsError);
      return;
    }

    console.log(`📊 Found ${recentJobs.length} recent jobs`);

    // Step 2: Get existing order notifications
    console.log('\n2️⃣ Getting existing order notifications...');
    const { data: existingNotifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'order')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (notifError) {
      console.error('❌ Error fetching notifications:', notifError);
      return;
    }

    console.log(`📊 Found ${existingNotifications.length} existing order notifications`);

    // Step 3: Identify jobs missing notifications
    console.log('\n3️⃣ Identifying jobs missing notifications...');
    const jobsWithNotifications = new Set();
    
    existingNotifications.forEach(notification => {
      if (notification.data && notification.data.orderId) {
        jobsWithNotifications.add(notification.data.orderId);
      }
    });

    const jobsMissingNotifications = recentJobs.filter(job => 
      !jobsWithNotifications.has(job.id)
    );

    console.log(`📊 Found ${jobsMissingNotifications.length} jobs missing notifications`);

    if (jobsMissingNotifications.length === 0) {
      console.log('✅ All recent jobs have notifications! No action needed.');
      return;
    }

    // Step 4: Get buyer profiles for missing notifications
    console.log('\n4️⃣ Getting buyer profiles...');
    const buyerIds = [...new Set(jobsMissingNotifications.map(job => job.buyer_id))];
    
    const { data: buyerProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', buyerIds);

    if (profilesError) {
      console.error('❌ Error fetching buyer profiles:', profilesError);
      return;
    }

    const buyerProfileMap = {};
    buyerProfiles.forEach(profile => {
      buyerProfileMap[profile.id] = profile;
    });

    // Step 5: Create missing notifications
    console.log('\n5️⃣ Creating missing notifications...');
    let successCount = 0;
    let errorCount = 0;

    for (const job of jobsMissingNotifications) {
      try {
        const buyerProfile = buyerProfileMap[job.buyer_id];
        if (!buyerProfile) {
          console.log(`⚠️ Buyer profile not found for ${job.buyer_id}`);
          continue;
        }

        // Determine order type based on service_offer_id
        const orderType = job.service_offer_id ? 'offer' : 'direct';

        // Create notification data
        const notificationData = {
          user_id: job.service_provider_id,
          type: 'order',
          title: 'New Order Received!',
          message: `${buyerProfile.full_name} placed a new order for "${job.title}" (${job.currency} ${job.price}). Please review and confirm.`,
          data: {
            orderId: job.id,
            serviceTitle: job.title,
            buyerName: buyerProfile.full_name,
            buyerImage: buyerProfile.avatar_url || '',
            price: job.price,
            currency: job.currency || 'RM',
            orderType,
            action_required: true
          },
          created_at: job.created_at, // Use the job creation time
          is_read: false
        };

        // Insert notification
        const { data: notification, error: insertError } = await supabase
          .from('notifications')
          .insert(notificationData)
          .select()
          .single();

        if (insertError) {
          console.error(`❌ Failed to create notification for job ${job.id}:`, insertError.message);
          errorCount++;
        } else {
          console.log(`✅ Created notification for job ${job.id} (${buyerProfile.full_name} → ${job.service_provider_id})`);
          successCount++;
        }

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error processing job ${job.id}:`, error.message);
        errorCount++;
      }
    }

    // Step 6: Summary
    console.log('\n📊 Summary:');
    console.log(`✅ Successfully created: ${successCount} notifications`);
    console.log(`❌ Failed to create: ${errorCount} notifications`);
    console.log(`📊 Total jobs processed: ${jobsMissingNotifications.length}`);

    if (successCount > 0) {
      console.log('\n🎉 Missing order notifications have been fixed!');
    } else {
      console.log('\n⚠️ No notifications were created. Please check the errors above.');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
if (require.main === module) {
  fixMissingOrderNotificationsRecent()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixMissingOrderNotificationsRecent };
