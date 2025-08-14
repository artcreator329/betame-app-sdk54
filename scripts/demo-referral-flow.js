const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role for testing
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function demoReferralFlow() {
  console.log('🎯 Referral System Demo\n');

  try {
    // Step 1: Get an existing user to be the referrer
    console.log('1. Setting up referrer...');
    
    const { data: users } = await supabase
      .from('profiles')
      .select('id, full_name')
      .limit(1);

    if (!users || users.length === 0) {
      console.log('❌ No users found for demo');
      return;
    }

    const referrer = users[0];
    console.log(`✅ Referrer: ${referrer.full_name} (${referrer.id})`);

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

    console.log(`✅ Referral code: ${referralCode.referral_code}`);

    // Check initial wallet balance
    const { data: initialWallet } = await supabase
      .from('wallets')
      .select('betame_betacoins')
      .eq('user_id', referrer.id)
      .single();

    const initialBetaCoins = initialWallet ? initialWallet.betame_betacoins : 0;
    console.log(`✅ Initial BetaCoins: ${initialBetaCoins}`);

    // Step 2: Simulate a new user signup with referral code
    console.log('\n2. Simulating new user signup...');
    
    // Create a test user ID (in real app, this would be from auth.users)
    const newUserId = 'demo-user-' + Date.now();
    console.log(`✅ New user ID: ${newUserId}`);

    // Simulate referral signup
    const { data: signupResult, error: signupError } = await supabase
      .rpc('handle_referral_signup', {
        referred_user_id: newUserId,
        referral_code_param: referralCode.referral_code
      });

    if (signupError) {
      console.error('❌ Signup error:', signupError);
      return;
    }

    if (signupResult) {
      console.log('✅ Referral signup processed successfully!');
      
      // Check updated wallet balance
      const { data: updatedWallet } = await supabase
        .from('wallets')
        .select('betame_betacoins')
        .eq('user_id', referrer.id)
        .single();

      const newBetaCoins = updatedWallet ? updatedWallet.betame_betacoins : 0;
      console.log(`✅ New BetaCoins: ${newBetaCoins} (+${newBetaCoins - initialBetaCoins})`);

      // Check referral record
      const { data: referralRecord } = await supabase
        .from('referrals')
        .select('*')
        .eq('referred_user_id', newUserId)
        .single();

      if (referralRecord) {
        console.log('✅ Referral record created:');
        console.log(`   - Status: ${referralRecord.status}`);
        console.log(`   - Signup BetaCoins: ${referralRecord.signup_betacoins_awarded}`);
        console.log(`   - Total BetaCoins: ${referralRecord.total_betacoins_earned}`);
      }

      // Step 3: Simulate first job completion
      console.log('\n3. Simulating first job completion...');
      
      const { data: jobResult, error: jobError } = await supabase
        .rpc('handle_referral_first_job', {
          referred_user_id: newUserId
        });

      if (jobError) {
        console.error('❌ Job completion error:', jobError);
      } else if (jobResult) {
        console.log('✅ First job completion processed!');
        
        // Check final wallet balance
        const { data: finalWallet } = await supabase
          .from('wallets')
          .select('betame_betacoins')
          .eq('user_id', referrer.id)
          .single();

        const finalBetaCoins = finalWallet ? finalWallet.betame_betacoins : 0;
        console.log(`✅ Final BetaCoins: ${finalBetaCoins} (+${finalBetaCoins - initialBetaCoins} total)`);

        // Check updated referral record
        const { data: updatedReferral } = await supabase
          .from('referrals')
          .select('*')
          .eq('referred_user_id', newUserId)
          .single();

        if (updatedReferral) {
          console.log('✅ Updated referral record:');
          console.log(`   - Status: ${updatedReferral.status}`);
          console.log(`   - Signup BetaCoins: ${updatedReferral.signup_betacoins_awarded}`);
          console.log(`   - First job BetaCoins: ${updatedReferral.first_job_betacoins_awarded}`);
          console.log(`   - Total BetaCoins: ${updatedReferral.total_betacoins_earned}`);
        }
      }

      // Step 4: Show transaction history
      console.log('\n4. Transaction history...');
      
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', referrer.id)
        .eq('type', 'referral_bonus')
        .order('created_at', { ascending: false })
        .limit(5);

      if (transactions && transactions.length > 0) {
        console.log('✅ Recent referral transactions:');
        transactions.forEach((tx, index) => {
          console.log(`   ${index + 1}. +${tx.amount} BetaCoins - ${tx.description}`);
        });
      }

      // Cleanup: Remove demo referral record
      console.log('\n5. Cleaning up demo data...');
      
      await supabase
        .from('referrals')
        .delete()
        .eq('referred_user_id', newUserId);
      
      console.log('✅ Demo data cleaned up');

    } else {
      console.log('❌ Referral signup failed (user may already be referred)');
    }

    console.log('\n🎉 Referral flow demo completed!');
    console.log('\nSummary:');
    console.log('- User signs up with referral code → Referrer gets 15 BetaCoins');
    console.log('- Referred user completes first job → Referrer gets 25 more BetaCoins');
    console.log('- Total potential earnings per referral: 40 BetaCoins');

  } catch (error) {
    console.error('❌ Demo error:', error);
  }
}

// Run the demo
demoReferralFlow();