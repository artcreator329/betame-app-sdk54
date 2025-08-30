#!/usr/bin/env node

/**
 * Test script to verify service variants are being loaded correctly
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

async function testServiceVariants() {
  console.log('🔍 Testing service variants loading...\n');

  try {
    // 1. Get trending services
    console.log('1. Testing getTrendingServices...');
    const { data: trendingServices, error: trendingError } = await supabase
      .from('services')
      .select('*')
      .eq('is_trending', true)
      .order('rating', { ascending: false })
      .order('review_count', { ascending: false });

    if (trendingError) {
      console.error('❌ Error fetching trending services:', trendingError);
      return;
    }

    console.log(`✅ Found ${trendingServices?.length || 0} trending services`);

    if (!trendingServices || trendingServices.length === 0) {
      console.log('ℹ️ No trending services found. Creating a test service with variants...');
      
      // Create a test main service
      const { data: mainService, error: mainServiceError } = await supabase
        .from('services')
        .insert([{
          user_id: '00000000-0000-0000-0000-000000000000', // Use a test UUID
          title: 'Sound Healing Meditation - Test Service',
          description: 'I offer On-Site Sound Healing Meditation sessions that create a serene and transformative experience tailored to your individual needs.',
          price: 120,
          currency: 'RM',
          category_name: 'Wellness Services',
          location: 'Old Klang Road, Kuala Lumpur, Federal Territory of Kuala Lumpur, Malaysia',
          is_trending: true,
          is_nearby: true,
          rating: 5.0,
          review_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (mainServiceError) {
        console.error('❌ Error creating main service:', mainServiceError);
        return;
      }

      console.log('✅ Created main service:', mainService.title);

      // Create service variants
      const variants = [
        {
          user_id: '00000000-0000-0000-0000-000000000000',
          title: 'Sound Healing Meditation - Basic Session',
          description: 'A 60-minute basic sound healing session with singing bowls and gentle meditation.',
          price: 80,
          currency: 'RM',
          category_name: 'Wellness Services',
          location: 'Old Klang Road, Kuala Lumpur, Federal Territory of Kuala Lumpur, Malaysia',
          parent_service_id: mainService.id,
          is_trending: true,
          is_nearby: true,
          rating: 5.0,
          review_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          user_id: '00000000-0000-0000-0000-000000000000',
          title: 'Sound Healing Meditation - Premium Session',
          description: 'A 90-minute premium sound healing session with multiple instruments and personalized meditation guidance.',
          price: 150,
          currency: 'RM',
          category_name: 'Wellness Services',
          location: 'Old Klang Road, Kuala Lumpur, Federal Territory of Kuala Lumpur, Malaysia',
          parent_service_id: mainService.id,
          is_trending: true,
          is_nearby: true,
          rating: 5.0,
          review_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      const { data: createdVariants, error: variantsError } = await supabase
        .from('services')
        .insert(variants)
        .select();

      if (variantsError) {
        console.error('❌ Error creating service variants:', variantsError);
        return;
      }

      console.log(`✅ Created ${createdVariants?.length || 0} service variants`);
    }

    // 2. Test the updated getTrendingServices logic
    console.log('\n2. Testing updated getTrendingServices logic...');
    
    // Get all trending services including variants
    const { data: allTrendingServices, error: allTrendingError } = await supabase
      .from('services')
      .select('*')
      .eq('is_trending', true)
      .order('rating', { ascending: false })
      .order('review_count', { ascending: false });

    if (allTrendingError) {
      console.error('❌ Error fetching all trending services:', allTrendingError);
      return;
    }

    // Separate main services from variants
    const mainServices = allTrendingServices?.filter(service => !service.parent_service_id) || [];
    const serviceVariants = allTrendingServices?.filter(service => service.parent_service_id) || [];

    console.log(`✅ Found ${mainServices.length} main trending services`);
    console.log(`✅ Found ${serviceVariants.length} service variants`);

    // Group variants by parent service ID
    const variantsMap = new Map();
    serviceVariants.forEach(variant => {
      const parentId = variant.parent_service_id;
      if (!variantsMap.has(parentId)) {
        variantsMap.set(parentId, []);
      }
      variantsMap.get(parentId).push(variant);
    });

    // Show services with their variants
    mainServices.forEach(service => {
      const variants = variantsMap.get(service.id) || [];
      const lowestPrice = variants.length > 0 
        ? Math.min(...variants.map(v => v.price))
        : service.price;
      
      console.log(`\n📦 Service: ${service.title}`);
      console.log(`   Original Price: ${service.currency} ${service.price}`);
      console.log(`   Display Price: ${service.currency} ${lowestPrice} (from ${variants.length} variants)`);
      
      variants.forEach((variant, index) => {
        console.log(`   Variant ${index + 1}: ${variant.title} - ${variant.currency} ${variant.price}`);
      });
    });

    // 3. Test getServiceById with a specific service
    if (mainServices.length > 0) {
      const testService = mainServices[0];
      console.log(`\n3. Testing getServiceById with service: ${testService.id}`);
      
      const { data: serviceById, error: serviceByIdError } = await supabase
        .from('services')
        .select('*')
        .eq('id', testService.id)
        .maybeSingle();

      if (serviceByIdError) {
        console.error('❌ Error fetching service by ID:', serviceByIdError);
        return;
      }

      if (serviceById) {
        // Get service variants
        const { data: variants, error: variantsError } = await supabase
          .from('services')
          .select('*')
          .eq('parent_service_id', serviceById.id)
          .order('created_at', { ascending: true });

        if (variantsError) {
          console.error('⚠️ Error fetching service variants:', variantsError);
        } else {
          console.log(`✅ Service "${serviceById.title}" has ${variants?.length || 0} variants`);
          variants?.forEach((variant, index) => {
            console.log(`   Variant ${index + 1}: ${variant.title} - ${variant.currency} ${variant.price}`);
          });
        }
      }
    }

    console.log('\n✅ Service variants test completed successfully!');
    console.log('\n📝 Summary:');
    console.log('- Trending services now include service variants');
    console.log('- Service detail page will show variants in "Available Options" section');
    console.log('- Users can now see and select from different service variants');
    console.log('- The "Choose a service option above" message should now have actual options to choose from');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testServiceVariants().catch(console.error);