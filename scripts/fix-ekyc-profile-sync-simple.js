#!/usr/bin/env node

/**
 * Simple eKYC Profile Sync Fix Script
 * Fixes users where eKYC is approved but profile verification status is not updated
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 Fixing eKYC Profile Sync Issues (Simple Version)...');
console.log('====================================================');

async function fixEKYCProfileSync() {
  try {
    // 1. Find all approved eKYC submissions
    console.log('1️⃣ Finding approved eKYC submissions...');
    
    const { data: approvedSubmissions, error: ekycError } = await supabase
      .from('ekyc_submissions')
      .select('user_id, status, full_name, updated_at')
      .eq('status', 'approved');

    if (ekycError) {
      console.error('❌ Error fetching eKYC submissions:', ekycError);
      return;
    }

    if (!approvedSubmissions || approvedSubmissions.length === 0) {
      console.log('ℹ️  No approved eKYC submissions found');
      return;
    }

    console.log(`✅ Found ${approvedSubmissions.length} approved eKYC submission(s)`);

    // 2. Check each user's profile verification status
    console.log('');
    console.log('2️⃣ Checking profile verification status for each user...');
    
    let mismatchedUsers = [];
    
    for (const submission of approvedSubmissions) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, verification_status, updated_at')
        .eq('user_id', submission.user_id)
        .single();

      if (profileError) {
        console.log(`⚠️  Could not fetch profile for user ${submission.user_id}`);
        continue;
      }

      if (profile.verification_status !== 'verified') {
        mismatchedUsers.push({
          user_id: submission.user_id,
          ekyc_status: submission.status,
          profile_status: profile.verification_status,
          ekyc_name: submission.full_name,
          profile_name: profile.full_name,
          ekyc_updated: submission.updated_at,
          profile_updated: profile.updated_at
        });
      }
    }

    if (mismatchedUsers.length === 0) {
      console.log('✅ No sync issues found - all approved eKYCs have correct profile status');
      return;
    }

    console.log(`🚨 Found ${mismatchedUsers.length} user(s) with sync issues:`);
    console.log('');

    // 3. Display the issues
    mismatchedUsers.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  User ID: ${user.user_id}`);
      console.log(`  eKYC Status: ${user.ekyc_status}`);
      console.log(`  Profile Status: ${user.profile_status}`);
      console.log(`  eKYC Name: ${user.ekyc_name}`);
      console.log(`  Profile Name: ${user.profile_name}`);
      console.log(`  eKYC Updated: ${user.ekyc_updated}`);
      console.log(`  Profile Updated: ${user.profile_updated}`);
      console.log('');
    });

    // 4. Fix the issues
    console.log('3️⃣ Fixing sync issues...');
    let fixed = 0;
    let failed = 0;

    for (const user of mismatchedUsers) {
      try {
        console.log(`Fixing user ${user.user_id}...`);
        
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            verification_status: 'verified',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.user_id);

        if (updateError) {
          console.error(`❌ Failed to fix user ${user.user_id}:`, updateError);
          failed++;
        } else {
          console.log(`✅ Fixed user ${user.user_id}`);
          fixed++;
        }
      } catch (error) {
        console.error(`❌ Error fixing user ${user.user_id}:`, error);
        failed++;
      }
    }

    console.log('');
    console.log('4️⃣ Summary:');
    console.log(`✅ Successfully fixed: ${fixed} users`);
    console.log(`❌ Failed to fix: ${failed} users`);
    console.log(`📊 Total processed: ${mismatchedUsers.length} users`);

    // 5. Final verification
    if (fixed > 0) {
      console.log('');
      console.log('5️⃣ Final verification...');
      
      // Re-check the fixed users
      let stillBroken = 0;
      for (const user of mismatchedUsers) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('verification_status')
          .eq('user_id', user.user_id)
          .single();
        
        if (profile && profile.verification_status !== 'verified') {
          stillBroken++;
        }
      }
      
      if (stillBroken === 0) {
        console.log('✅ All fixes verified successfully');
      } else {
        console.log(`⚠️  ${stillBroken} users still have sync issues`);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixEKYCProfileSync().then(() => {
  console.log('');
  console.log('🎯 eKYC Profile Sync Fix Completed!');
  console.log('');
  console.log('📋 Next steps for users:');
  console.log('1. 📱 Close and reopen the app completely');
  console.log('2. 🔄 Pull down to refresh the profile page');
  console.log('3. ✅ Verification status should now show as "Verified"');
  console.log('');
  console.log('📋 Next steps for developers:');
  console.log('1. 🔍 Investigate why the sync didn\'t happen automatically');
  console.log('2. 🛠️  Consider adding database triggers to prevent this issue');
  console.log('3. 📊 Monitor for future occurrences');
  
  process.exit(0);
}).catch(error => {
  console.error('❌ Fix failed:', error);
  process.exit(1);
});