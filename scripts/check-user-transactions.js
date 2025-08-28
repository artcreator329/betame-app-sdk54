/**
 * Check User Transactions Script
 * 
 * This script checks the actual transaction data for chris.wenfeng@gmail.com
 * and identifies why the transaction history isn't showing real transactions.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserTransactions() {
  console.log('🔍 Checking transactions for chris.wenfeng@gmail.com...\n');

  try {
    // Step 1: Find the user by querying profiles table
    console.log('1️⃣ Finding user...');
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at')
      .eq('email', 'chris.wenfeng@gmail.com')
      .single();

    if (userError) {
      console.error('❌ Error finding user:', userError);
      return;
    }

    if (!userProfile) {
      console.log('❌ User not found in profiles table');
      return;
    }

    console.log('✅ User found:', userProfile.id);
    console.log('📧 Email:', userProfile.email);
    console.log('👤 Name:', userProfile.full_name);
    console.log('📅 Created:', userProfile.created_at);

    // Step 2: Check wallet
    console.log('\n2️⃣ Checking wallet...');
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userProfile.id)
      .single();

    if (walletError) {
      console.error('❌ Error fetching wallet:', walletError);
    } else if (wallet) {
      console.log('✅ Wallet found:');
      console.log('   - BetaCoins:', wallet.betame_betacoins);
      console.log('   - Diamonds:', wallet.betame_diamonds);
      console.log('   - Cash:', wallet.cash);
      console.log('   - Created:', wallet.created_at);
    } else {
      console.log('❌ No wallet found');
    }

    // Step 3: Check transactions table
    console.log('\n3️⃣ Checking transactions table...');
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false });

    if (transactionsError) {
      console.error('❌ Error fetching transactions:', transactionsError);
    } else {
      console.log(`✅ Found ${transactions.length} transactions:`);
      transactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.type}: ${tx.amount} - ${tx.description}`);
        console.log(`      Created: ${tx.created_at}`);
      });
    }

    // Step 4: Check payment_transactions table
    console.log('\n4️⃣ Checking payment_transactions table...');
    const { data: paymentTransactions, error: paymentError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false });

    if (paymentError) {
      console.error('❌ Error fetching payment transactions:', paymentError);
    } else {
      console.log(`✅ Found ${paymentTransactions.length} payment transactions:`);
      paymentTransactions.forEach((ptx, index) => {
        console.log(`   ${index + 1}. ${ptx.payment_type}: RM${(ptx.amount / 100).toFixed(2)} - ${ptx.status}`);
        console.log(`      Created: ${ptx.created_at}`);
        if (ptx.gateway_response) {
          console.log(`      Gateway: ${JSON.stringify(ptx.gateway_response).substring(0, 100)}...`);
        }
      });
    }

    // Step 5: Check if there are any recent BetaCoin purchases
    console.log('\n5️⃣ Checking for recent BetaCoin purchases...');
    const recentDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const { data: recentTransactions, error: recentError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userProfile.id)
      .eq('type', 'betacoin_purchase')
      .gte('created_at', recentDate.toISOString())
      .order('created_at', { ascending: false });

    if (recentError) {
      console.error('❌ Error fetching recent transactions:', recentError);
    } else {
      console.log(`✅ Found ${recentTransactions.length} recent BetaCoin purchases:`);
      recentTransactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. Amount: ${tx.amount} BetaCoins`);
        console.log(`      Description: ${tx.description}`);
        console.log(`      Created: ${tx.created_at}`);
      });
    }

    // Step 6: Check if there are any completed payment transactions
    console.log('\n6️⃣ Checking for completed payment transactions...');
    const { data: completedPayments, error: completedError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', userProfile.id)
      .eq('status', 'completed')
      .eq('payment_type', 'betacoin_purchase')
      .order('created_at', { ascending: false });

    if (completedError) {
      console.error('❌ Error fetching completed payments:', completedError);
    } else {
      console.log(`✅ Found ${completedPayments.length} completed BetaCoin purchases:`);
      completedPayments.forEach((ptx, index) => {
        console.log(`   ${index + 1}. Amount: RM${(ptx.amount / 100).toFixed(2)}`);
        console.log(`      Created: ${ptx.created_at}`);
        console.log(`      Payment ID: ${ptx.curlec_payment_id || 'N/A'}`);
      });
    }

    // Step 7: Check if transactions are being created for completed payments
    console.log('\n7️⃣ Checking if wallet transactions are created for completed payments...');
    if (completedPayments && completedPayments.length > 0) {
      for (const payment of completedPayments) {
        const { data: correspondingTx, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userProfile.id)
          .eq('type', 'betacoin_purchase')
          .gte('created_at', new Date(payment.created_at).toISOString())
          .lte('created_at', new Date(new Date(payment.created_at).getTime() + 5 * 60 * 1000).toISOString()); // Within 5 minutes

        if (txError) {
          console.error('❌ Error checking corresponding transaction:', txError);
        } else {
          console.log(`   Payment ${payment.id}: ${correspondingTx.length > 0 ? '✅' : '❌'} Corresponding transaction found`);
          if (correspondingTx.length > 0) {
            console.log(`      Transaction: ${correspondingTx[0].amount} BetaCoins - ${correspondingTx[0].description}`);
          }
        }
      }
    }

    console.log('\n🎯 Summary:');
    console.log(`   - User ID: ${userProfile.id}`);
    console.log(`   - Wallet transactions: ${transactions?.length || 0}`);
    console.log(`   - Payment transactions: ${paymentTransactions?.length || 0}`);
    console.log(`   - Recent BetaCoin purchases: ${recentTransactions?.length || 0}`);
    console.log(`   - Completed payments: ${completedPayments?.length || 0}`);

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the script
checkUserTransactions()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
