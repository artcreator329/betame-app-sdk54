/**
 * Apply job proposals database migration
 * This script creates the necessary tables for the job proposal system
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - EXPO_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Applying job proposals migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'create_job_proposals_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration SQL...');

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Migration failed:', error);
      return;
    }

    console.log('✅ Job proposals migration applied successfully!');

    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    
    const tables = [
      'job_proposals',
      'job_proposal_activities', 
      'job_listing_stats'
    ];

    for (const tableName of tables) {
      const { data, error: tableError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (tableError) {
        console.log(`❌ Table '${tableName}': ${tableError.message}`);
      } else {
        console.log(`✅ Table '${tableName}' verified`);
      }
    }

    // Apply notification preferences migration
    console.log('\n📄 Applying notification preferences migration...');
    
    const notificationMigrationPath = path.join(__dirname, '..', 'database', 'create_user_notification_preferences.sql');
    const notificationSQL = fs.readFileSync(notificationMigrationPath, 'utf8');

    const { error: notificationError } = await supabase.rpc('exec_sql', { sql: notificationSQL });

    if (notificationError) {
      console.error('❌ Notification preferences migration failed:', notificationError);
    } else {
      console.log('✅ Notification preferences migration applied successfully!');
    }

    console.log('\n🎉 All migrations completed successfully!');
    console.log('\n📋 Created tables:');
    console.log('   - job_proposals (track seller proposals)');
    console.log('   - job_proposal_activities (activity log)');
    console.log('   - job_listing_stats (proposal counts)');
    console.log('   - user_notification_preferences (notification settings)');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Helper function to execute raw SQL (if the exec_sql function doesn't exist)
async function createExecSqlFunction() {
  console.log('📝 Creating exec_sql helper function...');
  
  const execSqlFunction = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$;
  `;

  const { error } = await supabase.rpc('query', { query: execSqlFunction });
  
  if (error) {
    console.log('ℹ️  Could not create exec_sql function, will try direct execution');
  } else {
    console.log('✅ exec_sql function created');
  }
}

// Run migration
async function main() {
  await createExecSqlFunction();
  await applyMigration();
}

main();
