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

async function checkServicesSchema() {
  console.log('🔍 Checking Services Schema...\n');

  try {
    // First, let's see if services table exists and what columns it has
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .limit(1);

    if (servicesError) {
      console.error('❌ Error accessing services table:', servicesError);
      
      // Let's check what tables exist
      console.log('\n🔍 Checking available tables...');
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_table_names');
      
      if (tablesError) {
        console.log('Could not get table names, trying direct query...');
        
        // Try a simple query to see what happens
        const { data: testData, error: testError } = await supabase
          .from('services')
          .select('id, title, user_id')
          .limit(1);
          
        if (testError) {
          console.error('❌ Services table access error:', testError);
        } else {
          console.log('✅ Services table exists, sample data:', testData);
        }
      }
      return;
    }

    console.log('✅ Services table accessible');
    
    // Try different relationship patterns
    console.log('\n🔍 Testing different relationship patterns...\n');
    
    // Pattern 1: Direct user_id join
    try {
      const { data: test1, error: error1 } = await supabase
        .from('services')
        .select(`
          id,
          title,
          user_id,
          profiles(full_name, email)
        `)
        .limit(1);
        
      if (error1) {
        console.log('❌ Pattern 1 (profiles) failed:', error1.message);
      } else {
        console.log('✅ Pattern 1 (profiles) works!');
      }
    } catch (e) {
      console.log('❌ Pattern 1 exception:', e.message);
    }

    // Pattern 2: Explicit foreign key
    try {
      const { data: test2, error: error2 } = await supabase
        .from('services')
        .select(`
          id,
          title,
          user_id,
          profiles!services_user_id_fkey(full_name, email)
        `)
        .limit(1);
        
      if (error2) {
        console.log('❌ Pattern 2 (services_user_id_fkey) failed:', error2.message);
      } else {
        console.log('✅ Pattern 2 (services_user_id_fkey) works!');
      }
    } catch (e) {
      console.log('❌ Pattern 2 exception:', e.message);
    }

    // Pattern 3: Different foreign key name
    try {
      const { data: test3, error: error3 } = await supabase
        .from('services')
        .select(`
          id,
          title,
          user_id,
          profiles!user_id(full_name, email)
        `)
        .limit(1);
        
      if (error3) {
        console.log('❌ Pattern 3 (user_id) failed:', error3.message);
      } else {
        console.log('✅ Pattern 3 (user_id) works!');
      }
    } catch (e) {
      console.log('❌ Pattern 3 exception:', e.message);
    }

    // Let's also check what's actually in the services table
    const { data: sampleServices, error: sampleError } = await supabase
      .from('services')
      .select('*')
      .limit(3);

    if (sampleError) {
      console.error('❌ Error getting sample services:', sampleError);
    } else {
      console.log(`\n📋 Sample services (${sampleServices?.length || 0} found):`);
      if (sampleServices && sampleServices.length > 0) {
        sampleServices.forEach((service, index) => {
          console.log(`${index + 1}. ID: ${service.id}`);
          console.log(`   Title: ${service.title || 'N/A'}`);
          console.log(`   User ID: ${service.user_id || 'N/A'}`);
          console.log(`   Active: ${service.is_active}`);
          console.log('');
        });
      } else {
        console.log('   No services found in database');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkServicesSchema();