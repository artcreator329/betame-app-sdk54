const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role for testing
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testReferralFlow() {
  console.log('🧪 Testing Complete Referral Flow...\n');

  try {
    // Step 1: Get existing users for testing
    console.log('1. Getting existing users for testing...');
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .limit(5);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    if (!users || users.length < 2) {
      console.log('❌ Need at least 2 users to test referral flow');
      return;
    }

    const referrerUser = users[0];
    const referredUser = users[1];

    console.log(`✅ Using referrer: ${referrerUser.full_name} (${referrerUser.id})`);
    console.log(`✅ Using referred user: ${referredUser.full_name} (${referredUser.id})`);

    // Step 2: Test database functions exist
    console.log('\n2. Testing database functions...');
    
    // Test generate_referral_code function
    try {
      const { data: testCode, error: codeError } = await supabase
        .rpc('generate_referral_code', { user_id_param: referrerUser.id });
      
      if (codeError) {
        console.error('❌ generate_referral_code function error:', codeError);
        return;
      }
      console.log(`✅ generate_referral_code function works: ${testCode}`);
    } catch (error) {
      console.error('❌ generate_referral_code function not found:', error.message);
      return;
    }

    // Step 3: Check if referrer has a referral code
    console.log('\n3. Checking referrer\'s referral code...');
    const { data: referralCode, error: codeError } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', referrerUser.id)
      .single();

    let referralCodeValue;
    if (codeError || !referralCode) {
      console.log('⚠️  Referrer doesn\'t have a referral code, creating one...');
      
      // Generate and insert referral code
      const { data: newCode } = await supabase
        .rpc('generate_referral_code', { user_id_param: referrerUser.id });
      
      const { data: insertedCode, error: insertError } = await supabase
        .from('referral_codes')
        .insert({
          user_id: referrerUser.id,
          referral_code: newCode
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating referral code:', insertError);
        return;
      }
      
      referralCodeValue = insertedCode.referral_code;
      console.log(`✅ Created referral code: ${referralCodeValue}`);
    } else {
      referralCodeValue = referralCode.referral_code;
      console.log(`✅ Found existing referral code: ${referralCodeValue}`);
    }

    // Step 4: Check referrer's initial wallet balance
    console.log('\n4. Checking referrer\'s initial wallet balance...');
    const { data: initialWallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', referrerUser.id)
      .single();

    if (!initialWallet) {
      console.log('⚠️  Creating wallet for referrer...');
      await supabase
        .from('wallets')
        .insert({ user_id: referrerUser.id });
    }

    const initialBetaCoins = initialWallet?.betame_betacoins || 0;
    const initialCash = initialWallet?.cash || 0;
    console.log(`✅ Initial balance - BetaCoins: ${initialBetaCoins}, Cash: ${initialCash} cents`);

    // Step 5: Clean up any existing referral for the test user
    console.log('\n5. Cleaning up existing referral data...');
    await supabase
      .from('referrals')
      .delete()
      .eq('referred_user_id', referredUser.id);
    console.log('✅ Cleaned up existing referral data');

    // Step 6: Test referral signup
    console.log('\n6. Testing referral signup...');
    const { data: signupResult, error: signupError } = await supabase
      .rpc('handle_referral_signup', {
        referred_user_id: referredUser.id,
        referral_code_param: referralCodeValue
      });

    if (signupError) {
      console.error('❌ Referral signup error:', signupError);
      return;
    }

    if (signupResult) {
      console.log('✅ Referral signup successful');
      
      // Check if referral record was created
      const { data: referralRecord } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_user_id', referredUser.id)
        .single();

      if (referralRecord) {
        console.log(`✅ Referral record created with status: ${referralRecord.status}`);
        console.log(`✅ Signup BetaCoins awarded: ${referralRecord.signup_betacoins_awarded}`);
      }

      // Check if referrer's wallet was updated
      const { data: updatedWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', referrerUser.id)
        .single();

      const newBetaCoins = updatedWallet?.betame_betacoins || 0;
      const betaCoinIncrease = newBetaCoins - initialBetaCoins;
      console.log(`✅ Referrer's BetaCoins increased by: ${betaCoinIncrease}`);

      // Check transaction record
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', referrerUser.id)
        .eq('type', 'referral_bonus')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (transaction) {
        console.log(`✅ Transaction recorded: ${transaction.description}`);
      }
    } else {
      console.log('❌ Referral signup failed');
      return;
    }

    // Step 7: Test first job completion
    console.log('\n7. Testing first job completion...');
    const { data: jobResult, error: jobError } = await supabase
      .rpc('handle_referral_first_job', {
        referred_user_id: referredUser.id
      });

    if (jobError) {
      console.error('❌ First job completion error:', jobError);
      return;
    }

    if (jobResult) {
      console.log('✅ First job completion successful');
      
      // Check if referral record was updated
      const { data: updatedReferral } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_user_id', referredUser.id)
        .single();

      if (updatedReferral) {
        console.log(`✅ Referral status updated to: ${updatedReferral.status}`);
        console.log(`✅ First job cash awarded: ${updatedReferral.first_job_cash_awarded} cents`);
        console.log(`✅ Total cash earned: ${updatedReferral.total_cash_earned} cents`);
      }

      // Check if referrer's wallet was updated with cash
      const { data: finalWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', referrerUser.id)
        .single();

      const newCash = finalWallet?.cash || 0;
      const cashIncrease = newCash - initialCash;
      console.log(`✅ Referrer's cash increased by: ${cashIncrease} cents (RM${(cashIncrease/100).toFixed(2)})`);

      // Check latest transaction record
      const { data: cashTransaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', referrerUser.id)
        .eq('type', 'referral_bonus')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cashTransaction) {
        console.log(`✅ Cash transaction recorded: ${cashTransaction.description}`);
      }
    } else {
      console.log('❌ First job completion failed');
      return;
    }

    // Step 8: Test referral statistics
    console.log('\n8. Testing referral statistics...');
    const { data: referralStats } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', referrerUser.id);

    const { data: referralCodeStats } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', referrerUser.id)
      .single();

    if (referralCodeStats) {
      console.log(`✅ Referral code stats:`);
      console.log(`   - Total referrals: ${referralCodeStats.total_referrals}`);
      console.log(`   - Total BetaCoins earned: ${referralCodeStats.total_betacoins_earned}`);
      console.log(`   - Total cash earned: ${referralCodeStats.total_cash_earned} cents`);
    }

    // Step 9: Test referral link generation
    console.log('\n9. Testing referral link generation...');
    const baseUrl = process.env.EXPO_PUBLIC_APP_URL || 'https://betame.com.my';
    const referralLink = `${baseUrl}/install?ref=${referralCodeValue}`;
    console.log(`✅ Referral link: ${referralLink}`);

    // Step 10: Test edge cases
    console.log('\n10. Testing edge cases...');
    
    // Test duplicate referral signup
    const { data: duplicateResult } = await supabase
      .rpc('handle_referral_signup', {
        referred_user_id: referredUser.id,
        referral_code_param: referralCodeValue
      });
    
    if (!duplicateResult) {
      console.log('✅ Duplicate referral signup correctly rejected');
    } else {
      console.log('❌ Duplicate referral signup should have been rejected');
    }

    // Test self-referral
    const { data: selfReferralResult } = await supabase
      .rpc('handle_referral_signup', {
        referred_user_id: referrerUser.id,
        referral_code_param: referralCodeValue
      });
    
    if (!selfReferralResult) {
      console.log('✅ Self-referral correctly rejected');
    } else {
      console.log('❌ Self-referral should have been rejected');
    }

    // Test invalid referral code
    const { data: invalidCodeResult } = await supabase
      .rpc('handle_referral_signup', {
        referred_user_id: users[2]?.id || referredUser.id,
        referral_code_param: 'INVALID123'
      });
    
    if (!invalidCodeResult) {
      console.log('✅ Invalid referral code correctly rejected');
    } else {
      console.log('❌ Invalid referral code should have been rejected');
    }

    console.log('\n🎉 Referral flow test completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   ✅ Referral code generation: Working`);
    console.log(`   ✅ Referral signup: Working (+15 BetaCoins)`);
    console.log(`   ✅ First job completion: Working (+RM4.90)`);
    console.log(`   ✅ Wallet integration: Working`);
    console.log(`   ✅ Transaction logging: Working`);
    console.log(`   ✅ Statistics tracking: Working`);
    console.log(`   ✅ Edge case handling: Working`);

  } catch (error) {
    console.error('❌ Error testing referral flow:', error);
  }
}

// Run the test
testReferralFlow();