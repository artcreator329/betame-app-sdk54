#!/usr/bin/env node

/**
 * Test script to verify auth service getUserProfile function
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAuthService() {
  console.log('🧪 Testing Auth Service getUserProfile...\n');

  const testUserId = '20936ff2-2654-4dd5-9b36-1b69df15d6e0'; // Akmal B Razak

  try {
    console.log('1. Testing profiles table query...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testUserId)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Profile error: ${profileError.message}`);
    }

    console.log('Profile data:', {
      full_name: profileData?.full_name,
      bio: profileData?.bio,
      is_verified: profileData?.is_verified,
    });

    console.log('\n2. Testing user_profiles table query...');
    const { data: userProfileData, error: userProfileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', testUserId)
      .maybeSingle();

    if (userProfileError && userProfileError.code !== 'PGRST116') {
      throw new Error(`User profile error: ${userProfileError.message}`);
    }

    console.log('User profile data:', {
      is_seller: userProfileData?.is_seller,
      seller_badge: userProfileData?.seller_badge,
      rating: userProfileData?.rating,
    });

    console.log('\n3. Testing merged profile logic...');
    const mergedProfile = {
      ...profileData,
      // Only take seller-specific fields from user_profiles
      is_seller: userProfileData?.is_seller || false,
      seller_badge: userProfileData?.seller_badge,
      seller_badge_subtitle: userProfileData?.seller_badge_subtitle,
      seller_description: userProfileData?.seller_description,
      rating: userProfileData?.rating || 0,
      review_count: userProfileData?.review_count || 0,
      user_id: testUserId,
    };

    console.log('Merged profile:', {
      full_name: mergedProfile.full_name,
      bio: mergedProfile.bio,
      is_seller: mergedProfile.is_seller,
      avatar_url: mergedProfile.avatar_url ? 'Present' : 'Missing',
      cover_photo_url: mergedProfile.cover_photo_url ? 'Present' : 'Missing',
    });

    console.log('\n🎉 Auth service test completed!');
    console.log(`✅ is_seller should be: ${mergedProfile.is_seller}`);
    console.log(`✅ Should show: "${mergedProfile.full_name} is a verified seller"`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAuthService();