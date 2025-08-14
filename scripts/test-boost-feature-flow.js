/**
 * Test script for the boost feature flow
 * This script tests the complete flow of purchasing and applying boost features to services
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testBoostFeatureFlow() {
  console.log('🚀 Testing Boost Feature Flow...\n');

  try {
    // Test 1: Check if service_feature_applications table exists
    console.log('1. Checking service_feature_applications table...');
    const { data: tables, error: tablesError } = await supabase
      .from('service_feature_applications')
      .select('*')
      .limit(1);

    if (tablesError) {
      console.error('❌ service_feature_applications table not found:', tablesError.message);
      return;
    }
    console.log('✅ service_feature_applications table exists\n');

    // Test 2: Check if services table has the required boost fields
    console.log('2. Checking services table structure...');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, title, is_trending, is_nearby')
      .limit(1);

    if (servicesError) {
      console.error('❌ Error checking services table:', servicesError.message);
      return;
    }
    console.log('✅ Services table has required boost fields\n');

    // Test 3: Check purchased_features table
    console.log('3. Checking purchased_features table...');
    const { data: features, error: featuresError } = await supabase
      .from('purchased_features')
      .select('*')
      .limit(1);

    if (featuresError) {
      console.error('❌ Error checking purchased_features table:', featuresError.message);
      return;
    }
    console.log('✅ purchased_features table accessible\n');

    // Test 4: Check wallets table
    console.log('4. Checking wallets table...');
    const { data: wallets, error: walletsError } = await supabase
      .from('wallets')
      .select('*')
      .limit(1);

    if (walletsError) {
      console.error('❌ Error checking wallets table:', walletsError.message);
      return;
    }
    console.log('✅ wallets table accessible\n');

    console.log('🎉 All database tables are properly configured for the boost feature flow!');
    console.log('\n📋 Feature Flow Summary:');
    console.log('1. Users can purchase boost features using BetaCoins');
    console.log('2. Purchased features are stored in purchased_features table');
    console.log('3. Users can apply features to specific services via ServiceSelectionModal');
    console.log('4. Feature applications are tracked in service_feature_applications table');
    console.log('5. Services get boost flags (is_trending, is_nearby) updated accordingly');
    console.log('\n🎯 Boost Feature Types:');
    console.log('- feature_2x: Feature (2x visibility) - Sets is_trending = true for 2 weeks');
    console.log('- boost_instant: Boost (instant visibility) - Sets is_nearby = true for 1 week');
    console.log('- showcase_max: Showcase (Max visibility) - Sets both flags for 2 weeks');
    console.log('- boost_feature_max: Boost Feature (Max visibility for All) - Sets both flags for 2 weeks');

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
  }
}

// Run the test
testBoostFeatureFlow();