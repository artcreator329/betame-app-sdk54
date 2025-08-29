#!/usr/bin/env node

/**
 * Test with service role key to bypass RLS completely
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key
);

async function testWithServiceRole() {
  console.log('🧪 Testing with service role key...');
  
  try {
    const testUserId = 'af123559-a1d8-4434-b662-0925d1d8b3a4'; // Andriana's ID
    
    console.log('\n🔔 Calling RPC function with service role...');
    
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_notification', {
      p_user_id: testUserId,
      p_type: 'chat',
      p_title: 'Service Role Test',
      p_message: 'Testing with service role key',
      p_data: { test: true, service_role: true },
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
    
    // Try direct insert to test RLS
    console.log('\n🔍 Testing direct insert with service role...');
    
    const directInsertId = 'direct_test_' + Date.now();
    const { data: directResult, error: directError } = await supabase
      .from('notifications')
      .insert({
        id: directInsertId,
        user_id: testUserId,
        type: 'system',
        title: 'Direct Insert Test',
        message: 'Testing direct insert with service role',
        data: { direct: true },
        is_read: false
      })
      .select()
      .single();
    
    console.log('Direct insert result:', directResult);
    console.log('Direct insert error:', directError);
    
    // Clean up
    if (rpcResult) {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', rpcResult);
    }
    
    if (directInsertId && directResult) {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', directInsertId);
    }
    
  } catch (error) {
    console.error('❌ Error during service role test:', error);
  }
}

// Run the test
testWithServiceRole().then(() => {
  console.log('\n🏁 Service role test finished');
  process.exit(0);
}).catch(error => {
  console.error('❌ Service role test failed:', error);
  process.exit(1);
});