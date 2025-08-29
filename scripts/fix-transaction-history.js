/**
 * Fix Transaction History Script
 * 
 * This script ensures the transaction history displays correctly
 * and shows all real transactions for chris.wenfeng@gmail.com
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixTransactionHistory() {
  console.log('🔧 Fixing transaction history for chris.wenfeng@gmail.com...\n');

  try {
    // Step 1: Find the user
    console.log('1️⃣ Finding user...');
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at')
      .eq('email', 'chris.wenfeng@gmail.com')
      .single();

    if (userError || !userProfile) {
      console.error('❌ User not found:', userError);
      return;
    }

    console.log('✅ User found:', userProfile.id);

    // Step 2: Check current transactions
    console.log('\n2️⃣ Checking current transactions...');
    const { data: currentTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false });

    if (txError) {
      console.error('❌ Error fetching transactions:', txError);
      return;
    }

    console.log(`✅ Found ${currentTransactions.length} current transactions:`);
    currentTransactions.forEach((tx, index) => {
      console.log(`   ${index + 1}. ${tx.type}: ${tx.amount} - ${tx.description}`);
      console.log(`      Created: ${tx.created_at}`);
      console.log(`      ID: ${tx.id}`);
    });

    // Step 3: Check payment transactions
    console.log('\n3️⃣ Checking payment transactions...');
    const { data: paymentTransactions, error: ptError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false });

    if (ptError) {
      console.error('❌ Error fetching payment transactions:', ptError);
      return;
    }

    console.log(`✅ Found ${paymentTransactions.length} payment transactions:`);
    paymentTransactions.forEach((ptx, index) => {
      console.log(`   ${index + 1}. ${ptx.payment_type}: RM${(ptx.amount / 100).toFixed(2)} - ${ptx.status}`);
      console.log(`      Created: ${ptx.created_at}`);
      console.log(`      ID: ${ptx.id}`);
    });

    // Step 4: Check if there are any missing transactions
    console.log('\n4️⃣ Checking for missing transactions...');
    const completedPayments = paymentTransactions.filter(ptx => ptx.status === 'completed');
    
    for (const payment of completedPayments) {
      const { data: correspondingTx, error: checkError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userProfile.id)
        .eq('type', 'betacoin_purchase')
        .gte('created_at', new Date(payment.created_at).toISOString())
        .lte('created_at', new Date(new Date(payment.created_at).getTime() + 5 * 60 * 1000).toISOString());

      if (checkError) {
        console.error('❌ Error checking corresponding transaction:', checkError);
        continue;
      }

      if (correspondingTx.length === 0) {
        console.log(`❌ Missing transaction for payment ${payment.id}`);
        
        // Calculate BetaCoin amount based on payment amount
        let betaCoinAmount = 0;
        if (payment.amount === 500) { // RM5.00
          betaCoinAmount = 5;
        } else if (payment.amount === 2000) { // RM20.00
          betaCoinAmount = 20;
        } else if (payment.amount === 3500) { // RM35.00
          betaCoinAmount = 35;
        } else if (payment.amount === 8000) { // RM80.00
          betaCoinAmount = 80;
        } else if (payment.amount === 10000) { // RM100.00
          betaCoinAmount = 100;
        } else if (payment.amount === 18000) { // RM180.00
          betaCoinAmount = 180;
        }

        if (betaCoinAmount > 0) {
          console.log(`🔧 Creating missing transaction for ${betaCoinAmount} BetaCoins...`);
          
          const { data: newTx, error: createError } = await supabase
            .from('transactions')
            .insert({
              user_id: userProfile.id,
              type: 'betacoin_purchase',
              amount: betaCoinAmount,
              description: `BetaCoin Purchase - RM${(payment.amount / 100).toFixed(2)} (${betaCoinAmount} BetaCoins)`,
              created_at: payment.created_at
            })
            .select()
            .single();

          if (createError) {
            console.error('❌ Error creating missing transaction:', createError);
          } else {
            console.log('✅ Created missing transaction:', newTx.id);
          }
        }
      } else {
        console.log(`✅ Transaction exists for payment ${payment.id}`);
      }
    }

    // Step 5: Verify wallet balance matches transactions
    console.log('\n5️⃣ Verifying wallet balance...');
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userProfile.id)
      .single();

    if (walletError) {
      console.error('❌ Error fetching wallet:', walletError);
    } else {
      console.log('✅ Current wallet balance:');
      console.log(`   - BetaCoins: ${wallet.betame_betacoins}`);
      console.log(`   - Diamonds: ${wallet.betame_diamonds}`);
      console.log(`   - Cash: ${wallet.cash}`);

      // Calculate expected BetaCoins from transactions
      const betaCoinTransactions = currentTransactions.filter(tx => tx.type === 'betacoin_purchase');
      const totalBetaCoinsFromTransactions = betaCoinTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      
      console.log(`   - Expected BetaCoins from transactions: ${totalBetaCoinsFromTransactions}`);
      
      if (wallet.betame_betacoins !== totalBetaCoinsFromTransactions) {
        console.log('⚠️  Wallet balance mismatch detected!');
        console.log(`   - Wallet shows: ${wallet.betame_betacoins} BetaCoins`);
        console.log(`   - Transactions total: ${totalBetaCoinsFromTransactions} BetaCoins`);
      } else {
        console.log('✅ Wallet balance matches transaction total');
      }
    }

    // Step 6: Final transaction count
    console.log('\n6️⃣ Final transaction summary...');
    const { data: finalTransactions, error: finalError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false });

    if (finalError) {
      console.error('❌ Error fetching final transactions:', finalError);
    } else {
      console.log(`✅ Final transaction count: ${finalTransactions.length}`);
      finalTransactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.type}: ${tx.amount} - ${tx.description}`);
        console.log(`      Created: ${tx.created_at}`);
      });
    }

    console.log('\n🎯 Transaction History Fix Summary:');
    console.log(`   - User: ${userProfile.email} (${userProfile.full_name})`);
    console.log(`   - User ID: ${userProfile.id}`);
    console.log(`   - Total transactions: ${finalTransactions?.length || 0}`);
    console.log(`   - Payment transactions: ${paymentTransactions?.length || 0}`);
    console.log(`   - Completed payments: ${completedPayments?.length || 0}`);
    console.log(`   - Wallet BetaCoins: ${wallet?.betame_betacoins || 0}`);

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the script
fixTransactionHistory()
  .then(() => {
    console.log('\n✅ Transaction history fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


