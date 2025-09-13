#!/usr/bin/env node

/**
 * DISABLED: Test the RPC function directly to see what's happening
 * This script has been disabled to prevent test notifications from appearing
 */

console.log('❌ This test script has been disabled to prevent test notifications from appearing.');
console.log('If you need to test notifications, use the NotificationTestPanel component instead.');
process.exit(0);

// DISABLED CODE BELOW - DO NOT UNCOMMENT
/*
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testRpcDirect() {
  console.log('🧪 Testing RPC function directly...');
  
  try {
    const testUserId = 'af123559-a1d8-4434-b662-0925d1d8b3a4'; // Andriana's ID
    
    console.log('\n🔔 Calling RPC function...');
    
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_notification', {
      p_user_id: testUserId,
      p_type: 'chat',
      p_title: 'Direct RPC Test',
      p_message: 'Testing RPC function directly',
      p_data: { test: true },
      p_id: null
    });
    
    console.log('RPC Result:', rpcResult);
    console.log('RPC Error:', rpcError);
    
    if (rpcError) {
      console.error('❌ RPC Error:', rpcError);
      return;
    }
    
    console.log('✅ RPC returned ID:', rpcResult);
    
    // Now check if it was actually inserted
    console.log('\n🔍 Checking if notification was inserted...');
    
    const { data: checkResult, error: checkError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', rpcResult)
      .maybeSingle();
    
    console.log('Check Result:', checkResult);
    console.log('Check Error:', checkError);
    
    if (checkError) {
      console.error('❌ Check Error:', checkError);
    } else if (checkResult) {
      console.log('✅ Notification found in database:', checkResult);
    } else {
      console.log('❌ Notification not found in database');
    }
    
    // Try to select all notifications for this user
    console.log('\n🔍 Checking all notifications for user...');
    
    const { data: allNotifications, error: allError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('All notifications:', allNotifications);
    console.log('All notifications error:', allError);
    
    // Clean up if notification was created
    if (rpcResult && checkResult) {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', rpcResult);
      console.log('✅ Test notification cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Error during direct RPC test:', error);
  }
}

// Run the test
testRpcDirect().then(() => {
  console.log('\n🏁 Direct RPC test finished');
  process.exit(0);
}).catch(error => {
  console.error('❌ Direct RPC test failed:', error);
  process.exit(1);
});