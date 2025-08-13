const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role for testing
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'Present' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testReferralSystem() {
  console.log('🧪 Testing Referral System...\n');

  try {
    // Test 1: Create referral codes for existing users
    console.log('1. Testing referral code creation...');
    
    // Get some existing users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .limit(3);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('No users found to test with');
      return;
    }

    console.log(`Found ${users.length} users to test with`);

    // Test referral code generation for first user
    const testUser = users[0];
    console.log(`Testing with user: ${testUser.full_name} (${testUser.id})`);

    // Check if user already has a referral code
    const { data: existingCode } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', testUser.id)
      .single();

    if (existingCode) {
      console.log(`✅ User already has referral code: ${existingCode.referral_code}`);
    } else {
      // Generate referral code
      const { data: generatedCode, error: codeError } = await supabase
        .rpc('generate_referral_code', { user_id_param: testUser.id });

      if (codeError) {
        console.error('Error generating referral code:', codeError);
        return;
      }

      // Insert the code
      const { data: insertedCode, error: insertError } = await supabase
        .from('referral_codes')
        .insert({
          user_id: testUser.id,
          referral_code: generatedCode
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting referral code:', insertError);
        return;
      }

      console.log(`✅ Generated referral code: ${insertedCode.referral_code}`);
    }

    // Test 2: Validate referral code
    console.log('\n2. Testing referral code validation...');
    
    const { data: codeToTest } = await supabase
      .from('referral_codes')
      .select('referral_code')
      .eq('user_id', testUser.id)
      .single();

    if (codeToTest) {
      const { data: validationResult } = await supabase
        .from('referral_codes')
        .select('id')
        .eq('referral_code', codeToTest.referral_code)
        .eq('is_active', true)
        .single();

      if (validationResult) {
        console.log(`✅ Referral code ${codeToTest.referral_code} is valid`);
      } else {
        console.log(`❌ Referral code ${codeToTest.referral_code} is invalid`);
      }
    }

    // Test 3: Check referral statistics
    console.log('\n3. Testing referral statistics...');
    
    const { data: referrals } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', testUser.id);

    const { data: referralCode } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', testUser.id)
      .single();

    if (referralCode) {
      const totalReferrals = referrals ? referrals.length : 0;
      const totalCreditsEarned = referrals ? referrals.reduce((sum, ref) => sum + ref.total_credits_earned, 0) : 0;
      const pendingReferrals = referrals ? referrals.filter(ref => 
        ref.status === 'pending' || ref.status === 'signup_completed'
      ).length : 0;
      const completedReferrals = referrals ? referrals.filter(ref => 
        ref.status === 'first_job_completed' || ref.status === 'completed'
      ).length : 0;

      console.log(`✅ Referral Statistics for ${testUser.full_name}:`);
      console.log(`   - Referral Code: ${referralCode.referral_code}`);
      console.log(`   - Total Referrals: ${totalReferrals}`);
      console.log(`   - Total Credits Earned: ${totalCreditsEarned}`);
      console.log(`   - Pending Referrals: ${pendingReferrals}`);
      console.log(`   - Completed Referrals: ${completedReferrals}`);
    }

    // Test 4: Test database functions
    console.log('\n4. Testing database functions...');
    
    // Test generate_referral_code function
    const { data: testCode, error: testCodeError } = await supabase
      .rpc('generate_referral_code', { user_id_param: testUser.id });

    if (testCodeError) {
      console.error('Error testing generate_referral_code function:', testCodeError);
    } else {
      console.log(`✅ generate_referral_code function works: ${testCode}`);
    }

    // Test 5: Check wallet integration
    console.log('\n5. Testing wallet integration...');
    
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', testUser.id)
      .single();

    if (wallet) {
      console.log(`✅ User wallet found:`);
      console.log(`   - Credits: ${wallet.betame_credits}`);
      console.log(`   - Stones: ${wallet.betame_stones}`);
    } else {
      console.log(`❌ No wallet found for user ${testUser.id}`);
    }

    // Test 6: Check transactions
    console.log('\n6. Testing referral transactions...');
    
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('type', 'referral_bonus')
      .order('created_at', { ascending: false })
      .limit(5);

    if (transactions && transactions.length > 0) {
      console.log(`✅ Found ${transactions.length} referral transactions:`);
      transactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.amount} credits - ${tx.description} (${new Date(tx.created_at).toLocaleDateString()})`);
      });
    } else {
      console.log(`ℹ️  No referral transactions found for user ${testUser.id}`);
    }

    console.log('\n✅ Referral system test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing referral system:', error);
  }
}

// Run the test
testReferralSystem();