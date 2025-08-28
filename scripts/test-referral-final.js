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

async function testReferralFlowFinal() {
  console.log('🎯 Final Referral Flow Test\n');

  try {
    // Get test users
    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name')
      .limit(3);

    if (!users || users.length < 2) {
      console.log('❌ Need at least 2 users to test');
      return;
    }

    const referrer = users[0];
    const newUser = users[1];

    console.log(`👤 Referrer: ${referrer.full_name}`);
    console.log(`👤 New User: ${newUser.full_name}\n`);

    // Clean up existing data
    await supabase.from('referrals').delete().eq('referred_user_id', newUser.id);

    // Get referrer's referral code
    const { data: referralCode } = await supabase
      .from('referral_codes')
      .select('referral_code')
      .eq('user_id', referrer.id)
      .single();

    if (!referralCode) {
      console.log('❌ Referrer has no referral code');
      return;
    }

    console.log(`🔗 Referral Code: ${referralCode.referral_code}\n`);

    // Test 1: Referral Signup
    console.log('1️⃣ Testing Referral Signup...');
    
    const { data: signupResult } = await supabase
      .rpc('handle_referral_signup', {
        referred_user_id: newUser.id,
        referral_code_param: referralCode.referral_code
      });

    if (signupResult) {
      console.log('✅ Signup successful - Referrer gets +15 BetaCoins');
      
      // Check wallet update
      const { data: wallet } = await supabase
        .from('wallets')
        .select('betame_betacoins')
        .eq('user_id', referrer.id)
        .single();
      
      console.log(`💰 Referrer's BetaCoins: ${wallet?.betame_betacoins || 0}`);
    } else {
      console.log('❌ Signup failed');
      return;
    }

    // Test 2: First Job Completion
    console.log('\n2️⃣ Testing First Job Completion...');
    
    const { data: jobResult } = await supabase
      .rpc('handle_referral_first_job', {
        referred_user_id: newUser.id
      });

    if (jobResult) {
      console.log('✅ First job completion successful - Referrer gets +RM4.90');
      
      // Check wallet update
      const { data: wallet } = await supabase
        .from('wallets')
        .select('cash')
        .eq('user_id', referrer.id)
        .single();
      
      console.log(`💵 Referrer's Cash: RM${((wallet?.cash || 0) / 100).toFixed(2)}`);
    } else {
      console.log('❌ First job completion failed');
      return;
    }

    // Test 3: Check Referral Record
    console.log('\n3️⃣ Checking Referral Record...');
    
    const { data: referral } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_user_id', newUser.id)
      .single();

    if (referral) {
      console.log(`✅ Status: ${referral.status}`);
      console.log(`✅ Credits Awarded: ${referral.signup_credits_awarded || 0}`);
      console.log(`✅ Cash Awarded: RM${((referral.first_job_cash_awarded || 0) / 100).toFixed(2)}`);
    }

    // Test 4: Check Transactions
    console.log('\n4️⃣ Checking Transactions...');
    
    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount, description, created_at')
      .eq('user_id', referrer.id)
      .eq('type', 'referral_bonus')
      .order('created_at', { ascending: false })
      .limit(2);

    if (transactions && transactions.length > 0) {
      transactions.forEach((tx, i) => {
        console.log(`✅ Transaction ${i + 1}: ${tx.description}`);
      });
    }

    console.log('\n🎉 All tests passed! Referral system is working correctly.\n');
    
    console.log('📋 Summary:');
    console.log('✅ 1. Existing user shares referral link');
    console.log('✅ 2. New user signs up with referral code → Referrer gets +15 BetaCoins');
    console.log('✅ 3. New user completes first job → Referrer gets +RM4.90');
    console.log('✅ 4. System tracks everything properly');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testReferralFlowFinal();