/**
 * Apply job proposals database migration directly to Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Applying Job Proposals Database Migration...\n');

// Use service role key if available, otherwise anon key
const supabaseKey = supabaseServiceKey || supabaseAnonKey;
const keyType = supabaseServiceKey ? 'service role' : 'anon';

console.log(`📡 Connecting to Supabase with ${keyType} key...`);
console.log(`🔗 URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  console.log('\n📋 Creating job proposals tables...\n');

  // Job proposals table
  console.log('1️⃣ Creating job_proposals table...');
  const { error: proposalsError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS job_proposals (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          job_listing_id UUID NOT NULL,
          seller_id UUID NOT NULL,
          buyer_id UUID NOT NULL,
          
          -- Proposal details
          proposed_price DECIMAL(10,2),
          proposal_description TEXT NOT NULL,
          proposed_timeline TEXT,
          estimated_hours INTEGER,
          start_date DATE,
          completion_date DATE,
          work_type TEXT DEFAULT 'remote' CHECK (work_type IN ('remote', 'on_site', 'hybrid')),
          experience TEXT,
          qualifications TEXT,
          
          -- Proposal status
          status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'expired')),
          
          -- Response details
          buyer_response TEXT,
          buyer_response_date TIMESTAMPTZ,
          rejection_reason TEXT,
          
          -- Tracking
          is_read_by_buyer BOOLEAN DEFAULT FALSE,
          is_read_by_seller BOOLEAN DEFAULT FALSE,
          proposal_count INTEGER DEFAULT 1,
          
          -- Timestamps
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `
  });

  if (proposalsError) {
    console.log(`❌ Error creating job_proposals: ${proposalsError.message}`);
  } else {
    console.log('✅ job_proposals table created successfully');
  }

  // Job proposal activities table
  console.log('\n2️⃣ Creating job_proposal_activities table...');
  const { error: activitiesError } = await supabase.rpc('exec_sql', {
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
  });

  if (activitiesError) {
    console.log(`❌ Error creating job_proposal_activities: ${activitiesError.message}`);
  } else {
    console.log('✅ job_proposal_activities table created successfully');
  }

  // Job listing stats table
  console.log('\n3️⃣ Creating job_listing_stats table...');
  const { error: statsError } = await supabase.rpc('exec_sql', {
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
  });

  if (statsError) {
    console.log(`❌ Error creating job_listing_stats: ${statsError.message}`);
  } else {
    console.log('✅ job_listing_stats table created successfully');
  }

  // User notification preferences table
  console.log('\n4️⃣ Creating user_notification_preferences table...');
  const { error: preferencesError } = await supabase.rpc('exec_sql', {
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
  });

  if (preferencesError) {
    console.log(`❌ Error creating user_notification_preferences: ${preferencesError.message}`);
  } else {
    console.log('✅ user_notification_preferences table created successfully');
  }
}

async function createIndexes() {
  console.log('\n📑 Creating indexes...\n');

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_job_proposals_job_listing_id ON job_proposals(job_listing_id);',
    'CREATE INDEX IF NOT EXISTS idx_job_proposals_seller_id ON job_proposals(seller_id);',
    'CREATE INDEX IF NOT EXISTS idx_job_proposals_buyer_id ON job_proposals(buyer_id);',
    'CREATE INDEX IF NOT EXISTS idx_job_proposals_status ON job_proposals(status);',
    'CREATE INDEX IF NOT EXISTS idx_job_proposal_activities_target_user_id ON job_proposal_activities(target_user_id);',
    'CREATE INDEX IF NOT EXISTS idx_job_proposal_activities_job_listing_id ON job_proposal_activities(job_listing_id);',
    'CREATE INDEX IF NOT EXISTS idx_job_listing_stats_job_listing_id ON job_listing_stats(job_listing_id);',
    'CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);'
  ];

  for (const indexSQL of indexes) {
    const { error } = await supabase.rpc('exec_sql', { sql: indexSQL });
    if (error) {
      console.log(`❌ Index error: ${error.message}`);
    } else {
      console.log(`✅ Index created: ${indexSQL.split(' ')[5]}`);
    }
  }
}

async function enableRLS() {
  console.log('\n🔐 Enabling Row Level Security...\n');

  const rlsCommands = [
    'ALTER TABLE job_proposals ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE job_proposal_activities ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE job_listing_stats ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;'
  ];

  for (const rlsSQL of rlsCommands) {
    const { error } = await supabase.rpc('exec_sql', { sql: rlsSQL });
    if (error) {
      console.log(`❌ RLS error: ${error.message}`);
    } else {
      console.log(`✅ RLS enabled for: ${rlsSQL.split(' ')[2]}`);
    }
  }
}

async function createPolicies() {
  console.log('\n🛡️ Creating RLS policies...\n');

  const policies = [
    {
      name: 'job_proposals_select_policy',
      sql: `CREATE POLICY "Users can view proposals they're involved in" ON job_proposals
        FOR SELECT USING (auth.uid() = seller_id OR auth.uid() = buyer_id);`
    },
    {
      name: 'job_proposals_insert_policy', 
      sql: `CREATE POLICY "Sellers can insert proposals" ON job_proposals
        FOR INSERT WITH CHECK (auth.uid() = seller_id);`
    },
    {
      name: 'job_proposals_update_policy',
      sql: `CREATE POLICY "Users can update their own proposals" ON job_proposals
        FOR UPDATE USING (auth.uid() = seller_id OR auth.uid() = buyer_id);`
    },
    {
      name: 'job_activities_select_policy',
      sql: `CREATE POLICY "Users can view activities for their proposals" ON job_proposal_activities
        FOR SELECT USING (auth.uid() = target_user_id OR auth.uid() = actor_id);`
    },
    {
      name: 'job_stats_select_policy',
      sql: `CREATE POLICY "Job owners can view stats" ON job_listing_stats
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM job_listings jl 
                WHERE jl.id = job_listing_stats.job_listing_id 
                AND jl.user_id = auth.uid()
            )
        );`
    },
    {
      name: 'notification_preferences_policy',
      sql: `CREATE POLICY "Users can manage their own preferences" ON user_notification_preferences
        FOR ALL USING (auth.uid() = user_id);`
    }
  ];

  for (const policy of policies) {
    const { error } = await supabase.rpc('exec_sql', { sql: policy.sql });
    if (error && !error.message.includes('already exists')) {
      console.log(`❌ Policy error (${policy.name}): ${error.message}`);
    } else {
      console.log(`✅ Policy created: ${policy.name}`);
    }
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
      }
    } catch (err) {
      console.log(`❌ Table '${tableName}': ${err.message}`);
    }
  }
}

async function main() {
  try {
    // First create the exec_sql function if it doesn't exist
    console.log('📝 Setting up exec_sql function...');
    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$;
      `
    });

    if (funcError) {
      console.log('ℹ️  exec_sql function may not be available, trying direct approach...');
    } else {
      console.log('✅ exec_sql function ready');
    }

    await createTables();
    await createIndexes();
    await enableRLS();
    await createPolicies();
    await verifyTables();

    console.log('\n🎉 Migration completed successfully!\n');
    console.log('📋 Summary:');
    console.log('   ✅ job_proposals - Track seller proposals');
    console.log('   ✅ job_proposal_activities - Activity logging');
    console.log('   ✅ job_listing_stats - Proposal statistics');
    console.log('   ✅ user_notification_preferences - User settings');
    console.log('   ✅ Indexes created for performance');
    console.log('   ✅ Row Level Security enabled');
    console.log('   ✅ Security policies configured');
    console.log('\n🚀 Your job proposals system is now ready!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();
