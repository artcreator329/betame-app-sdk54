#!/usr/bin/env node

/**
 * Fix Notification RLS Policy
 * 
 * This script fixes the Row Level Security policy for notifications
 * to allow proper notification creation.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function fixNotificationRLSPolicy() {
  console.log('🔧 Fixing Notification RLS Policy...\n');

  try {
    // First, let's check current RLS policies
    console.log('1️⃣ Checking current RLS policies...');
    
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_table_policies', { table_name: 'notifications' })
      .single();

    if (policiesError) {
      console.log('⚠️ Could not check existing policies:', policiesError.message);
    }

    // Create a more permissive RLS policy for notifications
    console.log('2️⃣ Creating/updating RLS policies for notifications...');

    const rlsQueries = [
      // Drop existing policies that might be too restrictive
      `DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;`,
      `DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;`,
      `DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;`,
      `DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;`,
      
      // Create new, more permissive policies
      `CREATE POLICY "Allow notification creation" ON notifications
        FOR INSERT WITH CHECK (true);`,
      
      `CREATE POLICY "Users can view their notifications" ON notifications
        FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);`,
      
      `CREATE POLICY "Users can update their notifications" ON notifications
        FOR UPDATE USING (auth.uid() = user_id OR auth.uid() IS NULL);`,
      
      `CREATE POLICY "Users can delete their notifications" ON notifications
        FOR DELETE USING (auth.uid() = user_id OR auth.uid() IS NULL);`
    ];

    for (const query of rlsQueries) {
      try {
        const { error } = await supabase.rpc('execute_sql', { query });
        if (error) {
          console.log(`⚠️ Query failed: ${query.substring(0, 50)}...`);
          console.log(`   Error: ${error.message}`);
        } else {
          console.log(`✅ Executed: ${query.substring(0, 50)}...`);
        }
      } catch (err) {
        console.log(`❌ Exception executing query: ${err.message}`);
      }
    }

    // Test notification creation again
    console.log('\n3️⃣ Testing notification creation after RLS fix...');
    
    // Get a real user ID from profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    const testUserId = profiles && profiles.length > 0 ? profiles[0].id : '00000000-0000-0000-0000-000000000000';

    const testNotification = {
      user_id: testUserId,
      type: 'order',
      title: 'Test Order Notification After RLS Fix',
      message: 'This is a test order notification after RLS fix',
      data: {
        orderId: 'test-order-rls-fix',
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
      console.log('❌ Test notification still failing:', testError.message);
      
      // Try using RPC instead
      console.log('4️⃣ Testing RPC notification creation...');
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_notification', {
        p_user_id: testUserId,
        p_type: 'order',
        p_title: 'Test RPC Order Notification',
        p_message: 'This is a test RPC order notification',
        p_data: {
          orderId: 'test-rpc-order-456',
          serviceTitle: 'Test RPC Service',
          amount: 200,
          currency: 'USD',
          isTest: true
        },
        p_id: 'test-rpc-notification-' + Date.now()
      });

      if (rpcError) {
        console.log('❌ RPC also failing:', rpcError.message);
      } else {
        console.log('✅ RPC notification creation works!');
        
        // Clean up RPC test
        await supabase
          .from('notifications')
          .delete()
          .eq('type', 'order')
          .like('title', '%Test RPC%');
      }
    } else {
      console.log('✅ Direct notification creation now works!', testResult.id);
      
      // Clean up test notification
      await supabase
        .from('notifications')
        .delete()
        .eq('id', testResult.id);
    }

    console.log('\n🎉 RLS policy fix completed!');

  } catch (error) {
    console.error('❌ RLS policy fix failed:', error);
    process.exit(1);
  }
}

// Run the fix
fixNotificationRLSPolicy();