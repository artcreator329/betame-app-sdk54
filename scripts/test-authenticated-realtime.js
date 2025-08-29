#!/usr/bin/env node

/**
 * Test real-time notifications with authenticated user
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testAuthenticatedRealtime() {
  console.log('🧪 Testing real-time with authenticated user...');
  
  try {
    // First, sign in as a user (you'll need valid credentials)
    console.log('\n🔐 Signing in...');
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'andriana@betame.com', // Replace with actual test user
      password: 'password123' // Replace with actual password
    });
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      console.log('ℹ️ Skipping authenticated test - no valid credentials');
      return;
    }
    
    console.log('✅ Signed in as:', authData.user?.email);
    const userId = authData.user?.id;
    
    if (!userId) {
      console.error('❌ No user ID found');
      return;
    }
    
    let realtimeEventReceived = false;
    let realtimeNotification = null;
    
    console.log('\n📡 Setting up authenticated real-time subscription...');
    
    const channelName = `notifications_${userId}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications', 
          filter: `user_id=eq.${userId}` 
        },
        (payload) => {
          console.log('🔔 AUTHENTICATED REAL-TIME EVENT RECEIVED!');
          console.log('  📋 Title:', payload.new.title);
          console.log('  💬 Message:', payload.new.message);
          console.log('  🆔 ID:', payload.new.id);
          
          realtimeEventReceived = true;
          realtimeNotification = payload.new;
        }
      )
      .subscribe((status) => {
        console.log('📡 Authenticated subscription status:', status);
      });
    
    // Wait for subscription
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n🔔 Creating notification for authenticated user...');
    
    // Create notification using RPC
    const { data: notificationId, error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: 'system',
      p_title: 'Authenticated Test',
      p_message: 'Testing real-time with authenticated user',
      p_data: {
        test: true,
        authenticated: true,
        timestamp: new Date().toISOString()
      },
      p_id: null
    });
    
    if (error) {
      console.error('❌ Error creating notification:', error);
    } else {
      console.log('✅ Notification created with ID:', notificationId);
    }
    
    // Wait for real-time event
    console.log('\n⏳ Waiting for authenticated real-time event...');
    let waitTime = 0;
    const maxWait = 10000;
    const checkInterval = 500;
    
    while (!realtimeEventReceived && waitTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitTime += checkInterval;
      if (waitTime % 2000 === 0) {
        console.log(`⏳ Still waiting... (${waitTime/1000}s elapsed)`);
      }
    }
    
    console.log('\n');
    
    if (realtimeEventReceived) {
      console.log('✅ Authenticated real-time event received successfully!');
      
      // Test reading notifications
      console.log('\n📖 Testing notification reading...');
      
      const { data: notifications, error: readError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (readError) {
        console.error('❌ Error reading notifications:', readError);
      } else {
        console.log('✅ Successfully read notifications:', notifications?.length || 0);
      }
      
    } else {
      console.log('❌ Authenticated real-time event not received');
    }
    
    // Clean up
    console.log('\n🧹 Cleaning up...');
    supabase.removeChannel(channel);
    
    if (notificationId) {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      console.log('✅ Test notification deleted');
    }
    
    // Sign out
    await supabase.auth.signOut();
    console.log('✅ Signed out');
    
    // Summary
    console.log('\n🎯 Authenticated Test Summary:');
    console.log(`✅ Authentication: ✅ Working`);
    console.log(`✅ Notification Creation: ${error ? '❌ Failed' : '✅ Working'}`);
    console.log(`✅ Real-time Delivery: ${realtimeEventReceived ? '✅ Working' : '❌ Failed'}`);
    
    if (!error && realtimeEventReceived) {
      console.log('\n🎉 AUTHENTICATED REAL-TIME TEST PASSED!');
      console.log('This means the app will work correctly when users are signed in.');
    }
    
  } catch (error) {
    console.error('❌ Error during authenticated test:', error);
  }
}

// Run the test
testAuthenticatedRealtime().then(() => {
  console.log('\n🏁 Authenticated real-time test finished');
  process.exit(0);
}).catch(error => {
  console.error('❌ Authenticated real-time test failed:', error);
  process.exit(1);
});