#!/usr/bin/env node

/**
 * Test script to verify the service detail page fix
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

// Simulate the updated ServiceService.getServiceById method
async function getServiceById(id) {
  try {
    console.log('🔍 ServiceService.getServiceById: Fetching service with ID:', id);
    
    const { data: service, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('❌ ServiceService.getServiceById: Error fetching service by ID:', error);
      return null;
    }

    if (!service) {
      console.log('❌ ServiceService.getServiceById: No service found with ID:', id);
      return null;
    }

    console.log('✅ ServiceService.getServiceById: Service found:', service.title);

    // Get service variants if this is a main service
    let serviceVariants = [];
    if (!service.parent_service_id) {
      const { data: variants, error: variantsError } = await supabase
        .from('services')
        .select('*')
        .eq('parent_service_id', service.id)
        .order('created_at', { ascending: true });

      if (variantsError) {
        console.error('⚠️ ServiceService.getServiceById: Error fetching service variants:', variantsError);
      } else {
        serviceVariants = variants || [];
      }
    }

    // Get the profile for this service's user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', service.user_id)
      .maybeSingle();

    if (profileError) {
      console.error('⚠️ ServiceService.getServiceById: Error fetching profile:', profileError);
      // Return service without profile data but with variants
      return {
        ...service,
        provider_name: 'Service Provider',
        provider_avatar: undefined,
        service_variants: serviceVariants
      };
    }

    // Combine service with profile data and variants
    const result = {
      ...service,
      provider_name: profile?.full_name || 'Service Provider',
      provider_avatar: profile?.avatar_url,
      service_variants: serviceVariants
    };

    console.log('📦 ServiceService.getServiceById: Returning service with profile data and', serviceVariants.length, 'variants');
    return result;
  } catch (error) {
    console.error('❌ ServiceService.getServiceById: Unexpected error:', error);
    return null;
  }
}

// Simulate the updated loadServiceVariants function
function loadServiceVariants(serviceData) {
  console.log('🔍 ServiceDetailsScreen: Loading service variants...');
  
  // Create array with main service and its variants
  const variants = [serviceData]; // Main service first
  
  // Use variants from serviceData if available (from updated getServiceById)
  if (serviceData.service_variants && serviceData.service_variants.length > 0) {
    variants.push(...serviceData.service_variants);
    console.log('✅ Using variants from service data');
  } else {
    console.log('ℹ️ No variants found in service data');
  }
  
  console.log('🔍 ServiceDetailsScreen: Loaded', variants.length - 1, 'service variants');
  return variants;
}

async function testServiceDetailFix() {
  console.log('🔍 Testing service detail page fix...\n');

  try {
    // 1. Find a trending service with variants
    console.log('1. Finding a trending service with variants...');
    
    const { data: allTrendingServices, error: trendingError } = await supabase
      .from('services')
      .select('*')
      .eq('is_trending', true);

    if (trendingError) {
      console.error('❌ Error fetching trending services:', trendingError);
      return;
    }

    // Find a main service that has variants
    const mainServices = allTrendingServices?.filter(service => !service.parent_service_id) || [];
    const serviceVariants = allTrendingServices?.filter(service => service.parent_service_id) || [];

    let testService = null;
    for (const service of mainServices) {
      const hasVariants = serviceVariants.some(variant => variant.parent_service_id === service.id);
      if (hasVariants) {
        testService = service;
        break;
      }
    }

    if (!testService) {
      console.log('❌ No trending services with variants found');
      return;
    }

    console.log(`✅ Found trending service with variants: "${testService.title}"`);

    // 2. Test the updated getServiceById method
    console.log(`\n2. Testing updated getServiceById method...`);
    const serviceData = await getServiceById(testService.id);

    if (!serviceData) {
      console.log('❌ Failed to fetch service data');
      return;
    }

    console.log(`✅ Service data loaded with ${serviceData.service_variants?.length || 0} variants included`);

    // 3. Test the updated loadServiceVariants function
    console.log(`\n3. Testing updated loadServiceVariants function...`);
    const variants = loadServiceVariants(serviceData);

    console.log(`\n📊 Results:`);
    console.log(`   Main Service: ${serviceData.title}`);
    console.log(`   Total Variants Array Length: ${variants.length}`);
    console.log(`   Service Variants (excluding main): ${variants.length - 1}`);
    console.log(`   Will Show Variants Section: ${variants.length > 1 ? 'YES' : 'NO'}`);

    if (variants.length > 1) {
      console.log(`\n📦 Variants that will be displayed:`);
      variants.slice(1).forEach((variant, index) => {
        console.log(`   ${index + 1}. ${variant.title} - ${variant.currency} ${variant.price}`);
      });

      console.log(`\n✅ SUCCESS: Service detail page will now show ${variants.length - 1} service variants!`);
      console.log('✅ Users will see "Available Options" section with Order and Chat buttons');
      console.log('✅ The "Choose a service option above" message will now have actual options');
    } else {
      console.log(`\n⚠️ WARNING: No variants will be displayed (variants.length = ${variants.length})`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testServiceDetailFix().catch(console.error);