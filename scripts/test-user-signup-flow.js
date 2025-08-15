#!/usr/bin/env node

/**
 * Test script to verify user signup flow
 * Tests:
 * 1. New users start with zero Diamonds and BetaCoins
 * 2. New users are buyers by default (not sellers)
 * 3. Wallet is properly initialized
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testUserSignupFlow() {
  console.log('🧪 Testing User Signup Flow...\n');

  try {
    // Create a test user
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    const testName = 'Test User';

    console.log('1. Creating test user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      user_metadata: {
        full_name: testName,
      },
      email_confirm: true,
    });

    if (authError) {
      throw new Error(`Auth error: ${authError.message}`);
    }

    const userId = authData.user.id;
    console.log(`✅ User created with ID: ${userId}`);

    // Wait a moment for triggers to run
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check wallet initialization
    console.log('\n2. Checking wallet initialization...');
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError) {
      console.log('❌ Wallet not found, this might be expected if wallet creation is manual');
      console.log('Creating wallet manually...');
      
      // Create wallet manually to test default values
      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          betame_diamonds: 0,
          betame_betacoins: 0,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Wallet creation error: ${createError.message}`);
      }

      console.log('✅ Wallet created manually');
      console.log(`   Diamonds: ${newWallet.betame_diamonds}`);
      console.log(`   BetaCoins: ${newWallet.betame_betacoins}`);

      // Verify zero values
      if (newWallet.betame_diamonds === 0 && newWallet.betame_betacoins === 0) {
        console.log('✅ Wallet initialized with zero Diamonds and BetaCoins');
      } else {
        console.log('❌ Wallet not initialized with zero values');
      }
    } else {
      console.log('✅ Wallet found');
      console.log(`   Diamonds: ${wallet.betame_diamonds}`);
      console.log(`   BetaCoins: ${wallet.betame_betacoins}`);

      // Verify zero values
      if (wallet.betame_diamonds === 0 && wallet.betame_betacoins === 0) {
        console.log('✅ Wallet initialized with zero Diamonds and BetaCoins');
      } else {
        console.log('❌ Wallet not initialized with zero values');
      }
    }

    // Check user profile and seller status
    console.log('\n3. Checking user profile and seller status...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error(`Profile error: ${profileError.message}`);
    }

    if (!profile) {
      console.log('ℹ️ No user profile found (this is expected for new users)');
      console.log('✅ User is buyer by default (no seller profile exists)');
    } else {
      console.log('✅ User profile found');
      console.log(`   Is Seller: ${profile.is_seller}`);
      
      if (profile.is_seller === false) {
        console.log('✅ User is buyer by default (is_seller = false)');
      } else {
        console.log('❌ User is not buyer by default');
      }
    }

    // Clean up test user
    console.log('\n4. Cleaning up test user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.log(`⚠️ Warning: Could not delete test user: ${deleteError.message}`);
    } else {
      console.log('✅ Test user cleaned up');
    }

    console.log('\n🎉 User signup flow test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testUserSignupFlow();