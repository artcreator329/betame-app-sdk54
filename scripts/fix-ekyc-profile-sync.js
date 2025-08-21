#!/usr/bin/env node

/**
 * Fix eKYC Profile Sync Script
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

console.log('🔧 Fixing eKYC Profile Sync Issues...');
console.log('====================================');

async function fixEKYCProfileSync() {
  try {
    // 1. Find all users with approved eKYC but incorrect verification status
    console.log('1️⃣ Finding users with eKYC/profile sync issues...');
    
    const { data: mismatchedUsers, error } = await supabase
      .from('ekyc_submissions')
      .select(`
        id,
        user_id,
        status,
        full_name,
        created_at,
        updated_at,
        user_profiles!inner(
          user_id,
          full_name,
          verification_status,
          updated_at
        )
      `)
      .eq('status', 'approved')
      .neq('user_profiles.verification_status', 'verified');

    if (error) {
      console.error('❌ Error finding mismatched users:', error);
      return;
    }

    if (!mismatchedUsers || mismatchedUsers.length === 0) {
      console.log('✅ No sync issues found - all approved eKYCs have correct profile status');
      return;
    }

    console.log(`🚨 Found ${mismatchedUsers.length} user(s) with sync issues:`);
    console.log('');

    // 2. Display the issues
    mismatchedUsers.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  User ID: ${user.user_id}`);
      console.log(`  eKYC Status: ${user.status}`);
      console.log(`  Profile Status: ${user.user_profiles.verification_status}`);
      console.log(`  eKYC Name: ${user.full_name}`);
      console.log(`  Profile Name: ${user.user_profiles.full_name}`);
      console.log(`  eKYC Updated: ${user.updated_at}`);
      console.log(`  Profile Updated: ${user.user_profiles.updated_at}`);
      console.log('');
    });

    // 3. Fix the issues
    console.log('2️⃣ Fixing sync issues...');
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
    console.log('3️⃣ Summary:');
    console.log(`✅ Successfully fixed: ${fixed} users`);
    console.log(`❌ Failed to fix: ${failed} users`);
    console.log(`📊 Total processed: ${mismatchedUsers.length} users`);

    // 4. Verify the fixes
    if (fixed > 0) {
      console.log('');
      console.log('4️⃣ Verifying fixes...');
      
      const { data: verifyUsers, error: verifyError } = await supabase
        .from('ekyc_submissions')
        .select(`
          user_id,
          status,
          user_profiles!inner(
            verification_status
          )
        `)
        .eq('status', 'approved')
        .neq('user_profiles.verification_status', 'verified');

      if (verifyError) {
        console.error('❌ Error verifying fixes:', verifyError);
      } else if (!verifyUsers || verifyUsers.length === 0) {
        console.log('✅ All fixes verified - no more sync issues found');
      } else {
        console.log(`⚠️  Still ${verifyUsers.length} users with sync issues`);
      }
    }

    // 5. Create a monitoring function
    console.log('');
    console.log('5️⃣ Setting up monitoring...');
    await createMonitoringFunction();

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function createMonitoringFunction() {
  try {
    // Create a database function to monitor eKYC sync issues
    const monitoringFunction = `
      CREATE OR REPLACE FUNCTION check_ekyc_profile_sync()
      RETURNS TABLE(
        user_id UUID,
        ekyc_status TEXT,
        profile_status TEXT,
        ekyc_updated_at TIMESTAMPTZ,
        profile_updated_at TIMESTAMPTZ
      )
      LANGUAGE SQL
      SECURITY DEFINER
      AS $$
        SELECT 
          e.user_id,
          e.status as ekyc_status,
          p.verification_status as profile_status,
          e.updated_at as ekyc_updated_at,
          p.updated_at as profile_updated_at
        FROM ekyc_submissions e
        INNER JOIN user_profiles p ON e.user_id = p.user_id
        WHERE e.status = 'approved' 
        AND p.verification_status != 'verified'
        ORDER BY e.updated_at DESC;
      $$;
    `;

    const { error } = await supabase.rpc('exec_sql', { sql: monitoringFunction });
    
    if (error) {
      console.log('⚠️  Could not create monitoring function:', error.message);
    } else {
      console.log('✅ Created monitoring function: check_ekyc_profile_sync()');
    }
  } catch (error) {
    console.log('⚠️  Could not create monitoring function:', error.message);
  }
}

// Run the fix
fixEKYCProfileSync().then(() => {
  console.log('');
  console.log('🎯 eKYC Profile Sync Fix Completed!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. 📱 Users should refresh their apps to see updated status');
  console.log('2. 🔍 Monitor for future sync issues');
  console.log('3. 🛠️  Consider adding database triggers to prevent this issue');
  console.log('');
  console.log('💡 To check for future issues, run:');
  console.log('   SELECT * FROM check_ekyc_profile_sync();');
  
  process.exit(0);
}).catch(error => {
  console.error('❌ Fix failed:', error);
  process.exit(1);
});