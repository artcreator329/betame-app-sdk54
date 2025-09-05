/**
 * Test BetaCoin Purchase System
 * 
 * This script helps debug IAP issues by testing different components
 */

import { supabase } from '../lib/supabase';

async function testBetaCoinPurchaseSystem() {
  console.log('🧪 Testing BetaCoin Purchase System...\n');

  try {
    // Test 1: Check if user exists and has wallet
    console.log('📋 Test 1: User and Wallet Check');
    const testUserId = '20936ff2-2654-4dd5-9b36-1b69df15d6e0';
    
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', testUserId)
      .single();

    if (userError) {
      console.log('❌ User not found:', userError.message);
      return;
    }

    console.log('✅ User found:', user.email);

    // Check wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    if (walletError) {
      console.log('❌ Wallet not found:', walletError.message);
    } else {
      console.log('✅ Wallet found with', wallet.betacoins, 'BetaCoins');
    }

    // Test 2: Check BetaCoin transaction history
    console.log('\n📋 Test 2: Transaction History Check');
    const { data: transactions, error: transError } = await supabase
      .from('betacoin_transactions')
      .select('*')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (transError) {
      console.log('❌ Error fetching transactions:', transError.message);
    } else {
      console.log('✅ Found', transactions.length, 'recent transactions');
      transactions.forEach(tx => {
        console.log(`   - ${tx.transaction_type}: ${tx.amount} BetaCoins (${tx.created_at})`);
      });
    }

    // Test 3: Simulate BetaCoin addition (for testing)
    console.log('\n📋 Test 3: Simulate BetaCoin Addition');
    const testAmount = 20;
    
    const { data: addResult, error: addError } = await supabase.rpc(
      'add_betacoins_to_wallet',
      {
        p_user_id: testUserId,
        p_amount: testAmount,
        p_transaction_type: 'test_purchase',
        p_description: 'Test BetaCoin purchase simulation',
        p_metadata: {
          test: true,
          product_id: 'betacoins_20',
          amount: testAmount
        }
      }
    );

    if (addError) {
      console.log('❌ Error adding BetaCoins:', addError.message);
    } else {
      console.log('✅ Successfully added', testAmount, 'BetaCoins');
      console.log('   New balance:', addResult);
    }

    // Test 4: Check updated wallet
    console.log('\n📋 Test 4: Verify Updated Wallet');
    const { data: updatedWallet, error: updateError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    if (updateError) {
      console.log('❌ Error fetching updated wallet:', updateError.message);
    } else {
      console.log('✅ Updated wallet balance:', updatedWallet.betacoins, 'BetaCoins');
    }

    // Test 5: Check IAP configuration
    console.log('\n📋 Test 5: IAP Configuration Check');
    
    // Check if RevenueCat config exists
    try {
      const { getRevenueCatApiKey } = require('../config/revenuecat');
      const apiKey: <REDACTED>();
      
      if (apiKey) {
        console.log('✅ RevenueCat API key configured');
        console.log('   Key starts with:', apiKey.substring(0, 10) + '...');
      } else {
        console.log('❌ RevenueCat API key not configured');
      }
    } catch (error) {
      console.log('❌ Error checking RevenueCat config:', error.message);
    }

    console.log('\n🎉 BetaCoin Purchase System Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testBetaCoinPurchaseSystem();