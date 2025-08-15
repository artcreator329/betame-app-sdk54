#!/usr/bin/env node

/**
 * Debug script to check profile data consistency
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugProfileData() {
  console.log('🔍 Debugging Profile Data...\n');

  try {
    // Get a sample user with profile data
    console.log('1. Checking profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, bio, avatar_url, cover_photo_url')
      .not('bio', 'is', null)
      .limit(3);

    if (profilesError) {
      throw new Error(`Profiles error: ${profilesError.message}`);
    }

    console.log('Profiles with bio data:');
    profiles.forEach(profile => {
      console.log(`  - ${profile.full_name}: "${profile.bio}"`);
      console.log(`    Avatar: ${profile.avatar_url ? 'Yes' : 'No'}`);
      console.log(`    Cover: ${profile.cover_photo_url ? 'Yes' : 'No'}`);
    });

    if (profiles.length > 0) {
      const testUserId = profiles[0].id;
      console.log(`\n2. Testing merged profile data for user: ${testUserId}`);

      // Simulate the auth service logic
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', testUserId)
        .single();

      const { data: userProfileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', testUserId)
        .maybeSingle();

      const mergedProfile = {
        ...profileData,
        ...userProfileData,
        user_id: testUserId,
      };

      console.log('Profile data:', {
        full_name: profileData?.full_name,
        bio: profileData?.bio,
        avatar_url: profileData?.avatar_url ? 'Present' : 'Missing',
        cover_photo_url: profileData?.cover_photo_url ? 'Present' : 'Missing',
      });

      console.log('User profile data:', {
        is_seller: userProfileData?.is_seller || 'Not set',
        full_name: userProfileData?.full_name || 'Not set',
      });

      console.log('Merged profile:', {
        full_name: mergedProfile.full_name,
        bio: mergedProfile.bio,
        is_seller: mergedProfile.is_seller,
        avatar_url: mergedProfile.avatar_url ? 'Present' : 'Missing',
        cover_photo_url: mergedProfile.cover_photo_url ? 'Present' : 'Missing',
      });
    }

    console.log('\n🎉 Profile data debug completed!');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    process.exit(1);
  }
}

// Run the debug
debugProfileData();