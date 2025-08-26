#!/usr/bin/env node

/**
 * Diagnostic Script for Order Notification Issues
 * 
 * This script investigates why order notifications aren't showing up by:
 * 1. Checking database table structures
 * 2. Looking for existing data
 * 3. Testing notification creation
 * 4. Identifying the root cause
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function diagnoseOrderNotificationIssue() {
  console.log('🔍 Diagnosing Order Notification Issues...\n');

  try {
    // Step 1: Check if tables exist and their structure
    console.log('1️⃣ Checking database table structures...\n');

    // Check orders table
    console.log('📋 Checking orders table...');
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

      if (ordersError) {
        if (ordersError.code === 'PGRST116') {
          console.log('❌ Orders table does not exist');
        } else {
          console.log('❌ Orders table error:', ordersError.message);
        }
      } else {
        console.log('✅ Orders table exists');
        console.log(`📊 Sample data count: ${ordersData?.length || 0}`);
        if (ordersData && ordersData.length > 0) {
          console.log('📋 Sample order structure:', Object.keys(ordersData[0]));
        }
      }
    } catch (error) {
      console.log('❌ Orders table check failed:', error.message);
    }

    // Check service_offers table
    console.log('\n📋 Checking service_offers table...');
    try {
      const { data: offersData, error: offersError } = await supabase
        .from('service_offers')
        .select('*')
        .limit(1);

      if (offersError) {
        if (offersError.code === 'PGRST116') {
          console.log('❌ Service_offers table does not exist');
        } else {
          console.log('❌ Service_offers table error:', offersError.message);
        }
      } else {
        console.log('✅ Service_offers table exists');
        console.log(`📊 Sample data count: ${offersData?.length || 0}`);
        if (offersData && offersData.length > 0) {
          console.log('📋 Sample offer structure:', Object.keys(offersData[0]));
        }
      }
    } catch (error) {
      console.log('❌ Service_offers table check failed:', error.message);
    }

    // Check notifications table
    console.log('\n📋 Checking notifications table...');
    try {
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .limit(1);

      if (notificationsError) {
        if (notificationsError.code === 'PGRST116') {
          console.log('❌ Notifications table does not exist');
        } else {
          console.log('❌ Notifications table error:', notificationsError.message);
        }
      } else {
        console.log('✅ Notifications table exists');
        console.log(`📊 Sample data count: ${notificationsData?.length || 0}`);
        if (notificationsData && notificationsData.length > 0) {
          console.log('📋 Sample notification structure:', Object.keys(notificationsData[0]));
        }
      }
    } catch (error) {
      console.log('❌ Notifications table check failed:', error.message);
    }

    // Step 2: Look for actual data that should have notifications
    console.log('\n2️⃣ Looking for data that should have order notifications...\n');

    // Check for service offers with accepted status
    console.log('📋 Checking for accepted service offers...');
    try {
      const { data: acceptedOffers, error: acceptedError } = await supabase
        .from('service_offers')
        .select('id, status, buyer_id, service_provider_id, seller_id, custom_price, original_price, custom_description, created_at')
        .in('status', ['accepted', 'in_progress', 'completed'])
        .limit(10);

      if (acceptedError) {
        console.log('❌ Error checking accepted offers:', acceptedError.message);
      } else {
        console.log(`📊 Found ${acceptedOffers?.length || 0} accepted/in-progress offers`);
        if (acceptedOffers && acceptedOffers.length > 0) {
          console.log('📋 Sample accepted offers:');
          acceptedOffers.slice(0, 3).forEach((offer, index) => {
            console.log(`   ${index + 1}. ID: ${offer.id}, Status: ${offer.status}, Price: ${offer.custom_price || offer.original_price}`);
          });
        }
      }
    } catch (error) {
      console.log('❌ Accepted offers check failed:', error.message);
    }

    // Check for existing order notifications
    console.log('\n📋 Checking for existing order notifications...');
    try {
      const { data: orderNotifications, error: orderNotifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'order')
        .limit(10);

      if (orderNotifError) {
        console.log('❌ Error checking order notifications:', orderNotifError.message);
      } else {
        console.log(`📊 Found ${orderNotifications?.length || 0} existing order notifications`);
        if (orderNotifications && orderNotifications.length > 0) {
          console.log('📋 Sample order notifications:');
          orderNotifications.slice(0, 3).forEach((notif, index) => {
            console.log(`   ${index + 1}. Title: ${notif.title}, User: ${notif.user_id}, Created: ${notif.created_at}`);
          });
        }
      }
    } catch (error) {
      console.log('❌ Order notifications check failed:', error.message);
    }

    // Check for any notifications at all
    console.log('\n📋 Checking for any notifications...');
    try {
      const { data: allNotifications, error: allNotifError } = await supabase
        .from('notifications')
        .select('type, count(*)')
        .limit(100);

      if (allNotifError) {
        console.log('❌ Error checking all notifications:', allNotifError.message);
      } else {
        console.log(`📊 Total notifications in system: ${allNotifications?.length || 0}`);
        
        // Get notification counts by type
        const { data: notifCounts, error: countError } = await supabase
          .from('notifications')
          .select('type')
          .limit(1000);

        if (!countError && notifCounts) {
          const typeCounts = {};
          notifCounts.forEach(notif => {
            typeCounts[notif.type] = (typeCounts[notif.type] || 0) + 1;
          });
          console.log('📊 Notifications by type:', typeCounts);
        }
      }
    } catch (error) {
      console.log('❌ All notifications check failed:', error.message);
    }

    // Step 3: Check profiles table for user data
    console.log('\n3️⃣ Checking profiles table...\n');
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .limit(5);

      if (profilesError) {
        console.log('❌ Profiles table error:', profilesError.message);
      } else {
        console.log(`✅ Profiles table exists with ${profilesData?.length || 0} sample records`);
        if (profilesData && profilesData.length > 0) {
          console.log('📋 Sample profiles:');
          profilesData.forEach((profile, index) => {
            console.log(`   ${index + 1}. ID: ${profile.id}, Name: ${profile.full_name || 'No name'}`);
          });
        }
      }
    } catch (error) {
      console.log('❌ Profiles check failed:', error.message);
    }

    // Step 4: Test notification creation
    console.log('\n4️⃣ Testing notification creation...\n');
    
    // Try to create a test notification
    console.log('📋 Testing notification creation...');
    try {
      const testNotification = {
        user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
        type: 'order',
        title: 'Test Order Notification',
        message: 'This is a test order notification',
        data: {
          orderId: 'test-order-123',
          serviceTitle: 'Test Service',
          amount: 100,
          currency: 'USD',
          isTest: true
        },
        created_at: new Date().toISOString(),
        is_read: false
      };

      const { data: testResult, error: testError } = await supabase
        .from('notifications')
        .insert(testNotification)
        .select()
        .single();

      if (testError) {
        console.log('❌ Test notification creation failed:', testError.message);
        console.log('❌ Error details:', testError);
      } else {
        console.log('✅ Test notification created successfully:', testResult.id);
        
        // Clean up test notification
        await supabase
          .from('notifications')
          .delete()
          .eq('id', testResult.id);
        console.log('✅ Test notification cleaned up');
      }
    } catch (error) {
      console.log('❌ Test notification creation exception:', error.message);
    }

    // Step 5: Check RPC functions
    console.log('\n5️⃣ Checking RPC functions...\n');
    
    console.log('📋 Testing create_notification RPC...');
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_notification', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_type: 'order',
        p_title: 'Test RPC Order Notification',
        p_message: 'This is a test RPC order notification',
        p_data: {
          orderId: 'test-rpc-order-123',
          serviceTitle: 'Test RPC Service',
          amount: 200,
          currency: 'USD',
          isTest: true
        },
        p_id: 'test-rpc-notification-' + Date.now()
      });

      if (rpcError) {
        console.log('❌ RPC create_notification failed:', rpcError.message);
      } else {
        console.log('✅ RPC create_notification works:', rpcResult);
        
        // Clean up RPC test notification
        await supabase
          .from('notifications')
          .delete()
          .eq('type', 'order')
          .like('title', '%Test RPC%');
        console.log('✅ RPC test notification cleaned up');
      }
    } catch (error) {
      console.log('❌ RPC test exception:', error.message);
    }

    // Step 6: Summary and recommendations
    console.log('\n6️⃣ DIAGNOSIS SUMMARY AND RECOMMENDATIONS:\n');
    
    console.log('🔍 Based on the diagnostic results above:');
    console.log('');
    
    // Check what we found and provide recommendations
    const { data: hasOrders } = await supabase.from('orders').select('id').limit(1);
    const { data: hasOffers } = await supabase.from('service_offers').select('id').limit(1);
    const { data: hasNotifications } = await supabase.from('notifications').select('id').limit(1);
    
    if (!hasOrders || hasOrders.length === 0) {
      console.log('❌ ISSUE: No orders found in the system');
      console.log('💡 RECOMMENDATION: Orders may not be created when offers are accepted');
    }
    
    if (!hasOffers || hasOffers.length === 0) {
      console.log('❌ ISSUE: No service offers found in the system');
      console.log('💡 RECOMMENDATION: Check if the service offer system is working');
    }
    
    if (!hasNotifications || hasNotifications.length === 0) {
      console.log('❌ ISSUE: No notifications found in the system');
      console.log('💡 RECOMMENDATION: Notification system may not be working at all');
    }

    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Fix any table structure issues identified above');
    console.log('2. Ensure the order creation flow is working');
    console.log('3. Test the notification system with manual data');
    console.log('4. Run the backfill script after fixes are applied');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  }
}

// Run the diagnostic
diagnoseOrderNotificationIssue();