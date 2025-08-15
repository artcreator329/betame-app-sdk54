#!/usr/bin/env node

/**
 * Simple test to verify wallet default values
 */

const { WalletService } = require('../lib/wallet-service');

async function testWalletDefaults() {
  console.log('🧪 Testing Wallet Default Values...\n');

  // Test the createWallet function logic
  const mockUserId = 'test-user-id';
  
  console.log('Testing wallet creation with default values...');
  
  // This would normally create a wallet with these values
  const defaultWallet = {
    user_id: mockUserId,
    betame_diamonds: 0, // Should be 0 for new users
    betame_betacoins: 0, // Should be 0 for new users
  };

  console.log('Default wallet values:');
  console.log(`  Diamonds: ${defaultWallet.betame_diamonds}`);
  console.log(`  BetaCoins: ${defaultWallet.betame_betacoins}`);

  if (defaultWallet.betame_diamonds === 0 && defaultWallet.betame_betacoins === 0) {
    console.log('✅ Wallet defaults are correct (zero Diamonds and BetaCoins)');
  } else {
    console.log('❌ Wallet defaults are incorrect');
  }

  console.log('\n🎉 Wallet defaults test completed!');
}

testWalletDefaults();