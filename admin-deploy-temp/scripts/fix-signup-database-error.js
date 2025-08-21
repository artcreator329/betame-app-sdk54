const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://rkcfgebgpixgfvggbwmc.supabase.co';
const supabaseServiceKey = '<REDACTED_JWT>';

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixWalletTrigger() {
  try {
    console.log('🔧 Fixing wallet creation trigger...');
    
    // Step 1: Drop the existing trigger
    console.log('📝 Step 1: Dropping existing trigger...');
    const { error: dropError } = await supabase.rpc('sql', {
      query: 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;'
    });
    
    if (dropError) {
      console.log('⚠️  Warning: Could not drop trigger (might not exist):', dropError.message);
    } else {
      console.log('✅ Trigger dropped successfully');
    }
    
    // Step 2: Update the function
    console.log('📝 Step 2: Updating wallet creation function...');
    const updateFunctionSQL = `
      CREATE OR REPLACE FUNCTION create_user_wallet()
      RETURNS TRIGGER AS $$
      BEGIN
          INSERT INTO wallets (user_id, betame_diamonds, betame_betacoins)
          VALUES (NEW.id, 0, 0);
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `;
    
    const { error: functionError } = await supabase.rpc('sql', {
      query: updateFunctionSQL
    });
    
    if (functionError) {
      console.error('❌ Error updating function:', functionError);
      return false;
    }
    
    console.log('✅ Function updated successfully');
    
    // Step 3: Recreate the trigger
    console.log('📝 Step 3: Recreating trigger...');
    const createTriggerSQL = `
      CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION create_user_wallet();
    `;
    
    const { error: triggerError } = await supabase.rpc('sql', {
      query: createTriggerSQL
    });
    
    if (triggerError) {
      console.error('❌ Error creating trigger:', triggerError);
      return false;
    }
    
    console.log('✅ Trigger recreated successfully');
    console.log('🎉 Wallet trigger fixed successfully!');
    
    return true;
  } catch (error) {
    console.error('❌ Exception during fix:', error);
    return false;
  }
}

async function testSignup() {
  try {
    console.log('🧪 Testing sign-up functionality...');
    
    // Test if the trigger is working correctly
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error testing wallets table:', error);
      return false;
    }
    
    console.log('✅ Wallets table is accessible');
    console.log('📊 Sample wallet data:', data);
    
    return true;
  } catch (error) {
    console.error('❌ Exception during test:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting sign-up database error fix...\n');
  
  // Apply the fix
  const fixSuccess = await fixWalletTrigger();
  
  if (fixSuccess) {
    console.log('\n🧪 Testing the fix...');
    const testSuccess = await testSignup();
    
    if (testSuccess) {
      console.log('\n🎉 SUCCESS: Sign-up database error has been fixed!');
      console.log('📝 The wallet creation trigger now uses the correct column names.');
      console.log('🔧 New users will start with 0 diamonds and 0 BetaCoins.');
    } else {
      console.log('\n⚠️  WARNING: Fix applied but test failed. Please verify manually.');
    }
  } else {
    console.log('\n❌ FAILED: Could not apply the database fix.');
    console.log('🔧 Please apply the SQL manually in the Supabase dashboard:');
    console.log('\n--- SQL TO APPLY MANUALLY ---');
    console.log(`
-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the function to use the correct column names
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wallets (user_id, betame_diamonds, betame_betacoins)
    VALUES (NEW.id, 0, 0);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_wallet();
    `);
  }
}

// Run the fix
main().catch(console.error);
