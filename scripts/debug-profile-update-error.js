#!/usr/bin/env node

/**
 * Debug script to investigate the profile update error
 * Error: record "new" has no field "referral_code"
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugProfileUpdateError() {
  console.log('🔍 Debugging profile update error...\n');

  try {
    // 1. Check what triggers exist on auth.users table
    console.log('1. Checking triggers on auth.users table:');
    const { data: triggers, error: triggersError } = await supabase.rpc('sql', {
      query: `
        SELECT 
          t.tgname as trigger_name,
          c.relname as table_name,
          p.proname as function_name,
          t.tgenabled as enabled,
          CASE t.tgtype & 66
            WHEN 2 THEN 'BEFORE'
            WHEN 64 THEN 'INSTEAD OF'
            ELSE 'AFTER'
          END as timing,
          CASE t.tgtype & 28
            WHEN 4 THEN 'INSERT'
            WHEN 8 THEN 'DELETE'
            WHEN 16 THEN 'UPDATE'
            WHEN 12 THEN 'INSERT OR DELETE'
            WHEN 20 THEN 'INSERT OR UPDATE'
            WHEN 24 THEN 'DELETE OR UPDATE'
            WHEN 28 THEN 'INSERT OR DELETE OR UPDATE'
          END as events
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'auth' AND c.relname = 'users'
        AND NOT t.tgisinternal
        ORDER BY t.tgname;
      `
    });

    if (triggersError) {
      console.error('❌ Error checking triggers:', triggersError);
    } else if (triggers && triggers.length > 0) {
      console.log('Found triggers:');
      triggers.forEach(trigger => {
        console.log(`  - ${trigger.trigger_name} (${trigger.timing} ${trigger.events}) -> ${trigger.function_name}`);
      });
    } else {
      console.log('  No triggers found on auth.users table');
    }

    console.log('\n2. Checking auth.users table structure:');
    const { data: columns, error: columnsError } = await supabase.rpc('sql', {
      query: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'auth' AND table_name = 'users'
        ORDER BY ordinal_position;
      `
    });

    if (columnsError) {
      console.error('❌ Error checking columns:', columnsError);
    } else if (columns) {
      console.log('auth.users columns:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Check if referral_code exists
      const hasReferralCode = columns.some(col => col.column_name === 'referral_code');
      console.log(`\n  referral_code field exists: ${hasReferralCode}`);
    }

    console.log('\n3. Checking profiles table structure:');
    const { data: profileColumns, error: profileColumnsError } = await supabase.rpc('sql', {
      query: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles'
        ORDER BY ordinal_position;
      `
    });

    if (profileColumnsError) {
      console.error('❌ Error checking profile columns:', profileColumnsError);
    } else if (profileColumns) {
      console.log('profiles columns:');
      profileColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Check if referral_code exists
      const hasReferralCode = profileColumns.some(col => col.column_name === 'referral_code');
      console.log(`\n  referral_code field exists: ${hasReferralCode}`);
    }

    console.log('\n4. Testing profile update with a test user...');
    
    // Try to create a test user and update their profile
    const testEmail = `test-${Date.now()}@example.com`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'testpassword123',
      email_confirm: true
    });

    if (authError) {
      console.error('❌ Error creating test user:', authError);
      return;
    }

    console.log(`✅ Created test user: ${authData.user.id}`);

    // Try to update the user's metadata
    try {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        authData.user.id,
        {
          user_metadata: {
            full_name: 'Test User',
            avatar_url: 'https://example.com/avatar.jpg'
          }
        }
      );

      if (updateError) {
        console.error('❌ Error updating user metadata:', updateError);
        console.log('This might be the same error we\'re seeing in the app');
      } else {
        console.log('✅ Successfully updated user metadata');
      }
    } catch (error) {
      console.error('❌ Exception updating user metadata:', error);
    }

    // Clean up test user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(authData.user.id);
    if (deleteError) {
      console.error('❌ Error deleting test user:', deleteError);
    } else {
      console.log('✅ Cleaned up test user');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the debug script
debugProfileUpdateError().then(() => {
  console.log('\n🔍 Debug complete');
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});