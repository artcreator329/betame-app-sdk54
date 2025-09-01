require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugUserNotifications() {
  const userEmail = '8cwqmqm82w@wyoxafp.com';
  
  console.log('🔍 Debugging notification issue for user:', userEmail);
  
  try {
    // 1. Check if user exists in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single();
    
    if (profileError) {
      console.log('❌ Profile error:', profileError);
      return;
    }
    
    if (!profile) {
      console.log('❌ User not found in profiles table');
      return;
    }
    
    console.log('✅ User found:', {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      created_at: profile.created_at
    });
    
    // 2. Check recent orders for this user
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        buyer_id,
        service_provider_id,
        status,
        created_at,
        service_offers (
          id,
          service_id,
          services (
            title,
            description
          )
        )
      `)
      .or(`buyer_id.eq.${profile.id},service_provider_id.eq.${profile.id}`)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      console.log('❌ Orders error:', ordersError);
    } else {
      console.log('📦 Recent orders (last 24h):', orders?.length || 0);
      orders?.forEach(order => {
        console.log(`  - Order ${order.id}: ${order.status} (${order.created_at})`);
      });
    }
    
    // 3. Check notifications for this user
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (notificationsError) {
      console.log('❌ Notifications error:', notificationsError);
    } else {
      console.log('🔔 Recent notifications (last 24h):', notifications?.length || 0);
      notifications?.forEach(notif => {
        console.log(`  - ${notif.type}: ${notif.title} (${notif.created_at}) - Read: ${notif.is_read}`);
      });
    }
    
    // 4. Check notification settings
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', profile.id)
      .single();
    
    if (settingsError && settingsError.code !== 'PGRST116') {
      console.log('❌ Notification settings error:', settingsError);
    } else if (settings) {
      console.log('⚙️ Notification settings:', {
        push_enabled: settings.push_enabled,
        email_enabled: settings.email_enabled,
        order_updates: settings.order_updates,
        chat_messages: settings.chat_messages
      });
    } else {
      console.log('⚠️ No notification settings found (using defaults)');
    }
    
    // 5. Check if there are any recent order notifications that should have been sent
    const { data: recentOrders, error: recentOrdersError } = await supabase
      .from('orders')
      .select(`
        id,
        buyer_id,
        service_provider_id,
        status,
        created_at
      `)
      .or(`buyer_id.eq.${profile.id},service_provider_id.eq.${profile.id}`)
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
      .order('created_at', { ascending: false });
    
    if (recentOrdersError) {
      console.log('❌ Recent orders error:', recentOrdersError);
    } else if (recentOrders && recentOrders.length > 0) {
      console.log('🆕 Very recent orders (last 2h):');
      for (const order of recentOrders) {
        console.log(`  - Order ${order.id}: ${order.status} (${order.created_at})`);
        
        // Check if notifications exist for this order
        const { data: orderNotifications } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', profile.id)
          .ilike('data', `%${order.id}%`);
        
        console.log(`    Notifications for this order: ${orderNotifications?.length || 0}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugUserNotifications();