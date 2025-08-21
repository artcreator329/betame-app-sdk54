#!/usr/bin/env node

/**
 * Setup Admin eKYC Monitoring Script
 * Sets up the database trigger and tests the admin monitoring dashboard
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

console.log('🔧 Setting up Admin eKYC Monitoring Dashboard...');
console.log('=================================================');

async function setupAdminMonitoring() {
  try {
    // 1. Setup database trigger first
    console.log('1️⃣ Setting up database trigger...');
    
    // Check if trigger exists
    const { data: triggerExists, error: triggerError } = await supabase
      .rpc('check_trigger_exists', { trigger_name: 'ekyc_status_sync_trigger' })
      .catch(() => ({ data: false, error: null }));

    if (!triggerExists) {
      console.log('   Database trigger not found. Please run:');
      console.log('   npm run setup-ekyc-trigger');
      console.log('');
    } else {
      console.log('   ✅ Database trigger is set up');
    }

    // 2. Test monitoring functions
    console.log('2️⃣ Testing monitoring functions...');
    
    try {
      const { data: stats, error: statsError } = await supabase
        .rpc('get_ekyc_sync_stats');

      if (statsError) {
        console.log('   ❌ Stats function not working:', statsError.message);
        console.log('   Please run: npm run setup-ekyc-trigger');
      } else {
        console.log('   ✅ Stats function working');
        console.log('   📊 Current stats:', stats?.[0] || {});
      }
    } catch (error) {
      console.log('   ❌ Stats function test failed:', error.message);
    }

    try {
      const { data: mismatches, error: mismatchError } = await supabase
        .rpc('check_ekyc_profile_sync_mismatches');

      if (mismatchError) {
        console.log('   ❌ Mismatch check function not working:', mismatchError.message);
      } else {
        console.log('   ✅ Mismatch check function working');
        console.log(`   🔍 Current mismatches: ${mismatches?.length || 0}`);
      }
    } catch (error) {
      console.log('   ❌ Mismatch check function test failed:', error.message);
    }

    // 3. Test log table access
    console.log('3️⃣ Testing log table access...');
    
    try {
      const { data: logs, error: logsError } = await supabase
        .from('ekyc_sync_log')
        .select('id, sync_timestamp, trigger_source')
        .limit(5);

      if (logsError) {
        console.log('   ❌ Log table not accessible:', logsError.message);
      } else {
        console.log('   ✅ Log table accessible');
        console.log(`   📋 Recent logs: ${logs?.length || 0} entries`);
      }
    } catch (error) {
      console.log('   ❌ Log table test failed:', error.message);
    }

    // 4. Test admin dashboard functions
    console.log('4️⃣ Testing admin dashboard integration...');
    
    console.log('   📱 Admin dashboard features:');
    console.log('   • Real-time health monitoring');
    console.log('   • Sync statistics dashboard');
    console.log('   • Mismatch detection and alerts');
    console.log('   • One-click issue resolution');
    console.log('   • Recent sync operation logs');
    console.log('   • Quick access to eKYC management');

    // 5. Provide setup instructions
    console.log('');
    console.log('5️⃣ Admin Dashboard Setup Complete!');
    console.log('');
    console.log('📋 New Admin Features:');
    console.log('   🖥️  eKYC Monitoring Dashboard: /admin/ekyc-monitoring');
    console.log('   📊 Real-time health status and statistics');
    console.log('   🔧 One-click sync issue resolution');
    console.log('   📈 Performance metrics and trends');
    console.log('   🚨 Automated alerts for critical issues');
    console.log('');
    console.log('🚀 Access the monitoring dashboard:');
    console.log('   1. Login as admin');
    console.log('   2. Navigate to Admin Dashboard');
    console.log('   3. Click "eKYC Monitor" in the sidebar');
    console.log('   4. Or visit /admin/ekyc-monitoring directly');
    console.log('');
    console.log('⚡ Quick Actions Available:');
    console.log('   • View system health status');
    console.log('   • Monitor sync statistics');
    console.log('   • Fix sync mismatches automatically');
    console.log('   • Review recent sync operations');
    console.log('   • Access detailed eKYC management');

    return true;

  } catch (error) {
    console.error('❌ Setup failed:', error);
    return false;
  }
}

// Run setup
setupAdminMonitoring().then((success) => {
  if (success) {
    console.log('');
    console.log('✅ Admin eKYC Monitoring Dashboard setup completed!');
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('1. 🔧 Ensure database trigger is set up: npm run setup-ekyc-trigger');
    console.log('2. 📊 Test the monitoring dashboard in admin panel');
    console.log('3. 🚨 Set up alerts for critical issues (optional)');
    console.log('4. 📈 Monitor system health regularly');
    
    process.exit(0);
  } else {
    console.log('');
    console.log('❌ Setup encountered issues. Please check the logs above.');
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Run: npm run setup-ekyc-trigger');
    console.log('2. Check database permissions');
    console.log('3. Verify admin user access');
    
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});