#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFinalDashboardStats() {
  console.log('🔍 Testing Final Dashboard Stats...\n');

  try {
    // Test the services query with correct column
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, status, created_at', { count: 'exact' });

    if (servicesError) {
      console.error('❌ Error fetching services:', servicesError);
      return;
    }

    console.log(`📊 Total services: ${services?.length || 0}`);
    
    if (services && services.length > 0) {
      const activeServices = services.filter(s => s.status === 'active');
      const inactiveServices = services.filter(s => s.status !== 'active');
      
      console.log(`✅ Active services: ${activeServices.length}`);
      console.log(`❌ Inactive/Other services: ${inactiveServices.length}`);
      
      console.log('\n🔍 Service status breakdown:');
      const statusCounts = {};
      services.forEach(service => {
        const status = service.status || 'null';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
      
      console.log('\n📋 Sample services:');
      services.slice(0, 5).forEach((service, index) => {
        console.log(`${index + 1}. ID: ${service.id.substring(0, 8)}... - Status: ${service.status}`);
      });
    } else {
      console.log('⚠️  No services found');
    }

    // Test the complete dashboard stats simulation
    console.log('\n🔄 Testing complete dashboard stats...');
    
    const [
      usersResult, 
      servicesResult, 
      jobsResult, 
      transactionsResult, 
      chatsResult,
      ordersResult,
      escrowResult,
      reportsResult,
      violationsResult,
      notificationsResult
    ] = await Promise.all([
      supabase.from('profiles').select('id, created_at', { count: 'exact' }),
      supabase.from('services').select('id, status, created_at', { count: 'exact' }),
      supabase.from('job_listings').select('id, status, created_at', { count: 'exact' }),
      supabase.from('transactions').select('amount, type, created_at', { count: 'exact' }),
      supabase.from('chats').select('id, is_active, created_at', { count: 'exact' }),
      supabase.from('orders').select('id, status, total_amount, created_at', { count: 'exact' }),
      supabase.from('escrow_transactions').select('id, status, total_amount', { count: 'exact' }),
      supabase.from('user_reports').select('id, status', { count: 'exact' }),
      supabase.from('user_violations').select('id, severity', { count: 'exact' }),
      supabase.from('notifications').select('id, type, created_at', { count: 'exact' })
    ]);

    const activeServices = servicesResult.data?.filter(s => s.status === 'active').length || 0;
    
    console.log('\n📊 Dashboard Stats Results:');
    console.log(`👥 Total Users: ${usersResult.count || 0}`);
    console.log(`🏢 Total Services: ${servicesResult.count || 0}`);
    console.log(`✅ Active Services: ${activeServices}`);
    console.log(`💼 Total Jobs: ${jobsResult.count || 0}`);
    console.log(`💳 Total Transactions: ${transactionsResult.count || 0}`);
    console.log(`💬 Total Chats: ${chatsResult.count || 0}`);
    console.log(`📦 Total Orders: ${ordersResult.count || 0}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testFinalDashboardStats();