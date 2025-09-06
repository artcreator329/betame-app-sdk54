// RevenueCat Configuration
// Replace these placeholder values with your actual RevenueCat API keys

export const REVENUECAT_CONFIG = {
  // iOS API Key from RevenueCat Dashboard
  // Get this from: https://app.revenuecat.com/#/api-keys
  IOS_API_KEY: '<REDACTED_REVENUECAT_KEY>',
  
  // Note: Android uses Curlec payment system, not RevenueCat
  // This service is iOS-only for in-app purchases
  
  // App Store Product IDs (must match your App Store Connect configuration)
  PRODUCT_IDS: {
    BETACOINS_NEW_20: 'betacoins_new_20',
    BETACOINS_NEW_100: 'betacoins_new_100',
  },
  
  // BetaCoin amounts for each product
  BETACOIN_AMOUNTS: {
    'betacoins_new_20': 20,
    'betacoins_new_100': 100,
  },
  
  // Pricing in Malaysian Ringgit (MYR) - Updated for iOS App Store IAP
  PRICING: {
    'betacoins_new_20': 4.90,
    'betacoins_new_100': 19.90,
  },
};

// Helper function to get API key for current platform
export function getRevenueCatApiKey(): string {
  const { Platform } = require('react-native');
  
  // RevenueCat is iOS-only for BetaCoin purchases
  // Android uses Curlec payment system
  if (Platform.OS === 'ios') {
    return REVENUECAT_CONFIG.IOS_API_KEY;
  }
  
  // Return empty string for non-iOS platforms
  // This will cause the service to return false on initialize
  return '';
}
