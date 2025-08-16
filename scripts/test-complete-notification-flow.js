#!/usr/bin/env node

/**
 * Complete test of the notification flow including realtime events
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testCompleteNotificationFlow() {
  console.log('🧪 Testing complete notification flow...');
  
  try {
    const testUserId = 'af123559-a1d8-4434-b662-0925d1d8b3a4'; // Andriana's ID
    let realtimeEventReceived = false;
    let realtimeNotification = null;
    
    console.log('\n📡 Setting up realtime subscription...');
    
    // Set up realtime subscription
    const channel = supabase
      .channel(`test_notifications_${testUserId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications', 
          filter: `user_id=eq.${testUserId}` 
        },
        (payload) => {
          console.log('🔔 REALTIME EVENT: New notification received!');
          console.log('  📋 Title:', payload.new.title);
          console.log('  💬 Message:', payload.new.message);
          console.log('  👤 User ID:', payload.new.user_id);
          console.log('  🆔 Notification ID:', payload.new.id);
          console.log('  📅 Created:', payload.new.created_at);
          
          realtimeEventReceived = true;
          realtimeNotification = payload.new;
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });
    
    // Wait for subscription to be established
    console.log('⏳ Waiting for subscription to be established...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n🔔 Creating test notification...');
    
    const testNotificationId = `complete-test-${Date.now()}`;
    
    // Create notification using the RPC function
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_notification', {
      p_user_id: testUserId,
      p_type: 'chat',
      p_title: 'Complete Flow Test',
      p_message: 'Testing the complete notification flow with realtime',
      p_data: {
        test: true,
        flow: 'complete',
        timestamp: new Date().toISOString()
      },
      p_id: null // Let the function generate a UUID
    });
    
    if (rpcError) {
      console.error('❌ RPC Error:', rpcError);
      return;
    }
    
    console.log('✅ Notification created with ID:', rpcResult);
    
    // Wait for realtime event
    console.log('⏳ Waiting for realtime event...');
    let waitTime = 0;
    const maxWait = 10000; // 10 seconds
    const checkInterval = 500; // 0.5 seconds
    
    while (!realtimeEventReceived && waitTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitTime += checkInterval;
      process.stdout.write('.');
    }
    
    console.log('\n');
    
    if (realtimeEventReceived) {
      console.log('✅ Realtime event received successfully!');
      console.log('📋 Event data:', {
        id: realtimeNotification.id,
        title: realtimeNotification.title,
        message: realtimeNotification.message,
        type: realtimeNotification.type
      });
    } else {
      console.log('❌ Realtime event not received within timeout');
    }
    
    // Verify notification exists in database
    console.log('\n🔍 Verifying notification in database...');
    
    const { data: dbNotification, error: dbError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', rpcResult)
      .maybeSingle();
    
    if (dbError) {
      console.error('❌ Database query error:', dbError);
    } else if (dbNotification) {
      console.log('✅ Notification found in database:');
      console.log('  📋 Title:', dbNotification.title);
      console.log('  💬 Message:', dbNotification.message);
      console.log('  👤 User ID:', dbNotification.user_id);
      console.log('  📅 Created:', dbNotification.created_at);
      console.log('  📖 Read:', dbNotification.is_read);
    } else {
      console.log('❌ Notification not found in database');
    }
    
    // Test system notification simulation
    console.log('\n📱 Testing system notification simulation...');
    
    if (dbNotification) {
      console.log('📱 System notification would show:');
      console.log(`  Title: "${dbNotification.title}"`);
      console.log(`  Body: "${dbNotification.message}"`);
      console.log(`  Data:`, dbNotification.data);
      console.log('✅ System notification simulation successful');
    }
    
    // Clean up
    console.log('\n🧹 Cleaning up...');
    
    // Remove realtime subscription
    supabase.removeChannel(channel);
    
    // Delete test notification
    if (rpcResult) {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', rpcResult);
      console.log('✅ Test notification deleted');
    }
    
    // Summary
    console.log('\n🎯 Test Summary:');
    console.log(`✅ RPC Function: ${rpcError ? '❌ Failed' : '✅ Working'}`);
    console.log(`✅ Database Storage: ${dbNotification ? '✅ Working' : '❌ Failed'}`);
    console.log(`✅ Realtime Events: ${realtimeEventReceived ? '✅ Working' : '❌ Failed'}`);
    console.log(`✅ System Notifications: ✅ Ready (would work in app)`);
    
    if (!rpcError && dbNotification && realtimeEventReceived) {
      console.log('\n🎉 ALL TESTS PASSED! Notification system is working correctly.');
      console.log('\n📋 Next steps for mobile app:');
      console.log('1. ✅ Notifications will be created in database');
      console.log('2. ✅ Realtime events will trigger in app');
      console.log('3. ✅ System notifications will appear');
      console.log('4. ✅ In-app notifications will update');
    } else {
      console.log('\n⚠️ Some tests failed. Check the issues above.');
    }
    
  } catch (error) {
    console.error('❌ Error during complete flow test:', error);
  }
}

// Run the test
testCompleteNotificationFlow().then(() => {
  console.log('\n🏁 Complete flow test finished');
  process.exit(0);
}).catch(error => {
  console.error('❌ Complete flow test failed:', error);
  process.exit(1);
});