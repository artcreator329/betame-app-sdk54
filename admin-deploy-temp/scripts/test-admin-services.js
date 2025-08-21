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

async function testAdminServices() {
  console.log('🔍 Testing Admin Services Data...\n');

  try {
    // Check total services count
    const { data: servicesCount, error: countError } = await supabase
      .from('services')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error getting services count:', countError);
      return;
    }

    console.log(`📊 Total services in database: ${servicesCount?.length || 0}`);

    // Get actual services with profile data
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select(`
        id,
        title,
        description,
        price,
        category,
        location,
        is_active,
        created_at,
        profiles!services_user_id_fkey(
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (servicesError) {
      console.error('❌ Error getting services:', servicesError);
      return;
    }

    console.log(`\n📋 Services found: ${services?.length || 0}`);
    
    if (services && services.length > 0) {
      console.log('\n🔍 Sample services:');
      services.slice(0, 3).forEach((service, index) => {
        console.log(`\n${index + 1}. ${service.title}`);
        console.log(`   - Price: RM ${service.price}`);
        console.log(`   - Category: ${service.category}`);
        console.log(`   - Location: ${service.location}`);
        console.log(`   - Active: ${service.is_active}`);
        console.log(`   - Provider: ${service.profiles?.full_name || 'Unknown'}`);
        console.log(`   - Created: ${new Date(service.created_at).toLocaleDateString()}`);
      });
    } else {
      console.log('\n⚠️  No services found in database');
      
      // Let's check if there are any users who could create services
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .limit(5);

      if (usersError) {
        console.error('❌ Error getting users:', usersError);
      } else {
        console.log(`\n👥 Users in database: ${users?.length || 0}`);
        if (users && users.length > 0) {
          console.log('Sample users:');
          users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.full_name} (${user.email})`);
          });
        }
      }
    }

    // Check active vs inactive services
    const { data: activeServices } = await supabase
      .from('services')
      .select('id')
      .eq('is_active', true);

    const { data: inactiveServices } = await supabase
      .from('services')
      .select('id')
      .eq('is_active', false);

    console.log(`\n📈 Active services: ${activeServices?.length || 0}`);
    console.log(`📉 Inactive services: ${inactiveServices?.length || 0}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testAdminServices();