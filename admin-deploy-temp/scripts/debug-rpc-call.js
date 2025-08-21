#!/usr/bin/env node

/**
 * Debug the RPC call specifically
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function debugRPCCall() {
  console.log('🔍 Debugging RPC call...');
  
  try {
    const testUserId = 'af123559-a1d8-4434-b662-0925d1d8b3a4';
    
    console.log('\n📋 Test parameters:');
    console.log('User ID:', testUserId);
    console.log('Type: chat');
    console.log('Title: Debug RPC Call');
    console.log('Message: Testing RPC call from JavaScript');
    
    console.log('\n🔧 Making RPC call...');
    
    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: testUserId,
      p_type: 'chat',
      p_title: 'Debug RPC Call',
      p_message: 'Testing RPC call from JavaScript',
      p_data: { debug: true, timestamp: new Date().toISOString() },
      p_id: null
    });
    
    console.log('\n📊 RPC Result:');
    console.log('Data:', data);
    console.log('Error:', error);
    
    if (error) {
      console.error('❌ RPC Error Details:');
      console.error('  Code:', error.code);
      console.error('  Message:', error.message);
      console.error('  Details:', error.details);
      console.error('  Hint:', error.hint);
      return;
    }
    
    if (data) {
      console.log('✅ RPC call successful, returned ID:', data);
      
      // Wait a moment for the insert to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to find the notification
      console.log('\n🔍 Searching for notification...');
      
      const { data: notification, error: selectError } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', data)
        .maybeSingle();
      
      console.log('Select result:');
      console.log('Data:', notification);
      console.log('Error:', selectError);
      
      if (selectError) {
        console.error('❌ Select Error Details:');
        console.error('  Code:', selectError.code);
        console.error('  Message:', selectError.message);
        console.error('  Details:', selectError.details);
      }
      
      if (notification) {
        console.log('✅ Notification found!');
        console.log('  ID:', notification.id);
        console.log('  Title:', notification.title);
        console.log('  User ID:', notification.user_id);
        console.log('  Created:', notification.created_at);
      } else {
        console.log('❌ Notification not found');
        
        // Try to find any recent notifications for this user
        console.log('\n🔍 Looking for recent notifications for this user...');
        
        const { data: recentNotifications, error: recentError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', testUserId)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (recentError) {
          console.error('❌ Error fetching recent notifications:', recentError);
        } else {
          console.log('📋 Recent notifications:', recentNotifications?.length || 0);
          recentNotifications?.forEach((notif, index) => {
            console.log(`  ${index + 1}. ${notif.title} (${notif.id}) - ${notif.created_at}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Exception during RPC debug:', error);
  }
}

// Run the debug
debugRPCCall().then(() => {
  console.log('\n🏁 RPC debug completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ RPC debug failed:', error);
  process.exit(1);
});