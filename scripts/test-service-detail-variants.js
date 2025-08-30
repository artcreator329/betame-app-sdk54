#!/usr/bin/env node

/**
 * Test script to verify service detail page loads variants correctly
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testServiceDetailVariants() {
  console.log('🔍 Testing service detail page variant loading...\n');

  try {
    // 1. Find a trending service with variants
    console.log('1. Finding trending services with variants...');
    
    const { data: allTrendingServices, error: trendingError } = await supabase
      .from('services')
      .select('*')
      .eq('is_trending', true)
      .order('rating', { ascending: false });

    if (trendingError) {
      console.error('❌ Error fetching trending services:', trendingError);
      return;
    }

    // Separate main services from variants
    const mainServices = allTrendingServices?.filter(service => !service.parent_service_id) || [];
    const serviceVariants = allTrendingServices?.filter(service => service.parent_service_id) || [];

    // Find a main service that has variants
    let testService = null;
    for (const service of mainServices) {
      const hasVariants = serviceVariants.some(variant => variant.parent_service_id === service.id);
      if (hasVariants) {
        testService = service;
        break;
      }
    }

    if (!testService) {
      console.log('ℹ️ No trending services with variants found. This might be the issue!');
      
      // Check if there are any services with variants at all
      const { data: allVariants, error: variantsError } = await supabase
        .from('services')
        .select('*')
        .not('parent_service_id', 'is', null);

      if (variantsError) {
        console.error('❌ Error checking for service variants:', variantsError);
        return;
      }

      console.log(`Found ${allVariants?.length || 0} service variants in total`);
      
      if (allVariants && allVariants.length > 0) {
        // Get the parent service of the first variant
        const firstVariant = allVariants[0];
        const { data: parentService, error: parentError } = await supabase
          .from('services')
          .select('*')
          .eq('id', firstVariant.parent_service_id)
          .single();

        if (parentError) {
          console.error('❌ Error fetching parent service:', parentError);
          return;
        }

        testService = parentService;
        console.log(`✅ Using service "${testService.title}" for testing`);
      } else {
        console.log('❌ No service variants found in the database at all!');
        return;
      }
    } else {
      console.log(`✅ Found trending service with variants: "${testService.title}"`);
    }

    // 2. Test the getServiceById functionality (simulating what the service detail page does)
    console.log(`\n2. Testing service detail loading for service ID: ${testService.id}`);
    
    // Simulate the getServiceById method
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', testService.id)
      .maybeSingle();

    if (serviceError) {
      console.error('❌ Error fetching service:', serviceError);
      return;
    }

    if (!service) {
      console.log('❌ Service not found');
      return;
    }

    console.log(`✅ Service found: "${service.title}"`);

    // Get service variants (this is what the service detail page should do)
    let variants = [];
    if (!service.parent_service_id) {
      const { data: serviceVariants, error: variantsError } = await supabase
        .from('services')
        .select('*')
        .eq('parent_service_id', service.id)
        .order('created_at', { ascending: true });

      if (variantsError) {
        console.error('⚠️ Error fetching service variants:', variantsError);
      } else {
        variants = serviceVariants || [];
      }
    }

    console.log(`✅ Found ${variants.length} service variants`);

    if (variants.length > 0) {
      console.log('\n📦 Service Variants:');
      variants.forEach((variant, index) => {
        console.log(`   ${index + 1}. ${variant.title}`);
        console.log(`      Price: ${variant.currency} ${variant.price}`);
        console.log(`      Description: ${variant.description.substring(0, 100)}...`);
        console.log('');
      });

      console.log('✅ Service detail page should now show these variants in the "Available Options" section');
      console.log('✅ Users should be able to click "Order" or "Chat" buttons for each variant');
    } else {
      console.log('⚠️ No variants found - this explains why "Choose a service option above" shows no options');
    }

    // 3. Test the service card display logic
    console.log('\n3. Testing service card display logic...');
    
    // Simulate what ServiceCard component should show
    const hasVariants = variants.length > 0;
    const lowestPrice = hasVariants 
      ? Math.min(...variants.map(v => v.price))
      : service.price;

    console.log(`Service Card Display:`);
    console.log(`   Title: ${service.title}`);
    console.log(`   Original Price: ${service.currency} ${service.price}`);
    console.log(`   Display Price: From ${service.currency} ${lowestPrice}`);
    console.log(`   Has Variants: ${hasVariants ? 'Yes' : 'No'}`);
    console.log(`   Should Show Variants Section: ${hasVariants ? 'Yes' : 'No'}`);

    console.log('\n✅ Service detail variant loading test completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testServiceDetailVariants().catch(console.error);