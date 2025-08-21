#!/usr/bin/env node

/**
 * eKYC Sync Monitoring Script
 * Comprehensive monitoring and alerting for eKYC verification sync issues
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

console.log('📊 eKYC Sync Monitoring Dashboard');
console.log('=================================');

async function monitorEKYCSync() {
  try {
    // 1. Get overall statistics
    console.log('1️⃣ Getting sync statistics...');
    const { data: stats, error: statsError } = await supabase
      .rpc('get_ekyc_sync_stats');

    if (statsError) {
      console.error('❌ Error getting statistics:', statsError);
      return;
    }

    const statistics = stats?.[0] || {};
    
    console.log('');
    console.log('📈 Overall Statistics:');
    console.log(`   Total eKYC Submissions: ${statistics.total_submissions || 0}`);
    console.log(`   Approved: ${statistics.approved_submissions || 0}`);
    console.log(`   Rejected: ${statistics.rejected_submissions || 0}`);
    console.log(`   Pending: ${statistics.pending_submissions || 0}`);
    console.log(`   Verified Profiles: ${statistics.verified_profiles || 0}`);
    console.log(`   Sync Mismatches: ${statistics.sync_mismatches || 0}`);
    console.log(`   Recent Syncs (24h): ${statistics.recent_syncs_24h || 0}`);
    console.log(`   Last Sync: ${statistics.last_sync_time || 'Never'}`);

    // 2. Check for sync mismatches
    console.log('');
    console.log('2️⃣ Checking for sync mismatches...');
    const { data: mismatches, error: mismatchError } = await supabase
      .rpc('check_ekyc_profile_sync_mismatches');

    if (mismatchError) {
      console.error('❌ Error checking mismatches:', mismatchError);
    } else if (!mismatches || mismatches.length === 0) {
      console.log('✅ No sync mismatches found');
    } else {
      console.log(`🚨 Found ${mismatches.length} sync mismatch(es):`);
      console.log('');
      
      mismatches.forEach((mismatch, index) => {
        console.log(`   Mismatch ${index + 1}:`);
        console.log(`     User: ${mismatch.user_name} (${mismatch.user_email})`);
        console.log(`     eKYC Status: ${mismatch.ekyc_status}`);
        console.log(`     Profile Status: ${mismatch.profile_status}`);
        console.log(`     Duration: ${mismatch.mismatch_duration}`);
        console.log(`     eKYC Updated: ${mismatch.ekyc_updated_at}`);
        console.log(`     Profile Updated: ${mismatch.profile_updated_at}`);
        console.log('');
      });
    }

    // 3. Get recent sync logs
    console.log('3️⃣ Recent sync operations...');
    const { data: logs, error: logsError } = await supabase
      .from('ekyc_sync_log')
      .select('*')
      .order('sync_timestamp', { ascending: false })
      .limit(10);

    if (logsError) {
      console.error('❌ Error getting sync logs:', logsError);
    } else if (!logs || logs.length === 0) {
      console.log('ℹ️  No recent sync operations found');
    } else {
      console.log(`📋 Last ${logs.length} sync operations:`);
      console.log('');
      
      logs.forEach((log, index) => {
        const status = log.trigger_source === 'service_update_failed' ? '❌' : '✅';
        console.log(`   ${status} ${log.sync_timestamp}: ${log.user_name || 'Unknown'} (${log.user_email || 'Unknown'})`);
        console.log(`      ${log.old_ekyc_status || 'unknown'} → ${log.new_ekyc_status || 'unknown'} (${log.trigger_source})`);
      });
    }

    // 4. Health assessment
    console.log('');
    console.log('4️⃣ Health Assessment:');
    
    let healthStatus = 'healthy';
    const issues = [];

    // Critical issues
    if (mismatches && mismatches.length > 0) {
      healthStatus = 'critical';
      issues.push(`${mismatches.length} sync mismatch(es) require immediate attention`);
    }

    // Warning issues
    if (statistics.recent_syncs_24h === 0 && statistics.pending_submissions > 0) {
      if (healthStatus !== 'critical') healthStatus = 'warning';
      issues.push('No recent sync operations despite pending submissions');
    }

    if (statistics.approved_submissions > statistics.verified_profiles) {
      if (healthStatus !== 'critical') healthStatus = 'warning';
      issues.push('More approved eKYCs than verified profiles');
    }

    // Display health status
    const statusIcon = healthStatus === 'healthy' ? '✅' : 
                      healthStatus === 'warning' ? '⚠️' : '🚨';
    
    console.log(`   Status: ${statusIcon} ${healthStatus.toUpperCase()}`);
    
    if (issues.length > 0) {
      console.log('   Issues:');
      issues.forEach(issue => console.log(`     • ${issue}`));
    } else {
      console.log('   No issues detected');
    }

    // 5. Recommendations
    console.log('');
    console.log('5️⃣ Recommendations:');
    
    if (mismatches && mismatches.length > 0) {
      console.log('   🔧 Run: npm run fix-ekyc-sync');
      console.log('   📧 Notify affected users about status update');
    }

    if (statistics.recent_syncs_24h === 0) {
      console.log('   🔍 Check database trigger functionality');
      console.log('   📊 Verify eKYC approval process is working');
    }

    if (healthStatus === 'healthy') {
      console.log('   ✅ System is operating normally');
      console.log('   📅 Continue regular monitoring');
    }

    // 6. Quick actions
    console.log('');
    console.log('6️⃣ Quick Actions:');
    console.log('   📊 Monitor: npm run monitor-ekyc-sync');
    console.log('   🔧 Fix sync issues: npm run fix-ekyc-sync');
    console.log('   🔍 Debug specific user: npm run debug-ekyc-status');
    console.log('   📋 View logs: SELECT * FROM ekyc_sync_log ORDER BY sync_timestamp DESC LIMIT 20;');

    return {
      status: healthStatus,
      statistics,
      mismatches: mismatches || [],
      issues
    };

  } catch (error) {
    console.error('❌ Monitoring failed:', error);
    return {
      status: 'critical',
      error: error.message
    };
  }
}

// Auto-fix option
async function autoFix() {
  console.log('');
  console.log('🔧 Auto-fixing sync issues...');
  
  try {
    const { data: mismatches } = await supabase
      .rpc('check_ekyc_profile_sync_mismatches');

    if (!mismatches || mismatches.length === 0) {
      console.log('✅ No issues to fix');
      return;
    }

    console.log(`🔧 Fixing ${mismatches.length} sync issue(s)...`);
    
    let fixed = 0;
    let failed = 0;

    for (const mismatch of mismatches) {
      try {
        const { data: result, error } = await supabase
          .rpc('fix_ekyc_sync_mismatch', { target_user_id: mismatch.user_id });

        if (error) {
          console.error(`❌ Failed to fix ${mismatch.user_email}:`, error.message);
          failed++;
        } else if (result?.[0]?.success) {
          console.log(`✅ Fixed ${mismatch.user_email}`);
          fixed++;
        } else {
          console.error(`❌ Failed to fix ${mismatch.user_email}:`, result?.[0]?.message);
          failed++;
        }
      } catch (error) {
        console.error(`❌ Error fixing ${mismatch.user_email}:`, error.message);
        failed++;
      }
    }

    console.log('');
    console.log(`🎯 Auto-fix completed: ${fixed} fixed, ${failed} failed`);
    
  } catch (error) {
    console.error('❌ Auto-fix failed:', error);
  }
}

// Main execution
const args = process.argv.slice(2);
const shouldAutoFix = args.includes('--fix') || args.includes('-f');

monitorEKYCSync().then(async (result) => {
  if (shouldAutoFix && result.mismatches && result.mismatches.length > 0) {
    await autoFix();
  }
  
  console.log('');
  console.log('🎯 Monitoring completed!');
  
  // Exit with appropriate code
  if (result.status === 'critical') {
    process.exit(1);
  } else if (result.status === 'warning') {
    process.exit(2);
  } else {
    process.exit(0);
  }
}).catch(error => {
  console.error('❌ Monitoring failed:', error);
  process.exit(1);
});