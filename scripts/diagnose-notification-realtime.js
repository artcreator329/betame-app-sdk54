/**
 * Script to diagnose notification realtime subscription issues
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Create both anon and admin clients
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function diagnoseNotificationRealtime() {
  try {
    console.log('🔍 Diagnosing notification realtime subscription issues...');
    console.log('=======================================================');

    // 1. Check if notifications table exists and has data
    console.log('\n📊 1. Checking notifications table...');
    const { data: notifications, error: notifError } = await supabaseAdmin
      .from('notifications')
      .select('id, user_id, type, title, created_at')
      .limit(5);

    if (notifError) {
      console.error('❌ Error accessing notifications table:', notifError);
      return;
    }

    console.log(`✅ Notifications table accessible, found ${notifications?.length || 0} recent notifications`);
    if (notifications && notifications.length > 0) {
      console.log('📄 Sample notifications:');
      notifications.forEach(n => {
        console.log(`  - ${n.id}: ${n.title} (${n.type}) for user ${n.user_id}`);
      });
    }

    // 2. Check RLS policies on notifications table
    console.log('\n🔒 2. Checking RLS policies...');
    const { data: policies, error: policyError } = await supabaseAdmin
      .from('pg_policies')
      .select('policyname, cmd, qual, with_check')
      .eq('tablename', 'notifications');

    if (policyError) {
      console.error('❌ Error checking RLS policies:', policyError);
    } else {
      console.log(`✅ Found ${policies?.length || 0} RLS policies for notifications table`);
      if (policies && policies.length > 0) {
        policies.forEach(p => {
          console.log(`  - ${p.policyname} (${p.cmd}): ${p.qual || 'No condition'}`);
        });
      }
    }

    // 3. Test realtime subscription with a test user
    console.log('\n📡 3. Testing realtime subscription...');
    
    // Get a test user ID from the database
    const { data: users, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, full_name')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error('❌ No test users found:', userError);
      return;
    }

    const testUserId = users[0].user_id;
    console.log(`🧪 Using test user: ${users[0].full_name} (${testUserId})`);

    // Create a test realtime subscription
    const channelName = `test_notifications_${testUserId}_${Date.now()}`;
    console.log(`📡 Creating test channel: ${channelName}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications', 
          filter: `user_id=eq.${testUserId}` 
        },
        (payload) => {
          console.log('✅ Test realtime INSERT received:', payload.new);
        }
      )
      .subscribe((status) => {
        console.log('📡 Test subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Test realtime subscription successful!');
          
          // Test by inserting a notification
          setTimeout(async () => {
            console.log('🧪 Inserting test notification...');
            
            const { error: insertError } = await supabaseAdmin
              .from('notifications')
              .insert({
                id: `test_${Date.now()}`,
                user_id: testUserId,
                type: 'system',
                title: 'Test Notification',
                message: 'This is a test notification for realtime debugging',
                is_read: false
              });

            if (insertError) {
              console.error('❌ Error inserting test notification:', insertError);
            } else {
              console.log('✅ Test notification inserted successfully');
            }

            // Clean up after 5 seconds
            setTimeout(async () => {
              console.log('🧹 Cleaning up test notification and channel...');
              
              // Delete test notification
              await supabaseAdmin
                .from('notifications')
                .delete()
                .eq('user_id', testUserId)
                .like('id', 'test_%');

              // Unsubscribe from channel
              supabase.removeChannel(channel);
              
              console.log('✅ Cleanup completed');
              process.exit(0);
            }, 5000);
            
          }, 2000);
          
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Test realtime subscription failed with CHANNEL_ERROR');
          process.exit(1);
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Test realtime subscription timed out');
          process.exit(1);
        }
      });

  } catch (error) {
    console.error('❌ Unexpected error during diagnosis:', error);
    process.exit(1);
  }
}

// Run the diagnosis
diagnoseNotificationRealtime();