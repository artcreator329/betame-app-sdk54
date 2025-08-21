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

// Simulate the fixed getAllServices method
async function getAllServices(page = 1, limit = 20) {
  try {
    const offset = (page - 1) * limit;

    // Get services first
    const { data: services, error: servicesError, count } = await supabase
      .from('services')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (servicesError) {
      console.error('Error fetching services:', servicesError);
      return { services: [], total: 0 };
    }

    if (!services || services.length === 0) {
      return { services: [], total: count || 0 };
    }

    // Get user profiles for the services
    const userIds = services.map(service => service.user_id).filter(Boolean);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      // Return services without profile data
      return {
        services: services.map(service => ({ ...service, profiles: null })),
        total: count || 0
      };
    }

    // Combine services with profile data
    const servicesWithProfiles = services.map(service => {
      const profile = profiles?.find(p => p.id === service.user_id);
      return {
        ...service,
        profiles: profile || null
      };
    });

    return {
      services: servicesWithProfiles,
      total: count || 0
    };
  } catch (error) {
    console.error('Error fetching services:', error);
    return { services: [], total: 0 };
  }
}

async function testFixedAdminServices() {
  console.log('🔍 Testing Fixed Admin Services Method...\n');

  try {
    const result = await getAllServices();
    
    console.log(`📊 Total services: ${result.total}`);
    console.log(`📋 Services returned: ${result.services.length}`);
    
    if (result.services.length > 0) {
      console.log('\n🔍 Sample services with profile data:');
      result.services.slice(0, 3).forEach((service, index) => {
        console.log(`\n${index + 1}. ${service.title}`);
        console.log(`   - ID: ${service.id}`);
        console.log(`   - Price: RM ${service.price || 'N/A'}`);
        console.log(`   - Category: ${service.category || 'N/A'}`);
        console.log(`   - Location: ${service.location || 'N/A'}`);
        console.log(`   - Active: ${service.is_active !== undefined ? service.is_active : 'N/A'}`);
        console.log(`   - User ID: ${service.user_id}`);
        console.log(`   - Provider: ${service.profiles?.full_name || 'Unknown'}`);
        console.log(`   - Provider Email: ${service.profiles?.email || 'N/A'}`);
        console.log(`   - Created: ${service.created_at ? new Date(service.created_at).toLocaleDateString() : 'N/A'}`);
      });
    } else {
      console.log('\n⚠️  No services found');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testFixedAdminServices();