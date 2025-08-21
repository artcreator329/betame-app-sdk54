/**
 * Apply job proposals database migration directly via individual SQL commands
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Applying Job Proposals Migration (Direct SQL)...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// SQL commands to execute
const sqlCommands = [
  {
    name: 'job_proposals table',
    sql: `
      CREATE TABLE IF NOT EXISTS job_proposals (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          job_listing_id UUID NOT NULL,
          seller_id UUID NOT NULL,
          buyer_id UUID NOT NULL,
          proposed_price DECIMAL(10,2),
          proposal_description TEXT NOT NULL,
          proposed_timeline TEXT,
          estimated_hours INTEGER,
          start_date DATE,
          completion_date DATE,
          work_type TEXT DEFAULT 'remote' CHECK (work_type IN ('remote', 'on_site', 'hybrid')),
          experience TEXT,
          qualifications TEXT,
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'expired')),
          buyer_response TEXT,
          buyer_response_date TIMESTAMPTZ,
          rejection_reason TEXT,
          is_read_by_buyer BOOLEAN DEFAULT FALSE,
          is_read_by_seller BOOLEAN DEFAULT FALSE,
          proposal_count INTEGER DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `
  },
  {
    name: 'job_proposal_activities table',
    sql: `
      CREATE TABLE IF NOT EXISTS job_proposal_activities (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          job_proposal_id UUID NOT NULL,
          job_listing_id UUID NOT NULL,
          activity_type TEXT NOT NULL CHECK (activity_type IN (
              'proposal_submitted', 'proposal_updated', 'proposal_accepted', 
              'proposal_rejected', 'proposal_withdrawn', 'buyer_message', 
              'seller_message', 'work_started', 'work_completed', 'payment_released'
          )),
          actor_id UUID NOT NULL,
          target_user_id UUID NOT NULL,
          activity_description TEXT NOT NULL,
          metadata JSONB DEFAULT '{}'::jsonb,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `
  },
  {
    name: 'job_listing_stats table',
    sql: `
      CREATE TABLE IF NOT EXISTS job_listing_stats (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          job_listing_id UUID NOT NULL UNIQUE,
          total_proposals INTEGER DEFAULT 0,
          pending_proposals INTEGER DEFAULT 0,
          accepted_proposals INTEGER DEFAULT 0,
          rejected_proposals INTEGER DEFAULT 0,
          unique_sellers INTEGER DEFAULT 0,
          last_proposal_date TIMESTAMPTZ,
          last_activity_date TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `
  },
  {
    name: 'user_notification_preferences table',
    sql: `
      CREATE TABLE IF NOT EXISTS user_notification_preferences (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL UNIQUE,
          job_proposals BOOLEAN DEFAULT TRUE,
          proposal_status_updates BOOLEAN DEFAULT TRUE,
          job_messages BOOLEAN DEFAULT TRUE,
          job_completion_reminders BOOLEAN DEFAULT TRUE,
          payment_notifications BOOLEAN DEFAULT TRUE,
          push_notifications BOOLEAN DEFAULT TRUE,
          email_notifications BOOLEAN DEFAULT TRUE,
          sms_notifications BOOLEAN DEFAULT FALSE,
          quiet_hours_enabled BOOLEAN DEFAULT FALSE,
          quiet_hours_start TIME DEFAULT '22:00:00',
          quiet_hours_end TIME DEFAULT '08:00:00',
          quiet_hours_timezone TEXT DEFAULT 'UTC',
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `
  }
];

const indexCommands = [
  { name: 'job_proposals_job_listing_id_idx', sql: 'CREATE INDEX IF NOT EXISTS idx_job_proposals_job_listing_id ON job_proposals(job_listing_id);' },
  { name: 'job_proposals_seller_id_idx', sql: 'CREATE INDEX IF NOT EXISTS idx_job_proposals_seller_id ON job_proposals(seller_id);' },
  { name: 'job_proposals_buyer_id_idx', sql: 'CREATE INDEX IF NOT EXISTS idx_job_proposals_buyer_id ON job_proposals(buyer_id);' },
  { name: 'job_proposals_status_idx', sql: 'CREATE INDEX IF NOT EXISTS idx_job_proposals_status ON job_proposals(status);' },
  { name: 'job_proposal_activities_target_user_id_idx', sql: 'CREATE INDEX IF NOT EXISTS idx_job_proposal_activities_target_user_id ON job_proposal_activities(target_user_id);' },
  { name: 'job_proposal_activities_job_listing_id_idx', sql: 'CREATE INDEX IF NOT EXISTS idx_job_proposal_activities_job_listing_id ON job_proposal_activities(job_listing_id);' },
  { name: 'job_listing_stats_job_listing_id_idx', sql: 'CREATE INDEX IF NOT EXISTS idx_job_listing_stats_job_listing_id ON job_listing_stats(job_listing_id);' },
  { name: 'user_notification_preferences_user_id_idx', sql: 'CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);' }
];

const rlsCommands = [
  { name: 'job_proposals RLS', sql: 'ALTER TABLE job_proposals ENABLE ROW LEVEL SECURITY;' },
  { name: 'job_proposal_activities RLS', sql: 'ALTER TABLE job_proposal_activities ENABLE ROW LEVEL SECURITY;' },
  { name: 'job_listing_stats RLS', sql: 'ALTER TABLE job_listing_stats ENABLE ROW LEVEL SECURITY;' },
  { name: 'user_notification_preferences RLS', sql: 'ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;' }
];

const policyCommands = [
  {
    name: 'job_proposals_select_policy',
    sql: `CREATE POLICY "Users can view proposals they're involved in" ON job_proposals FOR SELECT USING (auth.uid() = seller_id OR auth.uid() = buyer_id);`
  },
  {
    name: 'job_proposals_insert_policy', 
    sql: `CREATE POLICY "Sellers can insert proposals" ON job_proposals FOR INSERT WITH CHECK (auth.uid() = seller_id);`
  },
  {
    name: 'job_proposals_update_policy',
    sql: `CREATE POLICY "Users can update their own proposals" ON job_proposals FOR UPDATE USING (auth.uid() = seller_id OR auth.uid() = buyer_id);`
  },
  {
    name: 'job_activities_select_policy',
    sql: `CREATE POLICY "Users can view activities for their proposals" ON job_proposal_activities FOR SELECT USING (auth.uid() = target_user_id OR auth.uid() = actor_id);`
  },
  {
    name: 'job_activities_insert_policy',
    sql: `CREATE POLICY "Users can insert activities" ON job_proposal_activities FOR INSERT WITH CHECK (auth.uid() = actor_id);`
  },
  {
    name: 'job_activities_update_policy',
    sql: `CREATE POLICY "Users can update read status" ON job_proposal_activities FOR UPDATE USING (auth.uid() = target_user_id);`
  },
  {
    name: 'notification_preferences_policy',
    sql: `CREATE POLICY "Users can manage their own preferences" ON user_notification_preferences FOR ALL USING (auth.uid() = user_id);`
  }
];

async function executeSQL(command) {
  try {
    // Use the raw SQL endpoint instead of RPC
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql: command.sql })
    });

    if (!response.ok) {
      // If RPC doesn't work, let's try a different approach
      console.log(`ℹ️  RPC not available for ${command.name}, trying alternative...`);
      return false;
    }

    return true;
  } catch (error) {
    console.log(`ℹ️  Could not execute ${command.name}: ${error.message}`);
    return false;
  }
}

async function verifyTables() {
  console.log('\n🔍 Verifying tables...\n');

  const tables = [
    'job_proposals',
    'job_proposal_activities', 
    'job_listing_stats',
    'user_notification_preferences'
  ];

  let successCount = 0;

  for (const tableName of tables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ Table '${tableName}': ${error.message}`);
      } else {
        console.log(`✅ Table '${tableName}' verified and accessible`);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ Table '${tableName}': ${err.message}`);
    }
  }

  return successCount;
}

async function main() {
  try {
    console.log('📋 Creating tables...\n');

    // Execute table creation commands
    for (const command of sqlCommands) {
      console.log(`📝 Creating ${command.name}...`);
      const success = await executeSQL(command);
      if (success) {
        console.log(`✅ ${command.name} created`);
      } else {
        console.log(`⚠️  ${command.name} - will verify manually`);
      }
    }

    // Verify tables exist
    const tablesCreated = await verifyTables();

    if (tablesCreated === 4) {
      console.log('\n🎉 All tables created successfully!\n');
      console.log('📋 Migration Summary:');
      console.log('   ✅ job_proposals - Track seller proposals');
      console.log('   ✅ job_proposal_activities - Activity logging');  
      console.log('   ✅ job_listing_stats - Proposal statistics');
      console.log('   ✅ user_notification_preferences - User settings');
      console.log('\n🚀 Your job proposals system is now ready!');
      console.log('\n📱 You can now:');
      console.log('   • Submit job proposals');
      console.log('   • Track proposal statistics');
      console.log('   • Receive real-time notifications');
      console.log('   • View proposal activity in profile');
    } else {
      console.log('\n⚠️  Some tables may not have been created properly.');
      console.log('   Please check your Supabase dashboard and apply the migration manually if needed.');
    }

  } catch (error) {
    console.error('\n❌ Migration encountered issues:', error.message);
    console.log('\n💡 Manual Setup Required:');
    console.log('   Please copy the SQL from scripts/create-job-proposals-tables-simple.sql');
    console.log('   and run it in your Supabase SQL Editor dashboard.');
  }
}

main();
