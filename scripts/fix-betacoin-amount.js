/**
 * Fix BetaCoin Amount Script
 * 
 * This script fixes the incorrect BetaCoin amount for chris.wenfeng@gmail.com
 * RM5.00 should give 20 BetaCoins, not 5
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixBetaCoinAmount() {
  console.log('🔧 Fixing BetaCoin amount for chris.wenfeng@gmail.com...\n');

  try {
    // Step 1: Find the user
    console.log('1️⃣ Finding user...');
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', 'chris.wenfeng@gmail.com')
      .single();

    if (userError || !userProfile) {
      console.error('❌ User not found:', userError);
      return;
    }

    console.log('✅ User found:', userProfile.id);

    // Step 2: Check current wallet balance
    console.log('\n2️⃣ Checking current wallet balance...');
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userProfile.id)
      .single();

    if (walletError) {
      console.error('❌ Error fetching wallet:', walletError);
      return;
    }

    console.log('✅ Current wallet balance:');
    console.log(`   - BetaCoins: ${wallet.betame_betacoins}`);
    console.log(`   - Diamonds: ${wallet.betame_diamonds}`);
    console.log(`   - Cash: ${wallet.cash}`);

    // Step 3: Find the BetaCoin purchase transaction
    console.log('\n3️⃣ Finding BetaCoin purchase transaction...');
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userProfile.id)
      .eq('type', 'betacoin_purchase')
      .order('created_at', { ascending: false });

    if (txError) {
      console.error('❌ Error fetching transactions:', txError);
      return;
    }

    if (transactions.length === 0) {
      console.log('❌ No BetaCoin purchase transactions found');
      return;
    }

    const transaction = transactions[0];
    console.log('✅ Found BetaCoin purchase transaction:');
    console.log(`   - ID: ${transaction.id}`);
    console.log(`   - Current amount: ${transaction.amount} BetaCoins`);
    console.log(`   - Description: ${transaction.description}`);
    console.log(`   - Created: ${transaction.created_at}`);

    // Step 4: Check payment transaction metadata
    console.log('\n4️⃣ Checking payment transaction metadata...');
    const { data: paymentTransactions, error: ptError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', userProfile.id)
      .eq('payment_type', 'betacoin_purchase')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (ptError) {
      console.error('❌ Error fetching payment transactions:', ptError);
      return;
    }

    if (paymentTransactions.length === 0) {
      console.log('❌ No completed payment transactions found');
      return;
    }

    const paymentTransaction = paymentTransactions[0];
    console.log('✅ Found completed payment transaction:');
    console.log(`   - ID: ${paymentTransaction.id}`);
    console.log(`   - Amount: RM${(paymentTransaction.amount / 100).toFixed(2)}`);
    console.log(`   - Metadata:`, paymentTransaction.metadata);

    // Step 5: Calculate correct BetaCoin amount
    console.log('\n5️⃣ Calculating correct BetaCoin amount...');
    const paymentAmount = paymentTransaction.amount / 100; // Convert cents to RM
    let correctBetaCoinAmount = 0;

    // Determine correct BetaCoin amount based on payment amount
    if (paymentAmount === 5) {
      correctBetaCoinAmount = 20; // RM5 = 20 BetaCoins
    } else if (paymentAmount === 20) {
      correctBetaCoinAmount = 100; // RM20 = 100 BetaCoins
    } else if (paymentAmount === 35) {
      correctBetaCoinAmount = 250; // RM35 = 250 BetaCoins
    } else if (paymentAmount === 80) {
      correctBetaCoinAmount = 600; // RM80 = 600 BetaCoins
    } else if (paymentAmount === 100) {
      correctBetaCoinAmount = 1000; // RM100 = 1000 BetaCoins
    } else if (paymentAmount === 180) {
      correctBetaCoinAmount = 2000; // RM180 = 2000 BetaCoins
    } else {
      console.log('❌ Unknown payment amount:', paymentAmount);
      return;
    }

    console.log(`✅ Correct BetaCoin amount: ${correctBetaCoinAmount} BetaCoins for RM${paymentAmount}`);

    // Step 6: Calculate the difference
    const currentAmount = transaction.amount;
    const difference = correctBetaCoinAmount - currentAmount;

    console.log(`📊 Amount difference: ${currentAmount} → ${correctBetaCoinAmount} (+${difference})`);

    if (difference <= 0) {
      console.log('✅ No correction needed - amount is already correct');
      return;
    }

    // Step 7: Update the transaction
    console.log('\n6️⃣ Updating transaction...');
    const { data: updatedTransaction, error: updateTxError } = await supabase
      .from('transactions')
      .update({
        amount: correctBetaCoinAmount,
        description: `BetaCoin Purchase - RM${paymentAmount.toFixed(2)} (${correctBetaCoinAmount} BetaCoins)`
      })
      .eq('id', transaction.id)
      .select()
      .single();

    if (updateTxError) {
      console.error('❌ Error updating transaction:', updateTxError);
      return;
    }

    console.log('✅ Transaction updated successfully:');
    console.log(`   - New amount: ${updatedTransaction.amount} BetaCoins`);
    console.log(`   - New description: ${updatedTransaction.description}`);

    // Step 8: Update wallet balance
    console.log('\n7️⃣ Updating wallet balance...');
    const newWalletBalance = wallet.betame_betacoins + difference;
    
    const { data: updatedWallet, error: updateWalletError } = await supabase
      .from('wallets')
      .update({
        betame_betacoins: newWalletBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userProfile.id)
      .select()
      .single();

    if (updateWalletError) {
      console.error('❌ Error updating wallet:', updateWalletError);
      return;
    }

    console.log('✅ Wallet updated successfully:');
    console.log(`   - Old balance: ${wallet.betame_betacoins} BetaCoins`);
    console.log(`   - New balance: ${updatedWallet.betame_betacoins} BetaCoins`);
    console.log(`   - Added: +${difference} BetaCoins`);

    // Step 9: Verify the fix
    console.log('\n8️⃣ Verifying the fix...');
    const { data: finalWallet, error: finalWalletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userProfile.id)
      .single();

    if (finalWalletError) {
      console.error('❌ Error fetching final wallet:', finalWalletError);
    } else {
      console.log('✅ Final wallet balance:');
      console.log(`   - BetaCoins: ${finalWallet.betame_betacoins}`);
      console.log(`   - Diamonds: ${finalWallet.betame_diamonds}`);
      console.log(`   - Cash: ${finalWallet.cash}`);
    }

    console.log('\n🎯 BetaCoin Amount Fix Summary:');
    console.log(`   - User: ${userProfile.email} (${userProfile.full_name})`);
    console.log(`   - Payment: RM${paymentAmount}`);
    console.log(`   - Old BetaCoin amount: ${currentAmount}`);
    console.log(`   - New BetaCoin amount: ${correctBetaCoinAmount}`);
    console.log(`   - BetaCoins added: +${difference}`);
    console.log(`   - Final wallet balance: ${finalWallet?.betame_betacoins || 'Unknown'}`);

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the script
fixBetaCoinAmount()
  .then(() => {
    console.log('\n✅ BetaCoin amount fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
