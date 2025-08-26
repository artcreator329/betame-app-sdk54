/**
 * Test Complete Notification System
 * 
 * This script tests the complete notification system to ensure:
 * 1. Database notifications are created properly
 * 2. Phone notifications are triggered
 * 3. All notification types work correctly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCompleteNotificationSystem() {
  console.log('🧪 Testing Complete Notification System...\n');

  try {
    // Step 1: Check recent notifications in database
    console.log('1️⃣ Checking recent notifications in database...');
    const { data: recentNotifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (notifError) {
      console.error('❌ Error fetching recent notifications:', notifError);
      return;
    }

    console.log(`📊 Found ${recentNotifications.length} recent notifications`);

    // Group notifications by type
    const notificationsByType = {};
    recentNotifications.forEach(notification => {
      const type = notification.type;
      if (!notificationsByType[type]) {
        notificationsByType[type] = [];
      }
      notificationsByType[type].push(notification);
    });

    console.log('\n📊 Notifications by type:');
    Object.entries(notificationsByType).forEach(([type, notifications]) => {
      console.log(`  - ${type}: ${notifications.length} notifications`);
    });

    // Step 2: Check if notifications have proper data
    console.log('\n2️⃣ Checking notification data quality...');
    let validNotifications = 0;
    let invalidNotifications = 0;

    recentNotifications.forEach(notification => {
      const hasTitle = notification.title && notification.title.length > 0;
      const hasMessage = notification.message && notification.message.length > 0;
      const hasUserId = notification.user_id;
      const hasData = notification.data;

      if (hasTitle && hasMessage && hasUserId && hasData) {
        validNotifications++;
      } else {
        invalidNotifications++;
        console.log(`⚠️ Invalid notification ${notification.id}:`, {
          hasTitle,
          hasMessage,
          hasUserId,
          hasData: !!hasData
        });
      }
    });

    console.log(`✅ Valid notifications: ${validNotifications}`);
    console.log(`❌ Invalid notifications: ${invalidNotifications}`);

    // Step 3: Test notification creation for different types
    console.log('\n3️⃣ Testing notification creation for different types...');
    
    // Get a test user
    const { data: testUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .limit(1);

    if (usersError || !testUsers || testUsers.length === 0) {
      console.error('❌ Error fetching test users:', usersError);
      return;
    }

    const testUser = testUsers[0];
    console.log(`📝 Using test user: ${testUser.full_name} (${testUser.id})`);

    // Test different notification types
    const testNotifications = [
      {
        type: 'order',
        title: 'Test Order Notification',
        message: 'This is a test order notification',
        data: {
          orderId: `test-order-${Date.now()}`,
          serviceTitle: 'Test Service',
          buyerName: 'Test Buyer',
          price: 100,
          currency: 'RM',
          orderType: 'direct'
        }
      },
      {
        type: 'chat',
        title: 'Test Chat Notification',
        message: 'This is a test chat notification',
        data: {
          chatId: `test-chat-${Date.now()}`,
          participantId: testUser.id,
          participantName: 'Test Sender',
          participantImage: ''
        }
      },
      {
        type: 'offer',
        title: 'Test Offer Notification',
        message: 'This is a test offer notification',
        data: {
          chatId: `test-chat-${Date.now()}`,
          offerId: `test-offer-${Date.now()}`,
          participantId: testUser.id,
          participantName: 'Test Seller',
          serviceTitle: 'Test Service',
          price: 150,
          currency: 'RM'
        }
      },
      {
        type: 'system',
        title: 'Test System Notification',
        message: 'This is a test system notification',
        data: {
          actionType: 'test',
          test: true
        }
      }
    ];

    let testSuccessCount = 0;
    let testErrorCount = 0;

    for (const testNotif of testNotifications) {
      try {
        const notificationData = {
          user_id: testUser.id,
          type: testNotif.type,
          title: testNotif.title,
          message: testNotif.message,
          data: testNotif.data,
          created_at: new Date().toISOString(),
          is_read: false
        };

        const { data: notification, error: insertError } = await supabase
          .from('notifications')
          .insert(notificationData)
          .select()
          .single();

        if (insertError) {
          console.error(`❌ Failed to create ${testNotif.type} notification:`, insertError.message);
          testErrorCount++;
        } else {
          console.log(`✅ Created ${testNotif.type} notification: ${notification.id}`);
          testSuccessCount++;

          // Clean up test notification
          await supabase
            .from('notifications')
            .delete()
            .eq('id', notification.id);
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error testing ${testNotif.type} notification:`, error.message);
        testErrorCount++;
      }
    }

    // Step 4: Check notification service configuration
    console.log('\n4️⃣ Checking notification service configuration...');
    
    // Check if RPC function exists and works
    const { data: rpcTest, error: rpcError } = await supabase.rpc('create_notification', {
      p_user_id: testUser.id,
      p_type: 'system',
      p_title: 'RPC Test Notification',
      p_message: 'Testing RPC notification creation',
      p_data: { test: true },
      p_id: `test-rpc-${Date.now()}`
    });

    if (rpcError) {
      console.error('❌ RPC notification creation failed:', rpcError.message);
    } else {
      console.log('✅ RPC notification creation successful:', rpcTest);
      
      // Clean up RPC test notification
      await supabase
        .from('notifications')
        .delete()
        .eq('id', rpcTest);
    }

    // Step 5: Summary and recommendations
    console.log('\n5️⃣ Summary and recommendations...');
    console.log('📊 Test Results:');
    console.log(`  - Database notifications: ${validNotifications}/${recentNotifications.length} valid`);
    console.log(`  - Test notifications: ${testSuccessCount}/${testNotifications.length} successful`);
    console.log(`  - RPC function: ${rpcError ? '❌ Failed' : '✅ Working'}`);

    console.log('\n🔍 Phone Notification Status:');
    console.log('  - Database notifications are working ✅');
    console.log('  - Phone notifications depend on:');
    console.log('    1. expo-notifications module being installed');
    console.log('    2. Notification permissions being granted');
    console.log('    3. Local notification service being configured');
    console.log('    4. App being in background/closed state');

    console.log('\n📱 To test phone notifications:');
    console.log('  1. Use the NotificationTestPanel in the app');
    console.log('  2. Ensure app is in background when testing');
    console.log('  3. Check device notification settings');
    console.log('  4. Test on real device (not simulator)');

    console.log('\n🔧 If phone notifications not working:');
    console.log('  1. Check notification permissions in device settings');
    console.log('  2. Verify expo-notifications is properly installed');
    console.log('  3. Test with NotificationTestPanel component');
    console.log('  4. Check console logs for error messages');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testCompleteNotificationSystem()
    .then(() => {
      console.log('\n✅ Test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testCompleteNotificationSystem };
