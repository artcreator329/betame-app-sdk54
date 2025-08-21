#!/usr/bin/env node

/**
 * Debug eKYC Verification Status Script
 * Investigates why eKYC verification status isn't reflecting on profile page
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please check .env.local file for:');
  console.error('- EXPO_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const userEmail = 'zorq9aox9r@zudpck.com';

console.log('🔍 Debugging eKYC Verification Status...');
console.log('==========================================');
console.log(`👤 User: ${userEmail}`);
console.log('');

async function debugEKYCStatus() {
  try {
    // 1. Find the user by email
    console.log('1️⃣ Finding user by email...');
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }

    const user = authUser.users.find(u => u.email === userEmail);
    if (!user) {
      console.error(`❌ User not found with email: ${userEmail}`);
      return;
    }

    console.log(`✅ Found user: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created: ${user.created_at}`);
    console.log('');

    // 2. Check user profile
    console.log('2️⃣ Checking user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError);
    } else if (profile) {
      console.log('✅ User profile found:');
      console.log(`   Full Name: ${profile.full_name || 'Not set'}`);
      console.log(`   Verification Status: ${profile.verification_status || 'Not set'}`);
      console.log(`   Is Service Provider: ${profile.is_service_provider || false}`);
      console.log(`   Service Provider Badge: ${profile.service_provider_badge || 'Not set'}`);
      console.log(`   Created: ${profile.created_at}`);
      console.log(`   Updated: ${profile.updated_at}`);
    } else {
      console.log('⚠️  No user profile found');
    }
    console.log('');

    // 3. Check eKYC submissions
    console.log('3️⃣ Checking eKYC submissions...');
    const { data: ekycSubmissions, error: ekycError } = await supabase
      .from('ekyc_submissions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (ekycError) {
      console.error('❌ Error fetching eKYC submissions:', ekycError);
    } else if (ekycSubmissions && ekycSubmissions.length > 0) {
      console.log(`✅ Found ${ekycSubmissions.length} eKYC submission(s):`);
      ekycSubmissions.forEach((submission, index) => {
        console.log(`   Submission ${index + 1}:`);
        console.log(`     ID: ${submission.id}`);
        console.log(`     Status: ${submission.status}`);
        console.log(`     Full Name: ${submission.full_name}`);
        console.log(`     Nationality: ${submission.nationality}`);
        console.log(`     Created: ${submission.created_at}`);
        console.log(`     Updated: ${submission.updated_at}`);
        console.log(`     Admin Notes: ${submission.admin_notes || 'None'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No eKYC submissions found');
    }

    // 4. Check if there's a mismatch
    console.log('4️⃣ Analyzing status mismatch...');
    
    if (ekycSubmissions && ekycSubmissions.length > 0) {
      const latestSubmission = ekycSubmissions[0];
      const submissionStatus = latestSubmission.status;
      const profileStatus = profile?.verification_status;

      console.log(`Latest eKYC submission status: ${submissionStatus}`);
      console.log(`Profile verification status: ${profileStatus}`);

      if (submissionStatus === 'approved' && profileStatus !== 'verified') {
        console.log('🚨 MISMATCH DETECTED!');
        console.log('   eKYC is approved but profile is not verified');
        console.log('   This indicates a sync issue between eKYC and profile');
        
        // 5. Fix the mismatch
        console.log('');
        console.log('5️⃣ Attempting to fix the mismatch...');
        
        const { data: updateResult, error: updateError } = await supabase
          .from('user_profiles')
          .update({
            verification_status: 'verified',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select();

        if (updateError) {
          console.error('❌ Error updating profile:', updateError);
        } else {
          console.log('✅ Profile verification status updated to "verified"');
          console.log('   Updated profile:', updateResult[0]);
        }
      } else if (submissionStatus === 'approved' && profileStatus === 'verified') {
        console.log('✅ Status is correctly synced');
        console.log('   Both eKYC and profile show verified status');
      } else {
        console.log(`ℹ️  Status sync appears correct:`);
        console.log(`   eKYC: ${submissionStatus} → Profile: ${profileStatus}`);
      }
    }

    // 6. Check for any triggers or functions that should handle this
    console.log('');
    console.log('6️⃣ Checking database triggers/functions...');
    
    const { data: functions, error: functionsError } = await supabase
      .rpc('get_function_list')
      .catch(() => ({ data: null, error: 'Function not available' }));

    if (functions) {
      console.log('✅ Database functions available');
    } else {
      console.log('⚠️  Could not check database functions');
    }

    // 7. Recommendations
    console.log('');
    console.log('7️⃣ Recommendations:');
    console.log('');
    
    if (ekycSubmissions && ekycSubmissions.length > 0) {
      const latestSubmission = ekycSubmissions[0];
      if (latestSubmission.status === 'approved') {
        console.log('📋 Action items:');
        console.log('1. ✅ User eKYC is approved');
        console.log('2. 🔄 Profile verification status should be updated');
        console.log('3. 📱 User should refresh their app to see changes');
        console.log('4. 🔍 Check if there are any caching issues in the app');
        console.log('');
        console.log('💡 Possible causes:');
        console.log('- Missing database trigger to update profile on eKYC approval');
        console.log('- App caching old profile data');
        console.log('- Profile refresh not happening after eKYC approval');
        console.log('- Manual admin approval didn\'t trigger profile update');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the debug
debugEKYCStatus().then(() => {
  console.log('');
  console.log('🎯 Debug completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});