#!/usr/bin/env node

/**
 * Test script to verify notifications work with anonymous key
 * This simulates the real user experience
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

// Use anon key to simulate real user experience
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('🧪 Testing notifications with anonymous key...');
  console.log('=======================================================');

  try {
    // Test the RPC function directly
    console.log('\n📋 1. Testing create_notification RPC with anon key...');
    
    const testUserId = 'ce34825e-ffc9-46b5-9338-3015c42f3a33'; // Jack's ID
    const testNotificationId = `test_anon_${Date.now()}`;

    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: testUserId,
      p_type: 'offer',
      p_title: 'Test Anon Notification',
      p_message: 'This is a test notification using anonymous key',
      p_data: {
        test: true,
        source: 'anon_key'
      },
      p_id: testNotificationId
    });

    if (error) {
      console.error('❌ RPC call failed with anon key:', error);
    } else {
      console.log('✅ RPC call successful with anon key:', data);
    }

    // Test direct insert
    console.log('\n📋 2. Testing direct insert with anon key...');
    
    const directTestId = `test_direct_${Date.now()}`;
    const { data: insertData, error: insertError } = await supabase
      .from('notifications')
      .insert({
        id: directTestId,
        user_id: testUserId,
        type: 'offer',
        title: 'Test Direct Insert',
        message: 'This is a test direct insert using anonymous key',
        data: {
          test: true,
          source: 'direct_insert'
        },
        is_read: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Direct insert failed with anon key:', insertError);
    } else {
      console.log('✅ Direct insert successful with anon key:', insertData.id);
    }

    // Check if notifications were created
    console.log('\n📋 3. Checking created notifications...');
    
    const { data: notifications, error: selectError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', testUserId)
      .like('id', 'test_%')
      .order('created_at', { ascending: false });

    if (selectError) {
      console.error('❌ Failed to fetch notifications:', selectError);
    } else {
      console.log(`✅ Found ${notifications.length} test notifications:`);
      notifications.forEach(notif => {
        console.log(`  - ${notif.id}: ${notif.title}`);
      });
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test notifications...');
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .like('id', 'test_%');

    if (deleteError) {
      console.error('❌ Cleanup failed:', deleteError);
    } else {
      console.log('✅ Cleanup successful');
    }

    console.log('\n📊 Summary:');
    console.log('- RPC with anon key:', error ? '❌ Failed' : '✅ Success');
    console.log('- Direct insert with anon key:', insertError ? '❌ Failed' : '✅ Success');
    console.log('- Notification retrieval:', selectError ? '❌ Failed' : '✅ Success');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main().catch(console.error);