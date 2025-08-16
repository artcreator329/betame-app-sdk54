#!/usr/bin/env node

/**
 * Debug script to test realtime notification functionality
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function debugRealtimeNotifications() {
  console.log('🔍 Debugging realtime notifications...');
  
  try {
    const testUserId = 'af123559-a1d8-4434-b662-0925d1d8b3a4'; // Andriana's ID
    
    console.log('\n📡 Setting up realtime subscription for user:', testUserId);
    
    // Set up a realtime subscription similar to the notification service
    const channel = supabase
      .channel(`debug_notifications_${testUserId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications', 
          filter: `user_id=eq.${testUserId}` 
        },
        (payload) => {
          console.log('🔔 REALTIME: New notification received!', {
            id: payload.new.id,
            title: payload.new.title,
            message: payload.new.message,
            user_id: payload.new.user_id,
            created_at: payload.new.created_at
          });
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'notifications', 
          filter: `user_id=eq.${testUserId}` 
        },
        (payload) => {
          console.log('🔄 REALTIME: Notification updated!', {
            id: payload.new.id,
            is_read: payload.new.is_read
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to realtime notifications');
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Realtime subscription error');
        } else if (status === 'TIMED_OUT') {
          console.log('⏰ Realtime subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('🔒 Realtime subscription closed');
        }
      });
    
    // Wait for subscription to be established
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n🧪 Creating test notification...');
    
    const testNotificationId = `realtime_test_${Date.now()}`;
    
    const { error } = await supabase.rpc('create_notification', {
      p_user_id: testUserId,
      p_type: 'chat',
      p_title: 'Realtime Test Notification',
      p_message: 'This is a test to verify realtime notifications work',
      p_data: {
        test: true,
        timestamp: new Date().toISOString()
      },
      p_id: testNotificationId
    });
    
    if (error) {
      console.error('❌ Error creating test notification:', error);
    } else {
      console.log('✅ Test notification created, waiting for realtime event...');
    }
    
    // Wait for realtime event
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n🔍 Checking if notification exists in database...');
    
    const { data: notification } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', testNotificationId)
      .maybeSingle();
    
    if (notification) {
      console.log('✅ Notification found in database:', {
        id: notification.id,
        title: notification.title,
        user_id: notification.user_id,
        created_at: notification.created_at
      });
    } else {
      console.log('❌ Notification not found in database');
    }
    
    // Test updating the notification
    console.log('\n🔄 Testing notification update...');
    
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', testNotificationId);
    
    if (updateError) {
      console.error('❌ Error updating notification:', updateError);
    } else {
      console.log('✅ Notification updated, waiting for realtime event...');
    }
    
    // Wait for update event
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Clean up
    console.log('\n🧹 Cleaning up...');
    supabase.removeChannel(channel);
    
    // Delete test notification
    await supabase
      .from('notifications')
      .delete()
      .eq('id', testNotificationId);
    
    console.log('✅ Cleanup completed');
    
  } catch (error) {
    console.error('❌ Error during realtime debugging:', error);
  }
}

// Run the debug
debugRealtimeNotifications().then(() => {
  console.log('\n🏁 Realtime debug completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Realtime debug failed:', error);
  process.exit(1);
});