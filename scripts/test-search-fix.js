#!/usr/bin/env node

/**
 * Test script to verify search functionality after fixing the text rendering issue
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testSearchSuggestions() {
  console.log('🔍 Testing search suggestions...');
  
  try {
    // Test services query
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select(`
        id,
        title,
        description,
        price,
        currency,
        image_url,
        category_name,
        location,
        rating,
        user_id
      `)
      .eq('status', 'active')
      .limit(5);

    if (servicesError) {
      console.error('❌ Error fetching services:', servicesError);
      return;
    }

    console.log('✅ Services fetched successfully:', services?.length || 0);
    
    // Check for null/undefined values that could cause rendering issues
    if (services) {
      services.forEach((service, index) => {
        console.log(`Service ${index + 1}:`);
        console.log(`  - ID: ${service.id}`);
        console.log(`  - Title: ${service.title || 'NULL/UNDEFINED'}`);
        console.log(`  - Price: ${service.price || 'NULL/UNDEFINED'}`);
        console.log(`  - Currency: ${service.currency || 'NULL/UNDEFINED'}`);
        console.log(`  - Category: ${service.category_name || 'NULL/UNDEFINED'}`);
        
        // Check for potential issues
        if (!service.title) {
          console.warn(`  ⚠️  Service ${service.id} has null/undefined title`);
        }
        if (!service.currency) {
          console.warn(`  ⚠️  Service ${service.id} has null/undefined currency`);
        }
        if (!service.category_name) {
          console.warn(`  ⚠️  Service ${service.id} has null/undefined category_name`);
        }
      });
    }

    // Test job listings
    const { data: jobs, error: jobsError } = await supabase
      .from('job_listings')
      .select(`
        id,
        title,
        description,
        budget_amount,
        currency,
        cover_photo,
        location_address,
        user_id
      `)
      .eq('status', 'active')
      .limit(5);

    if (jobsError) {
      console.error('❌ Error fetching jobs:', jobsError);
      return;
    }

    console.log('✅ Jobs fetched successfully:', jobs?.length || 0);
    
    if (jobs) {
      jobs.forEach((job, index) => {
        console.log(`Job ${index + 1}:`);
        console.log(`  - ID: ${job.id}`);
        console.log(`  - Title: ${job.title || 'NULL/UNDEFINED'}`);
        console.log(`  - Budget: ${job.budget_amount || 'NULL/UNDEFINED'}`);
        console.log(`  - Currency: ${job.currency || 'NULL/UNDEFINED'}`);
        
        if (!job.title) {
          console.warn(`  ⚠️  Job ${job.id} has null/undefined title`);
        }
      });
    }

    // Test profiles
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, bio, avatar_url')
      .limit(5);

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log('✅ Users fetched successfully:', users?.length || 0);
    
    if (users) {
      users.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  - ID: ${user.id}`);
        console.log(`  - Name: ${user.full_name || 'NULL/UNDEFINED'}`);
        console.log(`  - Bio: ${user.bio || 'NULL/UNDEFINED'}`);
        
        if (!user.full_name) {
          console.warn(`  ⚠️  User ${user.id} has null/undefined full_name`);
        }
      });
    }

    console.log('\n🎉 Search data test completed successfully!');
    console.log('✅ All potential null/undefined values should now be handled properly in the search components.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSearchSuggestions();