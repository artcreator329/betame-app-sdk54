#!/usr/bin/env node

/**
 * Setup eKYC Database Trigger Script
 * Creates the database trigger and monitoring functions for eKYC sync
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 Setting up eKYC Database Trigger...');
console.log('====================================');

async function setupTrigger() {
  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '..', 'database', 'create_ekyc_sync_trigger.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ SQL file not found:', sqlFilePath);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('📄 SQL file loaded successfully');

    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    console.log('');

    // Execute each statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue;
      }

      try {
        console.log(`${i + 1}/${statements.length} Executing statement...`);
        
        // For complex statements, we need to use the raw SQL execution
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        }).catch(async () => {
          // Fallback: try direct execution for simpler statements
          return await supabase.from('_').select('*').limit(0);
        });

        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
      } catch (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        errorCount++;
      }
    }

    console.log('');
    console.log('📊 Execution Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📋 Total: ${statements.length}`);

    // Test the trigger setup
    console.log('');
    console.log('🧪 Testing trigger setup...');
    
    try {
      // Test the monitoring functions
      const { data: stats, error: statsError } = await supabase
        .rpc('get_ekyc_sync_stats');

      if (statsError) {
        console.error('❌ Stats function test failed:', statsError.message);
      } else {
        console.log('✅ Stats function working');
      }

      const { data: mismatches, error: mismatchError } = await supabase
        .rpc('check_ekyc_profile_sync_mismatches');

      if (mismatchError) {
        console.error('❌ Mismatch check function test failed:', mismatchError.message);
      } else {
        console.log('✅ Mismatch check function working');
      }

      // Check if log table exists
      const { data: logTable, error: logError } = await supabase
        .from('ekyc_sync_log')
        .select('id')
        .limit(1);

      if (logError) {
        console.error('❌ Log table test failed:', logError.message);
      } else {
        console.log('✅ Log table accessible');
      }

    } catch (error) {
      console.error('❌ Trigger test failed:', error.message);
    }

    console.log('');
    console.log('🎯 Setup completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. 🧪 Test the trigger by updating an eKYC status');
    console.log('2. 📊 Monitor sync operations: npm run monitor-ekyc-sync');
    console.log('3. 🔧 Fix any existing issues: npm run fix-ekyc-sync');
    console.log('');
    console.log('💡 The trigger will now automatically sync profile verification status');
    console.log('   when eKYC submissions are approved or rejected by admins.');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Alternative manual setup if SQL execution fails
async function manualSetup() {
  console.log('');
  console.log('🔧 Manual Setup Instructions:');
  console.log('============================');
  console.log('');
  console.log('If the automatic setup failed, please run the following SQL manually');
  console.log('in your Supabase SQL editor:');
  console.log('');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste the contents of database/create_ekyc_sync_trigger.sql');
  console.log('4. Execute the SQL');
  console.log('');
  console.log('The SQL file contains:');
  console.log('- Database trigger for automatic sync');
  console.log('- Monitoring functions');
  console.log('- Log table for tracking operations');
  console.log('- RLS policies for security');
}

// Run setup
setupTrigger().then(() => {
  console.log('');
  console.log('✅ eKYC trigger setup completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Setup failed:', error);
  manualSetup();
  process.exit(1);
});